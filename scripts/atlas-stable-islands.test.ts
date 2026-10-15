import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { computeStableIslands, directConditionTargets, directTargetIds } from '../src/graph/stableIslands'
import type { GraphData, GraphEdgeData, GraphNodeData, NodeGroup } from '../src/types/entities'

function node(id: string, group: NodeGroup, category?: string): GraphNodeData {
  return { id, group, label: id, category, degree: 0, isDraft: true, pulse: 0, entity: { id } } as GraphNodeData
}
function edge(source: string, target: string, relationship: GraphEdgeData['relationship']): GraphEdgeData {
  return { id: `${source}:${relationship}:${target}`, source, target, relationship }
}
const nodes = [
  node('cond-a', 'condition', 'Aortic valve disease'), node('cond-b', 'condition', 'Mitral valve disease'),
  node('device-a', 'device'), node('device-b', 'device'), node('device-shared', 'device'),
  node('procedure-b', 'procedure'), node('company-a', 'company'), node('company-incubator', 'company'),
  node('trial-a', 'trial'), node('orphan', 'company'), node('device-context-only', 'device'),
]
const edges = [
  edge('device-a', 'cond-a', 'treats'), edge('device-b', 'cond-b', 'treats'),
  edge('device-shared', 'cond-a', 'treats'), edge('device-shared', 'cond-b', 'investigated_for'),
  edge('procedure-b', 'cond-b', 'treats'), edge('device-a', 'company-a', 'made_by'),
  edge('device-b', 'company-a', 'made_by'), edge('trial-a', 'cond-b', 'studies'),
  edge('trial-a', 'device-a', 'evaluates'), edge('device-a', 'procedure-b', 'used_in'),
  edge('device-context-only', 'procedure-b', 'used_in'), edge('company-incubator', 'company-a', 'portfolio_includes'),
]

test('direct targets exclude company, procedure, and trial paths and include explicit investigations', () => {
  assert.deepEqual(directTargetIds('device-a', edges, nodes), ['cond-a'])
  assert.deepEqual(directTargetIds('device-shared', edges, nodes), ['cond-a', 'cond-b'])
  assert.deepEqual(directTargetIds('device-context-only', edges, nodes), [])
  assert.deepEqual(directTargetIds('trial-a', edges, nodes), [])
  const corporateChanges = [edge('company-a', 'cond-b', 'treats'), edge('company-incubator', 'company-a', 'acquired')]
  assert.deepEqual(directConditionTargets(nodes, [...edges, ...corporateChanges]), directConditionTargets(nodes, edges))
  // Check actual node groups, rather than trusting a condition-looking ID.
  assert.deepEqual(directTargetIds('device-a', [...edges, edge('device-a', 'company-a', 'treats')], nodes), ['cond-a'])
})

test('shared therapy occupies the bridge between its direct conditions', () => {
  const positions = computeStableIslands(nodes, edges)
  const a = positions.get('cond-a')!, b = positions.get('cond-b')!, shared = positions.get('device-shared')!
  assert.ok(shared.x > Math.min(a.x, b.x) && shared.x < Math.max(a.x, b.x))
  assert.ok(Math.abs(shared.y - (a.y + b.y) / 2) < 100)
  const single = positions.get('device-a')!
  assert.ok(Math.hypot(single.x - a.x, single.y - a.y) < Math.hypot(single.x - b.x, single.y - b.y))
})

test('full graph coordinates are deterministic under reordering and inputs stay immutable', () => {
  const snapshot = JSON.stringify({ nodes, edges })
  const first = computeStableIslands(nodes, edges)
  assert.deepEqual(computeStableIslands([...nodes].reverse(), [...edges].reverse()), first)
  assert.deepEqual(computeStableIslands(nodes, edges), first)
  assert.equal(JSON.stringify({ nodes, edges }), snapshot)
  assert.equal(first.size, nodes.length)
})

test('label footprint changes relax satellites without moving condition anchors', () => {
  const first = computeStableIslands(nodes, edges)
  const footprints = new Map(nodes.map((n) => [n.id, { width: 350, height: 180 }]))
  const wider = computeStableIslands(nodes, edges, footprints)
  for (const n of nodes.filter((n) => n.group === 'condition')) assert.deepEqual(wider.get(n.id), first.get(n.id))
  assert.ok(nodes.some((n) => n.group !== 'condition' && JSON.stringify(wider.get(n.id)) !== JSON.stringify(first.get(n.id))))
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    if (nodes[i].group === 'condition' && nodes[j].group === 'condition') continue
    const a = wider.get(nodes[i].id)!, b = wider.get(nodes[j].id)!
    assert.ok(Math.abs(a.x - b.x) >= 350 - 0.5 || Math.abs(a.y - b.y) >= 180 - 0.5, `${nodes[i].id} overlaps ${nodes[j].id}`)
  }
})

test('companies/trials and context-only orphans all receive finite positions', () => {
  const data = JSON.parse(readFileSync(new URL('../public/graph.json', import.meta.url), 'utf8')) as GraphData
  const actualNodes = data.elements.nodes.map(({ data: n }) => n)
  const positions = computeStableIslands(actualNodes, data.elements.edges.map(({ data: e }) => e))
  assert.equal(positions.size, actualNodes.length)
  for (const n of actualNodes) {
    const p = positions.get(n.id)
    assert.ok(p && Number.isFinite(p.x) && Number.isFinite(p.y), n.id)
  }
  const noConditions = [node('co-alone', 'company'), node('trial-alone', 'trial')]
  const orphanPositions = computeStableIslands(noConditions, [])
  assert.equal(orphanPositions.size, 2)
  for (const p of orphanPositions.values()) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y))
  assert.deepEqual(computeStableIslands([], []), new Map())
})

test('corporate context cannot displace actual therapy islands or shared-target bridges', () => {
  const graph = JSON.parse(readFileSync(new URL('../public/graph.json', import.meta.url), 'utf8')) as GraphData
  const actualNodes = graph.elements.nodes.map(({ data }) => data)
  const actualEdges = graph.elements.edges.map(({ data }) => data)
  const corporate = new Set(['invested_in', 'acquired', 'option_to_acquire', 'portfolio_includes', 'terminated_acquisition'])
  const footprints = new Map(actualNodes.map(node => [node.id, { width: 240, height: 150 }]))
  const full = computeStableIslands(actualNodes, actualEdges, footprints)
  const withoutCorporate = computeStableIslands(actualNodes, actualEdges.filter(edge => !corporate.has(edge.relationship)), footprints)
  for (const node of actualNodes.filter(node => node.entity.type === 'therapy')) assert.deepEqual(full.get(node.id), withoutCorporate.get(node.id), node.id)
  const shared = full.get('dev-pascal')!, mr = full.get('cond-mr')!, tr = full.get('cond-tr')!
  const dx = tr.x - mr.x, dy = tr.y - mr.y
  const span = Math.hypot(dx, dy)
  const projection = ((shared.x - mr.x) * dx + (shared.y - mr.y) * dy) / (span * span)
  const perpendicular = Math.abs((shared.x - mr.x) * dy - (shared.y - mr.y) * dx) / span
  // Leave a label-sized corridor around the bridge: another fixed hub or a
  // shared therapy can occupy its exact midpoint in a multi-condition map.
  assert.ok(projection > 0.15 && projection < 0.85)
  assert.ok(perpendicular < span * 0.6, 'label crowding cannot expel PASCAL from the MR/TR bridge corridor')
})
