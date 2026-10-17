import assert from 'node:assert/strict'
import test from 'node:test'
import type { IntelligenceData } from '../src/types/intelligence'
import { applyGeneratedApprovals, snapshotGeneratedApprovals } from './intelligence/approvals'

test('generated approvals cover exact record and source content; changes and new records stay draft', () => {
  const data = { sources: [{ id: 'src-one', title: 'Original source' }],
    claims: [{ id: 'claim-one', value: 'Original value', reviewStatus: 'draft', sourceRefs: [{ sourceId: 'src-one', locator: 'p. 1' }] }] } as unknown as IntelligenceData
  const approvals = snapshotGeneratedApprovals(data, '2026-10-17')
  assert.equal(applyGeneratedApprovals(data, approvals).claims[0].reviewStatus, 'reviewed')
  const changed = structuredClone(data)
  changed.claims[0].label = 'Changed claim'
  assert.equal(applyGeneratedApprovals(changed, approvals).claims[0].reviewStatus, 'draft')
  const changedSource = structuredClone(data)
  changedSource.sources[0].title = 'Changed source'
  assert.equal(applyGeneratedApprovals(changedSource, approvals).claims[0].reviewStatus, 'draft')
  const added = structuredClone(data)
  added.claims.push({ ...added.claims[0], id: 'claim-two' })
  assert.equal(applyGeneratedApprovals(added, approvals).claims[1].reviewStatus, 'draft')
  assert.equal(data.claims[0].reviewStatus, 'draft', 'authored/generated inputs are not mutated')
})
