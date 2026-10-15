import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import yaml from 'js-yaml'
import type { NewsItem } from '../src/types/entities'
import { prepareRun, completeRun, type RunManifest } from './news-insights-run'

function news(id: string, date: string, extra: Partial<NewsItem> = {}): NewsItem {
  return { id, publishedAt: date, title: id, summary: 'Synthetic.', sourceName: 'Example', sourceUrl: 'https://example.org', topicTags: ['test'], relevantNodeIds: ['cond-test'], ...extra }
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'news-insights-run-'))
  const rootDir = join(root, 'state')
  const newsPath = join(root, 'news.yaml')
  const articlePath = join(root, 'article.yaml')
  const previewPath = join(root, 'preview.html')
  return {
    rootDir, newsPath, articlePath, previewPath,
    write(items: NewsItem[]) { writeFileSync(newsPath, yaml.dump(items)) },
    prepare(runDate: string, from?: string) { return prepareRun({ runDate, from, rootDir, newsPath }) },
    complete(manifest: RunManifest) {
      writeFileSync(articlePath, 'synthetic article')
      writeFileSync(previewPath, '<p>synthetic preview</p>')
      return completeRun(manifest, { articlePath, previewPath, rootDir })
    },
    clean() { rmSync(root, { recursive: true, force: true }) },
  }
}

test('initial explicit fourteen-date window separates backfills and excludes longform', () => {
  const f = fixture()
  try {
    f.write([news('early', '2026-09-29'), news('start', '2026-09-30'), news('end', '2026-10-13'), news('future', '2026-10-14'), news('insight', '2026-10-12', { contentType: 'news-insights' }), news('editorial', '2026-10-12', { contentType: 'editorial' })])
    assert.throws(() => f.prepare('2026-10-13'), /first run requires/)
    const result = f.prepare('2026-10-13', '2026-09-30')
    assert.equal((Date.parse(result.windowTo) - Date.parse(result.windowFrom)) / 86400000 + 1, 14)
    assert.equal(result.previousRunDate, null)
    assert.equal(result.windowBasis, 'initial-explicit')
    assert.deepEqual(result.candidateNewsIds, ['end', 'start'])
    assert.deepEqual(result.backfillNewsIds, [], 'initial older records establish a baseline, not discoveries')
    assert.deepEqual(Object.keys(result.fingerprints).sort(), ['early', 'end', 'start'])
    assert.equal(result.status, 'prepared')
  } finally { f.clean() }
})

test('monthly gap includes new boundary items and updates but suppresses unchanged and curation-only changes', () => {
  const f = fixture()
  try {
    const boundary = news('boundary', '2026-10-13', { reviewStatus: 'draft' })
    const updated = news('updated', '2026-10-13')
    f.write([boundary, updated, news('old-seen', '2026-09-01')])
    f.complete(f.prepare('2026-10-13', '2026-09-30'))
    f.write([{ ...boundary, reviewStatus: 'reviewed' }, { ...updated, summary: 'Changed source-linked summary.' }, news('new-boundary', '2026-10-13'), news('mid-gap', '2026-10-25'), news('new-backfill', '2026-09-10'), news('old-seen', '2026-09-01')])
    const next = f.prepare('2026-11-13')
    assert.equal(next.windowFrom, '2026-10-13')
    assert.equal(next.windowTo, '2026-11-13')
    assert.equal(next.previousRunDate, '2026-10-13')
    assert.equal(next.windowBasis, 'since-last-completed-run')
    assert.deepEqual(next.candidateNewsIds, ['mid-gap', 'new-boundary', 'updated'])
    assert.equal(next.candidates.find((candidate) => candidate.item.id === 'updated')?.reason, 'updated')
    assert.equal(next.candidates.find((candidate) => candidate.item.id === 'new-boundary')?.reason, 'new')
    assert.deepEqual(next.backfillNewsIds, ['new-backfill'])
    f.complete(next)
    const third = f.prepare('2026-11-14')
    assert.deepEqual(third.candidateNewsIds, [])
    assert.deepEqual(third.backfillNewsIds, [])
  } finally { f.clean() }
})

