import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { capturePublicDocument } from './intelligence/document-snapshot'
import { canonicalJson, captureEvidence, diffNormalized, fetchOfficialJson, normalizeEvidence, officialUrl, stableHash } from './intelligence/snapshot'

function ctgovFixture(count: number, status = 'RECRUITING'): unknown {
  return {
    protocolSection: {
      identificationModule: { nctId: 'NCT99999999', briefTitle: 'Synthetic study' },
      statusModule: { overallStatus: status, startDateStruct: { date: '2099-01', type: 'ESTIMATED' } },
      designModule: { studyType: 'INTERVENTIONAL', enrollmentInfo: { count, type: 'ESTIMATED' } },
      conditionsModule: { conditions: ['Synthetic condition'] },
      outcomesModule: { primaryOutcomes: [{ measure: 'Endpoint', timeFrame: '1 year' }] },
    },
  }
}

test('canonical hash ignores object key order and field diffs are normalized', () => {
  assert.equal(stableHash({ b: 2, a: 1 }), stableHash({ a: 1, b: 2 }))
  assert.equal(canonicalJson({ b: 2, a: 1 }), '{"a":1,"b":2}')
  assert.deepEqual(diffNormalized({ enrollment: { count: 10 }, status: 'A' }, { enrollment: { count: 12 }, status: 'A' }), [{ path: '$.enrollment.count', before: 10, after: 12 }])
  assert.deepEqual(diffNormalized({ retained: true }, { retained: true, added: 2 }), [{ path: '$.added', after: 2 }])
  assert.deepEqual(diffNormalized({ retained: true, removed: 2 }, { retained: true }), [{ path: '$.removed', before: 2 }])
})

test('official URLs are bounded to supported identifiers and hosts', () => {
  assert.match(officialUrl('ctgov', 'nct99999999'), /^https:\/\/clinicaltrials\.gov\/api\/v2\/studies\/NCT99999999$/)
  const fdaUrl = new URL(officialUrl('fda-pma', 'P140031S010'))
  assert.equal(fdaUrl.origin + fdaUrl.pathname, 'https://api.fda.gov/device/pma.json')
  assert.equal(fdaUrl.searchParams.get('search'), 'pma_number:"P140031" AND supplement_number:"S010"')
  assert.throws(() => officialUrl('ctgov', 'https://example.org'), /must match NCT/)
})

test('FDA normalization requires one exact base and supplement identity', () => {
  const result = (supplement: string) => ({ pma_number: 'P140031', supplement_number: supplement, decision_date: '20260101' })
  assert.equal(normalizeEvidence('fda-pma', { results: [result('S009'), result('S010')] }, 'P140031S010').supplementNumber, 'S010')
  assert.equal(normalizeEvidence('fda-pma', { results: [result('S001'), { pma_number: 'P140031', supplement_number: '' }] }, 'P140031').supplementNumber, '')
  assert.throws(() => normalizeEvidence('fda-pma', { results: [result('S009')] }, 'P140031S010'), /no exact identity match/)
  assert.throws(() => normalizeEvidence('fda-pma', { results: [result('S001')] }, 'P140031'), /no exact identity match/)
  assert.throws(() => normalizeEvidence('fda-pma', { results: [{ supplement_number: 'S010' }] }, 'P140031S010'), /no exact identity match/)
  assert.throws(() => normalizeEvidence('fda-pma', { results: [result('S010'), result('S010')] }, 'P140031S010'), /multiple exact identity matches/)
  assert.throws(() => normalizeEvidence('fda-pma', { results: [] }, 'P140031S010'), /no results/)
})

test('ClinicalTrials.gov normalization rejects missing or wrong registry identity', () => {
  const missing = ctgovFixture(10) as { protocolSection: { identificationModule: { nctId?: string } } }
  delete missing.protocolSection.identificationModule.nctId
  assert.throws(() => normalizeEvidence('ctgov', missing, 'NCT99999999'), /missing nctId/)
  assert.throws(() => normalizeEvidence('ctgov', ctgovFixture(10), 'NCT00000001'), /response is for NCT99999999/)
})

