import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import yaml from 'js-yaml'
import { comparisonExportRows, projectComparison } from '../src/data/comparison'
import { scopeToCondition } from '../src/data/workspace-state'
import type { ComparativeDataset } from '../src/types/comparative'
import type { IntelligenceData } from '../src/types/intelligence'
import { fileURLToPath } from 'node:url'
import { defaultIntelligencePaths, loadIntelligenceSource } from './intelligence/catalog'

function pilot(): IntelligenceData {
  return loadIntelligenceSource(defaultIntelligencePaths(fileURLToPath(new URL('..', import.meta.url)))) as unknown as IntelligenceData
}

function pilotWithConfigurations(): IntelligenceData {
  return {
    ...pilot(),
    comparative: JSON.parse(readFileSync(new URL('../data/intelligence/comparative-pilot.yaml', import.meta.url), 'utf8')) as ComparativeDataset,
  }
}

test('aortic comparison aligns exact versions and keeps draft source provenance', () => {
  const data = scopeToCondition(pilot(), 'cond-as')
  const category = data.comparisonCategories?.find(item => item.id === 'aortic-tavr-valves')
  assert.ok(category)
  assert.ok(!category.versionIds.includes('ver-dasi-11'), 'planning software must not enter the valve category')

  const projection = projectComparison(data, category.id, ['ver-sapien-3', 'ver-evolut-fx'], '')
  const frame = projection.rows.find(row => row.attribute.id === 'frame-material')
  assert.ok(frame)
  assert.deepEqual(frame.cells.map(cell => cell.claims[0]?.value), ['MP35N cobalt-chromium', 'Nitinol'])
  assert.ok(frame.cells.every(cell => cell.status === 'reported' && cell.claims[0].reviewStatus === 'draft'))
  assert.ok(frame.cells.every(cell => cell.claims[0].sourceRefs[0].locator), 'every shown fact keeps a source locator')

  const expansion = projection.rows.find(row => row.attribute.id === 'expansion-mechanism')
  assert.deepEqual(expansion?.cells.map(cell => cell.claims[0]?.value), ['Balloon expandable', 'Self-expanding'])
  assert.ok(expansion?.cells.every(cell => cell.status === 'reported' && cell.claims[0].sourceRefs[0].locator))
  const delivery = projection.rows.find(row => row.attribute.id === 'delivery-profile')
  assert.deepEqual(delivery?.cells.map(cell => cell.status), ['requires_configuration', 'requires_configuration'])
})

test('later and successor facts do not leak into an earlier version', () => {
  const data = pilot()
  const beforeMarkers = projectComparison(data, 'aortic-tavr-valves', ['ver-evolut-fx', 'ver-evolut-fx-plus'], '2026-09-20')
  assert.equal(beforeMarkers.rows.find(row => row.attribute.id === 'deployment-feature')?.cells[0].status, 'not_curated')
  const coronary = beforeMarkers.rows.find(row => row.attribute.id === 'coronary-access-feature')
  assert.deepEqual(coronary?.cells.map(cell => cell.status), ['not_curated', 'reported'])

  const latest = projectComparison(data, 'aortic-tavr-valves', ['ver-evolut-fx'], '')
  assert.equal(latest.rows.find(row => row.attribute.id === 'deployment-feature')?.cells[0].status, 'reported')
})

test('ambiguous records and invalid column selections fail safely', () => {
  const data = pilot()
  const original = data.claims.find(claim => claim.id === 'claim-sapien-3-frame')
  assert.ok(original)
  data.claims.push({ ...original, id: 'claim-sapien-3-frame-second' })
  const projection = projectComparison(data, 'aortic-tavr-valves', ['ver-sapien-3'], '')
  const frame = projection.rows.find(row => row.attribute.id === 'frame-material')?.cells[0]
  assert.equal(frame?.status, 'multiple_records')
  assert.equal(frame.claims.length, 2)
  assert.throws(() => projectComparison(data, 'aortic-tavr-valves', ['ver-sapien-3', 'ver-sapien-3'], ''), /unique/)
  assert.throws(() => projectComparison(data, 'aortic-tavr-valves', ['ver-dasi-11'], ''), /not eligible/)
  assert.deepEqual(scopeToCondition(data, 'cond-af').comparisonCategories?.map(category => category.id), ['laao-occluders'])
})

