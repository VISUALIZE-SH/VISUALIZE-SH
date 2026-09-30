import assert from 'node:assert/strict'
import test from 'node:test'
import cytoscape from 'cytoscape'
import { enforceFootprintSpacing } from '../src/graph/declutter'
import { frameLayout, getLayout } from '../src/graph/layouts'
import { dateToUtcMs, getTimelineWidth, timelineX, updateTimelineAxis } from '../src/graph/timeline'

const bboxOptions = { includeLabels: true, includeNodes: true, includeEdges: false, includeOverlays: false }

function coveredFractions(nodes: cytoscape.NodeCollection) {
  const boxes = nodes.map((node) => ({ id: node.id(), ...node.boundingBox(bboxOptions) }))
  return boxes.map((box) => {
    const clipped = boxes.filter((other) => other.id !== box.id &&
      Math.min(box.x2, other.x2) > Math.max(box.x1, other.x1) &&
      Math.min(box.y2, other.y2) > Math.max(box.y1, other.y1))
    const xs = [...new Set([box.x1, box.x2, ...clipped.flatMap((other) => [Math.max(box.x1, other.x1), Math.min(box.x2, other.x2)])])].sort((a, b) => a - b)
    let covered = 0
    for (let i = 1; i < xs.length; i++) {
      const left = xs[i - 1]
      const right = xs[i]
      if (right <= left) continue
      const intervals = clipped
        .filter((other) => other.x1 < right && other.x2 > left)
        .map((other) => [Math.max(box.y1, other.y1), Math.min(box.y2, other.y2)] as const)
        .sort((a, b) => a[0] - b[0])
      let unionHeight = 0
      let start = Number.NaN
      let end = Number.NaN
      for (const [y1, y2] of intervals) {
        if (Number.isNaN(start)) {
          start = y1
          end = y2
        } else if (y1 <= end) end = Math.max(end, y2)
        else {
          unionHeight += end - start
          start = y1
          end = y2
        }
      }
      if (!Number.isNaN(start)) unionHeight += end - start
      covered += (right - left) * unionHeight
    }
    return covered / (box.w * box.h)
  })
}

function makeCrowdedGraph() {
  const cy = cytoscape({
    headless: true,
    styleEnabled: true,
    elements: [
      { data: { id: 'wide', label: 'A very long asymmetric entity label' }, position: { x: 0, y: 0 } },
      { data: { id: 'small', label: 'Short' }, position: { x: 0, y: 0 } },
      { data: { id: 'tall', label: 'Tall footprint' }, position: { x: 0, y: 0 } },
      { data: { id: 'filtered', label: 'Filtered entity' }, position: { x: 0, y: 0 } },
    ],
    style: [
      { selector: 'node', style: { width: 52, height: 38, label: 'data(label)', 'font-size': 18, 'text-halign': 'right', 'text-valign': 'top', 'text-margin-x': 26, 'text-margin-y': -20 } },
      { selector: '#wide', style: { width: 260, height: 42 } },
      { selector: '#tall', style: { width: 64, height: 180, 'text-halign': 'left', 'text-valign': 'bottom' } },
      { selector: '#filtered', style: { display: 'none' } },
    ],
  })
  return cy
}

test('cluster footprint spacing keeps aggregate label-inclusive box coverage below 20%', () => {
  const cy = makeCrowdedGraph()
  const filteredBefore = cy.getElementById('filtered').position()
  enforceFootprintSpacing(cy)
  const visible = cy.nodes(':visible')
  assert.ok(Math.max(...coveredFractions(visible)) <= 0.2)
  assert.deepEqual(cy.getElementById('filtered').position(), filteredBefore, 'filtered nodes are not moved')
  cy.destroy()
})

test('timeline width expands with label content and date positions remain proportional', () => {
  const dates = [Date.UTC(2020, 0, 1), Date.UTC(2021, 0, 1), Date.UTC(2024, 0, 1)]
  const narrow = getTimelineWidth(8, 2020, 2024, dates.map((dateMs) => ({ dateMs, width: 60 })))
  const wide = getTimelineWidth(8, 2020, 2024, Array.from({ length: 8 }, (_, i) => ({ dateMs: dates[i % dates.length], width: 2000 })))
  assert.ok(wide > narrow)
  const x1 = timelineX(dates[0], dates[0], dates[2] - dates[0], wide)
  const x2 = timelineX(dates[1], dates[0], dates[2] - dates[0], wide)
  const x3 = timelineX(dates[2], dates[0], dates[2] - dates[0], wide)
  assert.ok(Math.abs((x2 - x1) / (x3 - x1) - (dates[1] - dates[0]) / (dates[2] - dates[0])) < 1e-12)
  assert.equal(dateToUtcMs('2024-02-01'), dates[2] + 31 * 24 * 60 * 60 * 1000)
})