test('prepared or failed runs do not checkpoint and same-date reruns stay frozen and idempotent', () => {
  const f = fixture()
  try {
    f.write([news('a', '2026-10-13')])
    const prepared = f.prepare('2026-10-13', '2026-09-30')
    assert.throws(() => completeRun(prepared, f), /Missing or empty/)
    f.write([news('a', '2026-10-13'), news('later', '2026-10-13')])
    assert.deepEqual(f.prepare('2026-10-13'), prepared)
    assert.throws(() => f.prepare('2026-10-13', '2026-10-01'), /frozen same-date/)
    assert.deepEqual(f.prepare('2026-10-13', '2026-09-30'), prepared)
    assert.throws(() => f.prepare('2026-10-14'), /first run requires/)
    const deferred = f.prepare('2026-10-14', '2026-09-30')
    assert.equal(deferred.previousRunDate, null)
    const complete = f.complete(prepared)
    assert.deepEqual(f.complete(prepared), complete)
    assert.deepEqual(f.prepare('2026-10-13'), complete)
    const runs = JSON.parse(readFileSync(join(f.rootDir, 'runs.json'), 'utf8')) as RunManifest[]
    assert.equal(runs.length, 2)
    assert.deepEqual(runs.map((run) => run.status), ['complete', 'prepared'])
    assert.equal(f.prepare('2026-10-15').previousRunDate, '2026-10-13')
  } finally { f.clean() }
})

test('rejects invalid dates, reversed windows, backwards completion, and duplicate IDs', () => {
  const f = fixture()
  try {
    f.write([news('a', '2026-10-13')])
    for (const date of ['2026-02-30', '2026-13-01', '2026-10-1', 'bad']) assert.throws(() => f.prepare(date, '2026-01-01'), /Invalid calendar/)
    assert.throws(() => f.prepare('2026-10-13', '2026-10-14'), /must not follow/)
    const initial = f.prepare('2026-10-13', '2026-09-30')
    const olderPrepared = f.prepare('2026-10-12', '2026-09-30')
    f.complete(initial)
    assert.throws(() => f.prepare('2026-10-12'), /backwards/)
    assert.throws(() => f.complete(olderPrepared), /behind/)
    assert.throws(() => f.prepare('2026-10-15', '2026-10-01'), /previous completed/)
    f.write([news('a', '2026-10-14'), news('a', '2026-10-14')])
    assert.throws(() => f.prepare('2026-10-15'), /Duplicate news id/)
    f.write([news('bad-date', '2026-02-30')])
    assert.throws(() => f.prepare('2026-10-15'), /Invalid calendar/)
  } finally { f.clean() }
})

test('stale prepared snapshots cannot be reused or completed after a checkpoint advances', () => {
  const f = fixture()
  try {
    f.write([news('a', '2026-10-13')])
    const initial = f.prepare('2026-10-13', '2026-09-30')
    const later = f.prepare('2026-10-14', '2026-09-30')
    const frozenFile = join(f.rootDir, '2026-10-14', 'run.json')
    const before = readFileSync(frozenFile, 'utf8')
    f.complete(initial)
    assert.throws(() => f.prepare('2026-10-14'), /stale completed checkpoint/)
    assert.throws(() => f.complete(later), /stale completed checkpoint/)
    assert.equal(readFileSync(frozenFile, 'utf8'), before, 'stale snapshot stays frozen for deliberate reconciliation')
    assert.deepEqual(f.complete(initial), f.prepare('2026-10-13'), 'completed same-date reruns remain idempotent')
    const runs = JSON.parse(readFileSync(join(f.rootDir, 'runs.json'), 'utf8')) as RunManifest[]
    assert.equal(runs.find((run) => run.runDate === '2026-10-14')?.status, 'prepared')
  } finally { f.clean() }
})
