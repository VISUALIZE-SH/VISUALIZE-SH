import { dateToUtcMs, getTimelineWidth } from './timeline'

// Layout presets. fcose = force-directed clustering (default), dagre = layered
// hierarchy (condition -> therapy -> trial reads left to right), concentric =
// rings by connectedness, timeline = dated therapies/trials by event date.
export type LayoutName = 'fcose' | 'dagre' | 'concentric' | 'timeline'

export const LAYOUT_LABELS: Record<LayoutName, string> = {
  fcose: 'Clustered',
  dagre: 'Hierarchy',
  concentric: 'Concentric',
  timeline: 'Timeline',
}

const TIMELINE_LANE_Y: Record<string, number> = {
  condition: -460,
  device: 60,
  pharmaceutical: 360,
  digital: 620,
  procedure: 620,
  trial: 890,
}

const TIMELINE_LABEL_GAP = 220

interface TimelineItem {
  id: string
  group: string
  label: string
  ms: number
  x: number
}

function hashId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = Math.imul(31, hash) + id.charCodeAt(i)
  }
  return hash >>> 0
}

function spreadOffset(index: number): number {
  if (index === 0) return 0
  const magnitude = Math.ceil(index / 2)
  return (index % 2 === 0 ? 1 : -1) * magnitude
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}

function assignVerticalOffsets(items: TimelineItem[]): Map<string, number> {
  const offsets = new Map<string, number>()
  const byGroup = new Map<string, TimelineItem[]>()
  for (const item of items) {
    byGroup.set(item.group, [...(byGroup.get(item.group) ?? []), item])
  }

  for (const groupItems of byGroup.values()) {
    const laneLastX: number[] = []
    groupItems
      .sort((a, b) => {
        if (a.x !== b.x) return a.x - b.x
        if (a.ms !== b.ms) return a.ms - b.ms
        return a.label.localeCompare(b.label)
      })
      .forEach((item) => {
        const minGap =
          item.group === 'condition' ? TIMELINE_LABEL_GAP * 1.15 : TIMELINE_LABEL_GAP
        let lane = 0
        while (
          laneLastX[lane] !== undefined &&
          item.x - laneLastX[lane] < minGap
        ) {
          lane += 1
        }
        laneLastX[lane] = item.x
        offsets.set(item.id, lane)
      })
  }

  return offsets
}

function getTimelineState(cy: any) {
  const nodes = cy.nodes(':visible').filter((n: any) => {
    return (
      !n.data('isTimelineAxis') &&
      (n.data('timelineDate') || n.data('group') === 'condition')
    )
  })
  const datedNodes = nodes.filter((n: any) => n.data('timelineDate'))
  const key = nodes
    .map(
      (n: any) =>
        `${n.id()}:${n.data('timelineDate') ?? n.data('group') ?? 'undated'}`,
    )
    .sort()
    .join('|')
  const cached = cy.scratch('_timelineLayoutState')
  if (cached?.key === key) return cached

  const msById = new Map<string, number>()
  datedNodes.forEach((n: any) => {
    msById.set(n.id(), dateToUtcMs(n.data('timelineDate')))
  })

  const dates = [...msById.values()]
  const min = dates.length ? Math.min(...dates) : Date.UTC(2000, 0, 1)
  const max = dates.length ? Math.max(...dates) : min
  const span = Math.max(1, max - min)
  const minYear = new Date(min).getUTCFullYear()
  const maxYear = new Date(max).getUTCFullYear()
  const width = getTimelineWidth(nodes.length, minYear, maxYear)

  nodes
    .filter((n: any) => n.data('group') === 'condition')
    .forEach((n: any) => {
      const neighborDates: number[] = []
      const seenNeighbors = new Set<string>()
      n.connectedEdges().forEach((edge: any) => {
        const source = edge.source()
        const target = edge.target()
        const neighbor = source.id() === n.id() ? target : source
        const neighborId = neighbor.id()
        if (seenNeighbors.has(neighborId)) return
        seenNeighbors.add(neighborId)
        const ms = msById.get(neighborId)
        if (ms !== undefined) neighborDates.push(ms)
      })
      msById.set(n.id(), neighborDates.length ? median(neighborDates) : min)
    })

  const timelineItems: TimelineItem[] = nodes
    .map((n: any) => {
      const ms = msById.get(n.id())
      if (ms === undefined) return null
      return {
        id: n.id(),
        group: String(n.data('group')),
        label: String(n.data('label')),
        ms,
        x: ((ms - min) / span) * width,
      }
    })
    .filter(Boolean) as TimelineItem[]

  const offsetById = assignVerticalOffsets(timelineItems)

  const state = { key, min, span, width, msById, offsetById }
  cy.scratch('_timelineLayoutState', state)
  return state
}

function timelineSpreadStep(group: string): number {
  if (group === 'condition') return 58
  if (group === 'trial') return 66
  return 62
}

function timelinePosition(n: any) {
  const group = String(n.data('group'))
  const state = getTimelineState(n.cy())
  const ms = state.msById.get(n.id())
  if (ms === undefined) {
    return { x: -320, y: TIMELINE_LANE_Y[group] ?? 1080 }
  }
  const x = ((ms - state.min) / state.span) * state.width
  const laneY = TIMELINE_LANE_Y[group] ?? 1080
  const offset = state.offsetById.get(n.id()) ?? 0
  const jitter = ((hashId(n.id()) % 19) - 9) * 2
  const spread = spreadOffset(offset) * timelineSpreadStep(group) + jitter
  return { x, y: laneY + spread }
}

// Returns plain layout-options objects. Typed as `any` because the extension
// options (fcose/dagre) are not part of Cytoscape's core LayoutOptions type.
//
// animate:false makes the built-in fit accurate (animated layouts can fit
// against mid-flight positions and mis-frame the graph).
export function getLayout(name: LayoutName): any {
  const common = { animate: false, padding: 45, fit: true }
  switch (name) {
    case 'dagre':
      return { name: 'dagre', rankDir: 'LR', nodeSep: 22, rankSep: 80, ...common }
    case 'concentric':
      return {
        name: 'concentric',
        concentric: (n: any) => n.degree(),
        levelWidth: () => 2,
        minNodeSpacing: 24,
        ...common,
      }
    case 'timeline':
      return {
        name: 'preset',
        animate: false,
        fit: true,
        padding: 70,
        positions: timelinePosition,
      }
    case 'fcose':
    default:
      return {
        name: 'fcose',
        quality: 'proof',
        randomize: true,
        packComponents: true, // keep disconnected clusters from flying apart
        nodeSeparation: 80,
        idealEdgeLength: 68,
        nodeRepulsion: 4500,
        gravity: 0.4,
        gravityRange: 3.2,
        numIter: 2500,
        ...common,
      }
  }
}
