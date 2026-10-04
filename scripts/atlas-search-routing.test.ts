import assert from 'node:assert/strict'
import test from 'node:test'
import type { IntelligenceData, ProductVersion } from '../src/types/intelligence'
import { versionForGraphEntities, versionForGraphEntity, versionsForGraphEntity } from '../src/data/atlas-navigation'

const provenance = { sourceRefs: [], reviewStatus: 'draft' as const }
function version(id: string, familyId: string, graphEntityId?: string): ProductVersion {
  return { id, familyId, name: id, kind: 'device', clinicalRole: 'treats', summary: 'Fixture.', ...provenance, ...(graphEntityId ? { graphEntityId } : {}) }
}
function data(): IntelligenceData {
  return {
    families: [
      { id: 'family-multi', name: 'Multi', manufacturer: 'Maker', entityIds: ['dev-old', 'dev-current'], conditionIds: [], description: 'Fixture.' },
      { id: 'family-single', name: 'Single', manufacturer: 'Maker', entityIds: ['dev-single'], conditionIds: [], description: 'Fixture.' },
    ],
    versions: [
      version('ver-old', 'family-multi', 'dev-old'),
      version('ver-current', 'family-multi', 'dev-current'),
      version('ver-single', 'family-single'),
    ],
  } as unknown as IntelligenceData
}

test('search opens the explicitly mapped generation within a multi-version family', () => {
  assert.equal(versionForGraphEntity(data(), 'dev-current')?.id, 'ver-current')
})

test('selected therapy profile links prefer its exact generation over other family members', () => {
  assert.deepEqual(versionsForGraphEntity(data(), 'dev-current').map(item => item.id), ['ver-current'])
})

test('shared nodes offer every applicable profile without silently choosing a generation', () => {
  const fixture = data()
  fixture.families[0].entityIds.push('dev-shared')
  assert.deepEqual(versionsForGraphEntity(fixture, 'dev-shared').map(item => item.id), ['ver-old', 'ver-current'])
  fixture.versions.push(version('ver-current-pro', 'family-multi', 'dev-current'))
  assert.deepEqual(versionsForGraphEntity(fixture, 'dev-current').map(item => item.id), ['ver-current', 'ver-current-pro'])
})

test('an unmapped shared family node stays on the graph instead of opening an arbitrary generation', () => {
  const fixture = data()
  fixture.families[0].entityIds.push('dev-shared')
  assert.equal(versionForGraphEntity(fixture, 'dev-shared'), undefined)
})

test('multiple exact generations mapped to one graph node stay on the graph', () => {
  const fixture = data()
  fixture.versions.push(version('ver-current-pro', 'family-multi', 'dev-current'))
  assert.equal(versionForGraphEntity(fixture, 'dev-current'), undefined)
})

test('legacy single-version families keep their direct profile route', () => {
  assert.equal(versionForGraphEntity(data(), 'dev-single')?.id, 'ver-single')
})

test('news relevant to one exact generation keeps that version context', () => {
  assert.equal(versionForGraphEntities(data(), ['dev-current'])?.id, 'ver-current')
})

test('news relevant to multiple exact generations leaves version context unset', () => {
  assert.equal(versionForGraphEntities(data(), ['dev-old', 'dev-current']), undefined)
})

test('news relevant to an ambiguous shared node leaves version context unset', () => {
  const fixture = data()
  fixture.versions.push(version('ver-current-pro', 'family-multi', 'dev-current'))
  assert.equal(versionForGraphEntities(fixture, ['dev-current']), undefined)
})

test('an ambiguous therapy node prevents a unique version from being inferred for news', () => {
  const fixture = data()
  fixture.families[0].entityIds.push('dev-ambiguous')
  fixture.versions.push(version('ver-ambiguous-one', 'family-multi', 'dev-ambiguous'))
  fixture.versions.push(version('ver-ambiguous-two', 'family-multi', 'dev-ambiguous'))
  assert.equal(versionForGraphEntities(fixture, ['dev-ambiguous', 'dev-current', 'cond-af', 'co-maker']), undefined)
})
