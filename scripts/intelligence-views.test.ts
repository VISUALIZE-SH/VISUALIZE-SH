import assert from 'node:assert/strict'
import test from 'node:test'
import { availabilityLabel, displayValue, eventVersionAssociation, isOnOrBefore, lineageRelationshipLabel, lineageVisibleAsOf, outcomeRows, rowsToCsv, sourceProvenance, sourceUrls } from '../src/data/intelligence'
import type { IntelligenceData } from '../src/types/intelligence'

function fixture(): IntelligenceData {
  return {
    schemaVersion: 1,
    updatedAt: '2026-09-21',
    coverage: { title: 'Test', description: 'Test' },
    sources: [
      { id: 'source-old', title: 'Old source', url: 'https://example.test/old', kind: 'publication', publisher: 'Publisher A', publishedAt: { value: '2026-05-01', precision: 'day' }, retrievedAt: '2026-06-01', access: 'public' },
      { id: 'source-new', title: 'New source', url: 'https://example.test/new', kind: 'publication', publisher: 'Publisher B', publishedAt: { value: '2026-08-01', precision: 'day' }, retrievedAt: '2026-08-02', access: 'public' },
    ],
    families: [{ id: 'family-a', name: 'Family A', manufacturer: 'Maker', entityIds: [], conditionIds: [], description: 'Test' }],
    versions: [{ id: 'version-a', familyId: 'family-a', name: 'Version A', kind: 'digital', clinicalRole: 'plans', summary: 'Test', sourceRefs: [], reviewStatus: 'draft' }],
    claims: [], decisions: [], indications: [], trialSnapshots: [],
    lineage: [
      { id: 'edge-dated', fromVersionId: 'version-a', toVersionId: 'version-a', relationship: 'derived_from', explanation: 'Dated', sourceRefs: [{ sourceId: 'source-old', locator: 'Section 1' }], reviewStatus: 'draft' },
      { id: 'edge-undated', fromVersionId: 'version-a', toVersionId: 'version-a', relationship: 'derived_from', explanation: 'Undated', sourceRefs: [], reviewStatus: 'draft' },
    ],
    events: [{ id: 'event-family', title: 'Family event', eventDate: { value: '2026-07-01', precision: 'day' }, publishedAt: { value: '2026-07-02', precision: 'day' }, discoveredAt: '2026-07-03', kind: 'evidence', versionIds: [], decisionIds: [], readoutIds: ['readout-a'], before: 'Earlier', after: 'New', whyItMatters: 'Test', uncertainty: 'Build unresolved', sourceRefs: [{ sourceId: 'source-old', locator: 'Results' }, { sourceId: 'source-new', locator: 'Appendix' }], reviewStatus: 'draft' }],
    trials: [{ id: 'trial-a', name: 'Trial A', familyIds: ['family-a'], design: 'Randomized', versionIds: [], versionMapping: 'unclear', population: 'Test', sourceRefs: [], reviewStatus: 'draft' }],
    cohorts: [{ id: 'cohort-a', trialId: 'trial-a', name: 'All participants', population: 'Test', enrollment: [{ value: 20, stage: 'randomized' }], arms: [] , sourceRefs: [], reviewStatus: 'draft' }],
    endpoints: [{ id: 'endpoint-a', name: 'Primary composite', definition: 'Test composite', hierarchy: 'primary', measureType: 'hierarchical', timeframe: 'One year', analysisPopulation: 'All participants', sourceRefs: [], reviewStatus: 'draft' }],
    readouts: [{ id: 'readout-a', trialId: 'trial-a', cohortId: 'cohort-a', title: 'Main readout', publishedAt: { value: '2026-06-01', precision: 'day' }, followUp: 'One year', maturity: 'primary', versionIds: [], sourceRefs: [], reviewStatus: 'draft' }],
    outcomes: [
      { id: 'outcome-a', readoutId: 'readout-a', endpointId: 'endpoint-a', arms: [], effect: { measure: 'Win ratio', value: 1.4, ci: { upper: 2.1, sidedness: 'one_sided' } }, pValue: 0.0001, pValueQualifier: '<', interpretation: 'Test only', sourceRefs: [], reviewStatus: 'draft' },
      { id: 'outcome-b', readoutId: 'readout-a', endpointId: 'endpoint-a', arms: [{ armId: 'a', value: 10, unit: '%' }, { armId: 'b', value: 20, unit: '%' }], interpretation: 'Two arms, one observation', sourceRefs: [], reviewStatus: 'draft' },
    ],
  }
}

test('family-level, effect-only outcomes remain a single bounded observation', () => {
  const rows = outcomeRows(fixture(), 'version-a', '2026-12-31')
  assert.equal(rows.length, 3)
  const effectOnly = rows.find((row) => row.outcomeId === 'outcome-a')!
  const twoArm = rows.filter((row) => row.outcomeId === 'outcome-b')
  assert.equal(effectOnly.value, undefined)
  assert.match(effectOnly.versionContext, /Exact generation\/software build unresolved/)
  assert.match(effectOnly.ci, /level not reported one-sided/)
  assert.equal(effectOnly.pValueQualifier, '<')
  assert.deepEqual(twoArm.map((row) => row.armValues), ['10 %', '20 %'])
})

test('as-of filtering and export preserve explicit missingness', () => {
  assert.equal(outcomeRows(fixture(), 'version-a', '2026-01-01').length, 0)
  assert.equal(availabilityLabel('not_yet_reviewed'), 'Not yet reviewed')
  assert.equal(displayValue(undefined, undefined, 'not_yet_reviewed'), 'Not yet reviewed')
  assert.equal(rowsToCsv([{ source: 'A, B', reviewStatus: 'draft' }]), 'source,reviewStatus\n"A, B",draft')
})

test('history helpers keep family association, complete provenance, and dated as-of boundaries', () => {
  const data = fixture()
  assert.equal(eventVersionAssociation(data, data.events[0], 'version-a'), 'family')
  assert.equal(lineageVisibleAsOf(data, data.lineage[0], '2026-06-01'), true)
  assert.equal(lineageVisibleAsOf(data, data.lineage[0], '2026-04-01'), false)
  assert.equal(lineageVisibleAsOf(data, data.lineage[1], '2026-12-31'), false)
  assert.deepEqual(sourceProvenance(data.events[0].sourceRefs), { sourceIds: 'source-old; source-new', locators: 'Results; Appendix' })
  assert.equal(sourceUrls(data, data.events[0].sourceRefs), 'https://example.test/old; https://example.test/new')
  assert.equal(lineageRelationshipLabel('succeeds'), 'succeeded by')
  assert.equal(lineageRelationshipLabel('derived_from'), 'basis for')
})

test('partial evidence dates use their conservative end rather than inventing a reported day', () => {
  assert.equal(isOnOrBefore({ value: '2025', precision: 'year' }, '2025-01-01'), false)
  assert.equal(isOnOrBefore({ value: '2025-03', precision: 'month' }, '2025-03-01'), false)
  assert.equal(isOnOrBefore({ value: '2025-03', precision: 'month' }, '2025-03-31'), true)
})
