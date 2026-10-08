import assert from 'node:assert/strict'
import test from 'node:test'
import { auditDatabase, legacyGaps, legacySources } from './audit-database'

test('audit collects permanent-material and timeline evidence without treating a website as proof', () => {
  const record = { type: 'therapy', therapyType: 'device', website: 'https://example.org',
    materials: [{ source: 'https://example.org/ifu' }], timeline: { source: 'https://example.org/decision' },
    curation: { sources: ['PMID:11997272', 'https://example.org/ifu'] } }
  assert.deepEqual(legacySources(record).map(source => source.url), [
    'https://example.org/decision', 'https://example.org/ifu', 'https://pubmed.ncbi.nlm.nih.gov/11997272/',
  ])
  assert.ok(!legacyGaps(record).includes('no_explicit_evidence'))
  assert.ok(legacyGaps(record).includes('missing_company_relationship'))
})

test('trial registry mismatches are visible and procedures do not acquire invented maker/date gaps', () => {
  assert.ok(legacyGaps({ type: 'trial', nctId: 'NCT00000001', references: ['https://clinicaltrials.gov/study/NCT00000002'] })
    .includes('registry_reference_requires_reconciliation'))
  const procedure = legacyGaps({ type: 'therapy', therapyType: 'procedure', regulatoryStatus: 'approved' })
  assert.ok(!procedure.includes('missing_company_relationship'))
  assert.ok(!procedure.includes('timeline_date_not_recorded'))
})

test('invalid calendar dates fail before any inventory is read', () => {
  assert.throws(() => auditDatabase('/does-not-exist', '2026-02-30'), /valid YYYY-MM-DD/)
  assert.throws(() => auditDatabase('/does-not-exist', '2026-13-01'), /valid YYYY-MM-DD/)
})
