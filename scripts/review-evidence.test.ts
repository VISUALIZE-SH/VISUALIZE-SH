import assert from 'node:assert/strict'
import test from 'node:test'
import type { IntelligenceData } from '../src/types/intelligence'
import { reviewPacket } from './review-evidence'

function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value)
    for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child)
  }
  return value
}

function fixture(): IntelligenceData {
  const sourceRefs = [{ sourceId: 'src-one', locator: 'Results, table 1' }]
  return {
    schemaVersion: 1,
    updatedAt: '2026-09-21',
    coverage: { title: 'Review fixture', description: 'Synthetic.' },
    sources: [{ id: 'src-one', title: 'Licensed source metadata', url: 'https://example.org/source', kind: 'publication', publisher: 'Example', retrievedAt: '2026-09-21', access: 'licensed' }],
    families: [{ id: 'family-one', name: 'Family', manufacturer: 'Example', entityIds: [], conditionIds: ['cond-one'], description: 'Synthetic.' }],
    versions: [
      { id: 'ver-draft', familyId: 'family-one', name: 'Draft version', kind: 'device', clinicalRole: 'treats', summary: 'Draft.', sourceRefs, reviewStatus: 'draft' },
      { id: 'ver-reviewed', familyId: 'family-one', name: 'Reviewed version', kind: 'device', clinicalRole: 'treats', summary: 'Reviewed.', sourceRefs, reviewStatus: 'reviewed' },
    ],
    claims: [{ id: 'claim-missing', versionId: 'ver-draft', category: 'design', key: 'stress', label: 'Stress', availability: 'not_yet_reviewed', basis: 'directly_reported', observedAt: '2026-09-21', limitation: 'Not extracted.', sourceRefs, reviewStatus: 'draft' }],
    decisions: [],
    indications: [],
    trials: [{ id: 'trial-unresolved', name: 'Unresolved trial', familyIds: ['family-one'], design: 'Randomized', versionIds: [], versionMapping: 'unclear', population: 'Synthetic.', sourceRefs, reviewStatus: 'draft' }],
    trialSnapshots: [],
    cohorts: [],
    endpoints: [],
    readouts: [],
    outcomes: [],
    lineage: [],
    events: [],
  }
}

test('review packet preserves draft identity and provenance without mutating or promoting input', () => {
  const data = freezeDeep(fixture())
  const sourceProposal = freezeDeep({ id: 'document-change', status: 'DRAFT', kind: 'document_content_changed', previousHash: 'a', currentHash: 'b' })
  const weeklyProposal = freezeDeep({ path: 'data/research-proposals/2026-09-21.json', record: { reviewStatus: 'draft' } })
  const before = JSON.stringify({ data, sourceProposal, weeklyProposal })

  const packet = reviewPacket(data, [sourceProposal], [weeklyProposal])

  assert.equal(JSON.stringify({ data, sourceProposal, weeklyProposal }), before)
  assert.deepEqual(packet.summary, { draftRecords: 3, sourceChanges: 1, weeklyArtifacts: 1 })
  assert.deepEqual(packet.draftRecords.map(record => ({ collection: record.collection, id: record.id })), [
    { collection: 'versions', id: 'ver-draft' },
    { collection: 'claims', id: 'claim-missing' },
    { collection: 'trials', id: 'trial-unresolved' },
  ])
  assert.deepEqual(packet.draftRecords[0].sourceRefs, [{ sourceId: 'src-one', locator: 'Results, table 1' }])
  assert.equal(packet.draftRecords.some(record => record.id === 'ver-reviewed'), false)
  assert.equal(packet.sourceChanges[0], sourceProposal)
  assert.equal((packet.sourceChanges[0] as { status: string }).status, 'DRAFT')
  assert.equal('sources' in packet, false)
  assert.deepEqual(packet.missingFields, [{ id: 'claim-missing', versionId: 'ver-draft', label: 'Stress', availability: 'not_yet_reviewed', limitation: 'Not extracted.' }])
  assert.deepEqual(packet.unresolvedTrialMappings[0], { id: 'trial-unresolved', name: 'Unresolved trial', familyIds: ['family-one'], versionMapping: 'unclear', sourceRefs: [{ sourceId: 'src-one', locator: 'Results, table 1' }] })
})