test('comparison export preserves column order, status, and source boundaries', () => {
  const data = pilot()
  const projection = projectComparison(data, 'aortic-tavr-valves', ['ver-evolut-fx', 'ver-sapien-3'], '')
  const rows = projection.rows.filter(row => ['frame-material', 'delivery-profile'].includes(row.attribute.id))
  const exported = comparisonExportRows(data, projection, rows, '2026-09-22')
  assert.deepEqual(exported.map(row => [row.attributeId, row.versionId]), [
    ['frame-material', 'ver-evolut-fx'],
    ['frame-material', 'ver-sapien-3'],
    ['delivery-profile', 'ver-evolut-fx'],
    ['delivery-profile', 'ver-sapien-3'],
  ])
  assert.equal(exported[0].value, 'Nitinol')
  assert.equal(exported[0].reviewStatus, 'draft')
  assert.match(String(exported[0].sourceUrls), /accessdata\.fda\.gov/)
  assert.ok(exported[0].sourceLocators)
  assert.equal(exported[2].status, 'requires_configuration')
  assert.equal(exported[2].value, '')
  assert.equal(exported[2].configurationId, '')
  assert.equal(exported[2].asOf, '2026-09-22')
})

test('exact-size observations align without treating different sizing methods as directly comparable', () => {
  const data = pilotWithConfigurations()
  const projection = projectComparison(data, 'aortic-tavr-valves', ['ver-sapien-3', 'ver-evolut-fx'], '', ['sapien-3-23', 'evolut-fx-26'])
  const annulus = projection.rows.find(row => row.attribute.id === 'native-annulus-diameter-range')
  assert.ok(annulus)
  assert.deepEqual(annulus.cells.map(cell => cell.observations?.[0]?.value), ['18–22', '20–23'])
  assert.ok(annulus.cells.every(cell => cell.status === 'reported' && cell.observations?.[0]?.comparability !== 'direct'))
  assert.deepEqual(annulus.cells.map(cell => cell.observations?.[0]?.method.modality), ['TEE', 'other'])
  assert.ok(annulus.cells.every(cell => cell.observations?.[0]?.provenance.locator))

  const capsule = projection.rows.find(row => row.attribute.id === 'evolut-fx-delivery-capsule-outer-diameter')
  assert.deepEqual(capsule?.cells.map(cell => cell.status), ['not_curated', 'reported'])
  assert.equal(capsule.cells[1].observations?.[0]?.value, 18)
  assert.equal(capsule.cells[1].observations?.[0]?.unit, 'Fr')
  const exported = comparisonExportRows(data, projection, [annulus, capsule], '')
  assert.equal(exported[0].configurationId, 'sapien-3-23')
  assert.equal(exported[0].method, 'TEE')
  assert.equal(exported[1].configurationId, 'evolut-fx-26')
  assert.equal(exported[1].reviewStatus, 'unreviewed')
  assert.match(String(exported[1].sourceUrls), /P130021S174D/)
  assert.equal(exported[3].value, 18)
})

test('configuration selection and as-of boundaries prevent size and generation leakage', () => {
  const data = pilotWithConfigurations()
  const noSize = projectComparison(data, 'aortic-tavr-valves', ['ver-sapien-3', 'ver-evolut-fx'], '')
  assert.deepEqual(noSize.rows.find(row => row.attribute.id === 'native-annulus-diameter-range')?.cells.map(cell => cell.status), ['choose_configuration', 'choose_configuration'])

  const early = projectComparison(data, 'aortic-tavr-valves', ['ver-sapien-3', 'ver-evolut-fx'], '2026-09-21', ['sapien-3-20', 'evolut-fx-23'])
  assert.deepEqual(early.rows.find(row => row.attribute.id === 'native-annulus-diameter-range')?.cells.map(cell => cell.status), ['not_curated', 'not_curated'])
  const latest = projectComparison(data, 'aortic-tavr-valves', ['ver-sapien-3', 'ver-evolut-fx'], '', ['sapien-3-20', 'evolut-fx-23'])
  assert.equal(latest.rows.find(row => row.attribute.id === 'native-annulus-diameter-range')?.cells[1].observations?.[0]?.value, '18–20', 'failed-valve-only 17 mm exception must not enter native sizing')
  assert.throws(() => projectComparison(data, 'aortic-tavr-valves', ['ver-evolut-fx'], '', ['sapien-3-20']), /not eligible/)
  assert.throws(() => projectComparison(data, 'aortic-tavr-valves', ['ver-sapien-3'], '', ['sapien-3-20', 'sapien-3-23']), /one configuration per version/)
  assert.equal(scopeToCondition(data, 'cond-af').comparative?.device_configurations.length, 0)
})
