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

function axisX(dateMs: number, min: number, span: number, width: number): number {
  return ((dateMs - min) / span) * width
}

export function getTimelineWidth(
  visibleNodeCount: number,
  minYear: number,
  maxYear: number,
): number {
  return Math.max(
    2200,
    visibleNodeCount * 30,
    (maxYear - minYear + 1) * 115,
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
  const min = Math.min(...dates)
  const max = Math.max(...dates)
  const span = Math.max(1, max - min)
  const minYear = new Date(min).getUTCFullYear()
  const maxYear = new Date(max).getUTCFullYear()
  const midYear = Math.round((minYear + maxYear) / 2)
  const width = getTimelineWidth(timelineNodes.length, minYear, maxYear)

  const tickYears = [...new Set([minYear, midYear, maxYear])]
  const elements: ElementDefinition[] = [
    {
      group: 'nodes',
      data: {
        id: AXIS_START_ID,
        isTimelineAxis: true,
        label: String(minYear),
      },
      position: { x: 0, y: TIMELINE_AXIS_Y },
      selectable: false,
      grabbable: false,
    },
    {
      group: 'nodes',
      data: {
        id: AXIS_END_ID,
        isTimelineAxis: true,
        label: String(maxYear),
      },
      position: { x: width, y: TIMELINE_AXIS_Y },
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
    if (id === AXIS_START_ID || id === AXIS_END_ID) continue
    const x = axisX(Date.UTC(year, 0, 1), min, span, width)
    elements.push({
      group: 'nodes',
      data: { id, isTimelineAxis: true, label: String(year) },
      position: { x, y: TIMELINE_AXIS_Y },
      selectable: false,
      grabbable: false,
    })
  }

  const added = cy.add(elements)
  added.nodes().lock().ungrabify()
}
