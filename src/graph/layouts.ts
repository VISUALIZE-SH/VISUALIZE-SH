import type { Core } from 'cytoscape'
import { dateToUtcMs, getTimelineWidth, timelineX } from './timeline'

// Atlas offers stable semantic islands and a dated timeline.
export type LayoutName = 'islands' | 'timeline'

export const LAYOUT_LABELS: Record<LayoutName, string> = {
  islands: 'Islands',
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

// animate:false makes the built-in fit accurate (animated layouts can fit
// against mid-flight positions and mis-frame the graph).
export function getLayout(name: LayoutName): any {
  switch (name) {
    case 'islands':
      return {
        name: 'preset', animate: false, fit: false,
        positions: (node: any) => node.cy().scratch('_stableIslandPositions')?.get(node.id()) ?? node.position(),
      }
    case 'timeline':
      return {
        name: 'preset',
        animate: false,
        fit: true,
        padding: 70,
        positions: timelinePosition,
      }
  }
}

const FRAME_PADDING = 45

/** Frame the graph; automatic island framing favors readable labels over a full overview. */
export function frameLayout(cy: Core, name: LayoutName, options: { readable?: boolean } = {}): void {
  cy.resize() // recompute against the current container size before framing
  const eles = cy.elements(':visible')
  if (eles.empty()) return
  const savedTimelineMinZoom = cy.scratch('_timelineBaseMinZoom') as number | null | undefined
  const baseMinZoom = typeof savedTimelineMinZoom === 'number' ? savedTimelineMinZoom : cy.minZoom()
  cy.scratch('_timelineBaseMinZoom', baseMinZoom)
  // Let fit choose the full overview scale, keeping it reachable on zoom-out.
  cy.minZoom(0.005)
  cy.fit(eles, FRAME_PADDING)
  cy.minZoom(Math.min(baseMinZoom, cy.zoom()))
  if (name === 'islands' && options.readable) {
    // Open at 75% of the original 0.7 scale, retaining room to zoom out or Fit.
    cy.zoom(Math.min(cy.maxZoom(), Math.max(cy.zoom(), 0.525)))
    cy.center(eles)
  }
}