test('official fetch is a credential-free GET to the allowlisted URL', async () => {
  let request: { input: string; init?: RequestInit } | undefined
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    request = { input: String(input), init }
    return new Response(JSON.stringify(ctgovFixture(10)), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  await fetchOfficialJson('ctgov', 'NCT99999999', fetcher)
  assert.equal(request?.input, 'https://clinicaltrials.gov/api/v2/studies/NCT99999999')
  assert.equal(request?.init?.method, 'GET')
  assert.equal(new Headers(request?.init?.headers).has('authorization'), false)
  assert.equal(request?.init?.redirect, 'error')
})

test('snapshots are immutable, changes create DRAFT proposals, and retries deduplicate', () => {
  const directory = mkdtempSync(join(tmpdir(), 'visualize-sh-evidence-'))
  try {
    const snapshotDir = join(directory, 'snapshots'); const queuePath = join(directory, 'review-queue.json')
    const base = { source: 'ctgov' as const, identifier: 'NCT99999999', officialUrl: officialUrl('ctgov', 'NCT99999999'), snapshotDir, queuePath }
    const first = captureEvidence({ ...base, raw: ctgovFixture(10), retrievedAt: '2026-09-21T12:00:00.000Z' })
    assert.equal(first.snapshotCreated, true); assert.equal(first.proposalCreated, false)
    const firstContents = readFileSync(first.snapshotPath, 'utf8')

    const second = captureEvidence({ ...base, raw: ctgovFixture(12), retrievedAt: '2026-09-21T13:00:00.000Z' })
    assert.equal(second.snapshotCreated, true); assert.equal(second.proposalCreated, true)
    assert.deepEqual(second.changes, [{ path: '$.enrollment.count', before: 10, after: 12 }])
    const queue = JSON.parse(readFileSync(queuePath, 'utf8')) as { proposals: Array<{ status: string }> }
    assert.equal(queue.proposals.length, 1); assert.equal(queue.proposals[0].status, 'DRAFT')
    assert.equal(readFileSync(first.snapshotPath, 'utf8'), firstContents)

    const retry = captureEvidence({ ...base, raw: ctgovFixture(12), retrievedAt: '2026-09-21T14:00:00.000Z' })
    assert.equal(retry.snapshotCreated, false); assert.equal(retry.proposalCreated, false); assert.deepEqual(retry.changes, [])
    const retriedQueue = JSON.parse(readFileSync(queuePath, 'utf8')) as { proposals: unknown[] }
    assert.equal(retriedQueue.proposals.length, 1)

    const tampered = JSON.parse(firstContents) as { raw: unknown }
    tampered.raw = ctgovFixture(99)
    writeFileSync(first.snapshotPath, JSON.stringify(tampered))
    assert.throws(() => captureEvidence({ ...base, raw: ctgovFixture(12), retrievedAt: '2026-09-21T15:00:00.000Z' }), /invalid or modified immutable snapshot/)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('proposal writer refuses curated YAML targets', () => {
  const directory = mkdtempSync(join(tmpdir(), 'visualize-sh-evidence-safe-'))
  try {
    const base = { source: 'ctgov' as const, identifier: 'NCT99999999', officialUrl: officialUrl('ctgov', 'NCT99999999'), snapshotDir: join(directory, 'snapshots'), queuePath: join(directory, 'pilot.yaml') }
    captureEvidence({ ...base, raw: ctgovFixture(10), retrievedAt: '2026-09-21T12:00:00.000Z' })
    assert.throws(() => captureEvidence({ ...base, raw: ctgovFixture(11), retrievedAt: '2026-09-21T13:00:00.000Z' }), /dedicated JSON file/)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('local public documents retain byte-identical snapshots and create no fake semantic diff', () => {
  const directory = mkdtempSync(join(tmpdir(), 'visualize-sh-document-'))
  try {
    const filePath = join(directory, 'decision.pdf'); const snapshotDir = join(directory, 'snapshots'); const queuePath = join(directory, 'review-queue.json')
    const base = { identifier: 'P140031S010-order', sourceUrl: 'https://www.accessdata.fda.gov/cdrh_docs/pdf14/P140031S010A.pdf', filePath, snapshotDir, queuePath }
    writeFileSync(filePath, Buffer.from('%PDF-1.4\nsynthetic version one\n'))
    const first = capturePublicDocument({ ...base, retrievedAt: '2026-09-21T12:00:00.000Z' })
    assert.equal(first.snapshotCreated, true); assert.equal(first.proposalCreated, false); assert.equal(existsSync(first.snapshotPath), true)

    writeFileSync(filePath, Buffer.from('%PDF-1.4\nsynthetic version two\n'))
    const second = capturePublicDocument({ ...base, retrievedAt: '2026-09-21T13:00:00.000Z' })
    assert.equal(second.snapshotCreated, true); assert.equal(second.proposalCreated, true); assert.notEqual(second.snapshotPath, first.snapshotPath)
    assert.equal(existsSync(first.snapshotPath), true); assert.equal(existsSync(second.snapshotPath), true)
    const queue = JSON.parse(readFileSync(queuePath, 'utf8')) as { proposals: Array<Record<string, unknown>> }
    assert.equal(queue.proposals.length, 1); assert.equal(queue.proposals[0].status, 'DRAFT'); assert.equal(queue.proposals[0].kind, 'document_content_changed')
    assert.equal('changes' in queue.proposals[0], false)

    const retry = capturePublicDocument({ ...base, retrievedAt: '2026-09-21T14:00:00.000Z' })
    assert.equal(retry.snapshotCreated, false); assert.equal(retry.proposalCreated, false)
    assert.throws(() => capturePublicDocument({ ...base, sourceUrl: 'https://example.org/private.pdf', retrievedAt: '2026-09-21T15:00:00.000Z' }), /public HTTPS on an allowlisted/)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
