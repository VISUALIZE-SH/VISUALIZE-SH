import type { Core, ElementDefinition } from 'cytoscape'
import type { TimelineEntry } from '../types/entities'

export const TIMELINE_BASIS_LABELS: Record<TimelineEntry['dateBasis'], string> = {
  'fda-approval': 'FDA approval',
  'ce-mark': 'CE mark',
  'availability-announcement': 'Availability announcement',
  'trial-start': 'Trial start',
}

export function formatTimelineDate(timeline?: TimelineEntry): string | undefined {
  if (!timeline) return undefined
  if (timeline.precision === 'year') return timeline.date.slice(0, 4)
  if (timeline.precision === 'month') return timeline.date.slice(0, 7)
  return timeline.date
}

export function dateToUtcMs(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, (month || 1) - 1, day || 1)
}

export function timelineYear(date: string): number {
  return Number(date.slice(0, 4))
}

export const TIMELINE_AXIS_Y = 1240
const AXIS_START_ID = '__timeline_axis_start'
const AXIS_END_ID = '__timeline_axis_end'
const AXIS_EDGE_ID = '__timeline_axis_line'

function tickId(year: number): string {
  return `__timeline_axis_tick_${year}`
}

export interface TimelineFootprint {
  dateMs: number
  width: number
}

export function timelineX(dateMs: number, min: number, span: number, width: number): number {
  return ((dateMs - min) / span) * width
}

export function getTimelineWidth(
  visibleNodeCount: number,
  minYear: number,
  maxYear: number,
  footprints: TimelineFootprint[] = [],
): number {
  const baseWidth = Math.max(
    2200,
    visibleNodeCount * 30,
    (maxYear - minYear + 1) * 115,
  )
  const measuredWidth = footprints.reduce((sum, item) => sum + item.width, 0)
  // Stretch for the amount of content and label width, with a framing-friendly
  // cap. Exact final rectangle cleanup handles dates that are unusually close.
  return Math.min(
    10_000,
    Math.max(baseWidth * 1.5, visibleNodeCount * 70, (maxYear - minYear + 1) * 160, measuredWidth * 0.45),
  )
}

export function removeTimelineAxis(cy: Core): void {
  cy.elements('[?isTimelineAxis]').remove()
}

export function updateTimelineAxis(cy: Core): void {
  const timelineNodes = cy.nodes().filter((n) => {
    return (
      n.style('display') !== 'none' &&
      !n.data('isTimelineAxis') &&
      (Boolean(n.data('timelineDate')) || n.data('group') === 'condition')
    )
  })
  const nodes = timelineNodes.filter((n) => Boolean(n.data('timelineDate')))

  removeTimelineAxis(cy)
  if (nodes.length === 0) return

  const dates = nodes.map((n) => dateToUtcMs(n.data('timelineDate')))
  const layoutState = cy.scratch('_timelineLayoutState')
  const min = layoutState?.min ?? Math.min(...dates)
  const span = layoutState?.span ?? Math.max(1, Math.max(...dates) - min)
  const max = min + span
  const minYear = new Date(min).getUTCFullYear()
  const maxYear = new Date(max).getUTCFullYear()
  const midYear = Math.round((minYear + maxYear) / 2)
  const maxEntityY = timelineNodes.reduce((maxY, node) => Math.max(maxY, node.boundingBox({
    includeLabels: true,
    includeNodes: true,
    includeEdges: false,
    includeOverlays: false,
  }).y2), Number.NEGATIVE_INFINITY)
  const axisY = Number.isFinite(maxEntityY) ? maxEntityY + 110 : TIMELINE_AXIS_Y
  const footprints = nodes.map((n) => ({
    dateMs: dateToUtcMs(n.data('timelineDate')),
    width: n.boundingBox({ includeLabels: true, includeNodes: true, includeEdges: false, includeOverlays: false }).w,
  }))
  const width = layoutState?.width ?? getTimelineWidth(timelineNodes.length, minYear, maxYear, footprints)

  const tickYears = minYear < midYear && midYear < maxYear ? [midYear] : []
  const elements: ElementDefinition[] = [
    {
      group: 'nodes',
      data: {
        id: AXIS_START_ID,
        isTimelineAxis: true,
        label: String(minYear),
      },
      position: { x: 0, y: axisY },
      selectable: false,
      grabbable: false,
    },
    {
      group: 'nodes',
      data: {
        id: AXIS_END_ID,
        isTimelineAxis: true,
        label: maxYear === minYear ? '' : String(maxYear),
      },
      position: { x: width, y: axisY },
      selectable: false,
      grabbable: false,
    },
    {
      group: 'edges',
      data: {
        id: AXIS_EDGE_ID,
        source: AXIS_START_ID,
        target: AXIS_END_ID,
        isTimelineAxis: true,
      },
      selectable: false,
      grabbable: false,
    },
  ]

  for (const year of tickYears) {
    const id = tickId(year)
    const x = timelineX(Date.UTC(year, 0, 1), min, span, width)
    elements.push({
      group: 'nodes',
      data: { id, isTimelineAxis: true, label: String(year) },
      position: { x, y: axisY },
      selectable: false,
      grabbable: false,
    })
  }

  const added = cy.add(elements)
  added.nodes().lock().ungrabify()
}
