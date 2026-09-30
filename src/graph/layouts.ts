import type { Core } from 'cytoscape'
import { dateToUtcMs, getTimelineWidth, timelineX } from './timeline'

// The Atlas intentionally has two views: an exploratory condition-clustered
// landscape and a dated timeline.
export type LayoutName = 'fcose' | 'timeline'

export const LAYOUT_LABELS: Record<LayoutName, string> = {
  fcose: 'Clustered',
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
  width: number
  height: number
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
    const laneRightEdge: number[] = []
    // Leave room for the small deterministic per-node jitter on either side.
    const trackStep = Math.max(62, ...groupItems.map((item) => item.height)) + 48
    groupItems
      .sort((a, b) => {
        if (a.x !== b.x) return a.x - b.x
        if (a.ms !== b.ms) return a.ms - b.ms
        return a.label.localeCompare(b.label)
      })
      .forEach((item) => {
        let lane = 0
        while (
          laneRightEdge[lane] !== undefined &&
          item.x - item.width / 2 - laneRightEdge[lane] < TIMELINE_LABEL_GAP
        ) {
          lane += 1
        }
        laneRightEdge[lane] = item.x + item.width / 2
        offsets.set(item.id, spreadOffset(lane) * trackStep)
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
  const datedTimes = [...msById.values()]
  const datedMin = datedTimes.length ? Math.min(...datedTimes) : Date.UTC(2000, 0, 1)

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
      msById.set(n.id(), neighborDates.length ? median(neighborDates) : datedMin)
    })

  const dates = [...msById.values()]
  const min = dates.length ? Math.min(...dates) : Date.UTC(2000, 0, 1)
  const max = dates.length ? Math.max(...dates) : min
  const span = Math.max(1, max - min)
  const minYear = new Date(min).getUTCFullYear()
  const maxYear = new Date(max).getUTCFullYear()
  const measuredById = new Map<string, { width: number; height: number }>()
  const measuredItems = nodes.map((n: any) => {
    const box = n.boundingBox({ includeLabels: true, includeNodes: true, includeEdges: false, includeOverlays: false })
    const measured = { width: box.w, height: box.h }
    measuredById.set(n.id(), measured)
    return { dateMs: msById.get(n.id()) ?? min, ...measured }
  })
  const width = getTimelineWidth(nodes.length, minYear, maxYear, measuredItems)

  const timelineItems: TimelineItem[] = nodes
    .map((n: any) => {
      const ms = msById.get(n.id())
      if (ms === undefined) return null
      return {
        id: n.id(),
        group: String(n.data('group')),
        label: String(n.data('label')),
        ms,
        x: timelineX(ms, min, span, width),
        width: measuredById.get(n.id())?.width ?? 1,
        height: measuredById.get(n.id())?.height ?? 1,
      }
    })
    .filter(Boolean) as TimelineItem[]

  const offsetById = assignVerticalOffsets(timelineItems)

  const state = { key, min, span, width, msById, offsetById }
  cy.scratch('_timelineLayoutState', state)
  return state
}

function timelinePosition(n: any) {
  const group = String(n.data('group'))
  const state = getTimelineState(n.cy())
  const ms = state.msById.get(n.id())
  if (ms === undefined) {
    return { x: -320, y: TIMELINE_LANE_Y[group] ?? 1080 }
  }
  const x = timelineX(ms, state.min, state.span, state.width)
  const laneY = TIMELINE_LANE_Y[group] ?? 1080
  const offset = state.offsetById.get(n.id()) ?? 0
  const jitter = ((hashId(n.id()) % 19) - 9) * 2
  const spread = offset + jitter
  return { x, y: laneY + spread }
}

// Returns plain layout-options objects. Typed as `any` because the fcose
// extension options are not part of Cytoscape's core LayoutOptions type.
//
// animate:false makes the built-in fit accurate (animated layouts can fit
// against mid-flight positions and mis-frame the graph).
export function getLayout(name: LayoutName): any {
  const common = { animate: false, padding: 45, fit: true }
  switch (name) {
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
        // 'default' quality skips fcose's expensive spectral/Newton refinement,
        // which is overkill for a graph this size (~150 nodes) — the subsequent
        // clusterByCondition + declutter passes own the final arrangement anyway.
        quality: 'default',
        randomize: true,
        packComponents: true, // keep disconnected clusters from flying apart
        nodeSeparation: 80,
        idealEdgeLength: 68,
        nodeRepulsion: 4500,
        gravity: 0.4,
        gravityRange: 3.2,
        numIter: 1200,
        ...common,
      }
  }
}

const FRAME_PADDING = 45

/** Frame the freshly-laid-out graph in the viewport. */
export function frameLayout(cy: Core, name: LayoutName): void {
  cy.resize() // recompute against the current container size before framing
  const eles = cy.elements(':visible')
  if (eles.empty()) return
  const savedTimelineMinZoom = cy.scratch('_timelineBaseMinZoom') as number | null | undefined
  if (name === 'timeline') {
    const baseMinZoom = typeof savedTimelineMinZoom === 'number' ? savedTimelineMinZoom : cy.minZoom()
    cy.scratch('_timelineBaseMinZoom', baseMinZoom)
    // Let fit choose the scale needed for the full timeline, then make that
    // fitted scale the lower zoom bound. Users can still zoom in normally.
    cy.minZoom(0.005)
  } else if (typeof savedTimelineMinZoom === 'number') {
    cy.minZoom(savedTimelineMinZoom)
    cy.scratch('_timelineBaseMinZoom', null)
  }
  cy.fit(eles, FRAME_PADDING)
  // The clustered overview is intentionally a little closer than a strict
  // edge-to-edge fit so labels remain useful on first load. Timeline keeps its
  // complete time span framed.
  if (name === 'fcose') {
    cy.zoom(Math.min(cy.maxZoom(), cy.zoom() * 1.1))
    cy.center(eles)
  } else {
    const baseMinZoom = cy.scratch('_timelineBaseMinZoom') as number
    cy.minZoom(Math.min(baseMinZoom, cy.zoom()))
  }
}