test('co-dated timeline entities use height-aware vertical tracks and filtered nodes are excluded', () => {
  const cy = cytoscape({
    headless: true,
    styleEnabled: true,
    elements: [
      { data: { id: 'same-a', label: 'A long dated label', group: 'device', timelineDate: '2024-01-01' } },
      { data: { id: 'same-b', label: 'A second long dated label', group: 'device', timelineDate: '2024-01-01' } },
      { data: { id: 'same-c', label: 'Third item', group: 'device', timelineDate: '2024-01-01' } },
      { data: { id: 'later', label: 'Later event', group: 'device', timelineDate: '2025-01-01' } },
      { data: { id: 'hidden', label: 'Hidden event', group: 'device', timelineDate: '2024-01-01' } },
    ],
    style: [
      { selector: 'node', style: { width: 46, height: 38, label: 'data(label)', 'font-size': 18 } },
      { selector: '#same-b', style: { height: 130 } },
      { selector: '#hidden', style: { display: 'none' } },
    ],
  })
  const positions = getLayout('timeline').positions
  const placed = ['same-a', 'same-b', 'same-c', 'later'].map((id) => {
    const node = cy.getElementById(id)
    return { id, ...positions(node), box: node.boundingBox(bboxOptions) }
  })
  assert.equal(placed[0].x, placed[1].x)
  assert.equal(placed[1].x, placed[2].x)
  assert.notEqual(placed[0].y, placed[1].y)
  assert.notEqual(placed[1].y, placed[2].y)
  assert.ok(Math.abs(placed[0].x - placed[3].x) > 0)

  const originalX = new Map(placed.map(({ id, x }) => [id, x]))
  cy.batch(() => placed.forEach(({ id, x, y }) => cy.getElementById(id).position({ x, y })))
  enforceFootprintSpacing(cy, { verticalOnly: true, excludeTimelineAxis: true })
  assert.ok(Math.max(...coveredFractions(cy.nodes(':visible'))) <= 0.2)
  for (const [id, x] of originalX) assert.equal(cy.getElementById(id).position('x'), x, 'vertical cleanup preserves date x')

  const maxEntityY = Math.max(...cy.nodes(':visible').map((node) => node.boundingBox(bboxOptions).y2))
  updateTimelineAxis(cy)
  const axis = cy.nodes().filter((node) => Boolean(node.data('isTimelineAxis')))
  assert.ok(Math.min(...axis.map((node) => node.boundingBox(bboxOptions).y1)) > maxEntityY, 'timeline axis sits below every visible entity box')
  assert.equal(cy.getElementById('hidden').style('display'), 'none')
  cy.destroy()
})

test('timeline framing lowers the zoom floor enough to fit a small viewport, then restores it for clustered view', () => {
  let minZoom = 0.12
  let zoom = 0.12
  const scratch = new Map<string, unknown>()
  const eles = { empty: () => false }
  const fake = {
    resize() {},
    elements: () => eles,
    minZoom(value?: number) { if (value !== undefined) minZoom = value; return minZoom },
    zoom(value?: number) { if (value !== undefined) zoom = value; return zoom },
    maxZoom: () => 3,
    fit() { zoom = Math.max(minZoom, 0.06) },
    center() {},
    scratch(key: string, value?: unknown) { if (value !== undefined) scratch.set(key, value); return scratch.get(key) },
  } as unknown as cytoscape.Core

  frameLayout(fake, 'timeline')
  assert.equal(zoom, 0.06, 'fit can go below the usual floor on a narrow viewport')
  assert.equal(minZoom, 0.06, 'the fitted timeline remains reachable while zooming out')
  frameLayout(fake, 'fcose')
  assert.equal(minZoom, 0.12, 'clustered view restores the normal minimum zoom')
  frameLayout(fake, 'fcose')
  assert.equal(minZoom, 0.12, 'repeated clustered framing keeps the normal minimum zoom')
})
