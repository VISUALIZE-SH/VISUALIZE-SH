import assert from 'node:assert/strict'
import test from 'node:test'
import cytoscape from 'cytoscape'
import { atlasLifecycleFlags } from '../src/data/lifecycle'
import type { Entity } from '../src/types/entities'
import { clusterByCondition } from '../src/graph/clusterByCondition'

function therapy(overrides: Record<string, unknown> = {}): Entity {
  return {
    id: 'dev-fixture', type: 'therapy', therapyType: 'device', name: 'Fixture',
    treats: ['cond-hf'], regulatoryStatus: 'approved', curation: { status: 'curated', lastUpdated: '2026-01-01' },
    ...overrides,
  } as Entity
}

test('Atlas lifecycle flags require a sourced lifecycle state and stay scoped to that entity', () => {
  const affectedKit = therapy({ lifecycleStatus: 'recalled', lifecycleDetail: 'Recall limited to specified accessory kits.' })
  const heartMatePump = therapy({ id: 'dev-heartmate-3', name: 'HeartMate 3 LVAD', regulatoryDetail: 'Specific accessories/lots have separate recalls; pump itself is not labeled recalled.' })
  const historicalUnverified = therapy({ id: 'dev-corcap', regulatoryStatus: 'discontinued' })
  const terminatedTrial = {
    id: 'trial-ended', type: 'trial', name: 'Terminated trial', status: 'terminated', conditions: [], therapies: [], resultStatus: 'negative', curation: { status: 'curated', lastUpdated: '2026-01-01' },
  } as unknown as Entity

  assert.deepEqual(atlasLifecycleFlags(affectedKit), { isHalted: false, isRetired: true })
  assert.deepEqual(atlasLifecycleFlags(heartMatePump), { isHalted: false, isRetired: false })
  assert.deepEqual(atlasLifecycleFlags(historicalUnverified), { isHalted: false, isRetired: false })
  assert.deepEqual(atlasLifecycleFlags(terminatedTrial), { isHalted: true, isRetired: false })
})

function mixedSatellitePositions(conditionCount = 2) {
  const groups = ['device', 'company', 'trial'] as const
  const nodes = [
    { data: { id: 'cond-hf', group: 'condition' }, position: { x: 0, y: 0 } },
    ...(conditionCount > 1 ? [{ data: { id: 'cond-other', group: 'condition' }, position: { x: 2400, y: 0 } }] : []),
    ...groups.flatMap((group) => Array.from({ length: 6 }, (_, i) => ({
      data: { id: `${group}-${i}`, group, degree: 1 },
      position: { x: (i * 13) - 20, y: (i * 17) + 10 },
    }))),
  ]
  const edges = groups.flatMap((group) => Array.from({ length: 6 }, (_, i) => ({
    data: { id: `edge-${group}-${i}`, source: `${group}-${i}`, target: 'cond-hf' },
  })))
  const cy = cytoscape({ headless: true, elements: [...nodes, ...edges], style: [{ selector: 'node', style: { width: 30, height: 30 } }] })
  clusterByCondition(cy, { conditionSpread: 1, iterations: 360, pullStrength: 1 })
  const result = new Map<string, { x: number; y: number }>()
  for (const group of groups) {
    for (let i = 0; i < 6; i++) result.set(`${group}-${i}`, cy.getElementById(`${group}-${i}`).position())
  }
  cy.destroy()
  return result
}

test('condition satellites are deterministically mixed across node categories', () => {
  const first = mixedSatellitePositions()
  const second = mixedSatellitePositions()
  assert.deepEqual([...first], [...second], 'same graph and seed should produce the same clustered coordinates')
  const oneCondition = mixedSatellitePositions(1)

  const sectorsByGroup = new Map<string, Set<number>>()
  for (const [id, p] of first) {
    const group = id.split('-')[0]
    const angle = (Math.atan2(p.y, p.x) + Math.PI * 2) % (Math.PI * 2)
    const sector = Math.floor(angle / (Math.PI / 2))
    const sectors = sectorsByGroup.get(group) ?? new Set<number>()
    sectors.add(sector)
    sectorsByGroup.set(group, sectors)
  }
  for (const [group, sectors] of sectorsByGroup) {
    assert.ok(sectors.size >= 3, `${group} satellites should occupy at least three angular sectors`)
  }
  assert.deepEqual([...oneCondition], [...first], 'a filtered graph with one visible condition still receives the same local mixing')
})
