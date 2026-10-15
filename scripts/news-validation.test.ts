import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { newsDateIssues } from './news-validation'
import type { NewsItem } from '../src/types/entities'

const base: NewsItem = { id: 'news-2026-08-28-example', publishedAt: '2026-08-28', title: 'Example', summary: 'Original summary.', sourceName: 'Manufacturer', sourceUrl: 'https://example.test/release', topicTags: ['TMVR'], relevantNodeIds: ['cond-mr'] }
const correction = { previousPublishedAt: '2026-08-28', reason: 'Primary release establishes August 27; retain the existing ID.', sourceUrl: base.sourceUrl }
const ajv = new Ajv({ allErrors: true }); addFormats(ajv)
const validate = ajv.compile(JSON.parse(readFileSync(new URL('../schema/news.schema.json', import.meta.url), 'utf8')))

test('ordinary News still requires its ID date to match publication date', () => {
  assert.deepEqual(newsDateIssues(base), [])
  assert.match(newsDateIssues({ ...base, publishedAt: '2026-08-27' })[0], /date prefix must match/)
})

test('a documented correction preserves the ID and permits the corrected date', () => {
  const item = { ...base, publishedAt: '2026-08-27', reviewStatus: 'reviewed' as const, publicationDateCorrection: correction }
  assert.deepEqual(newsDateIssues(item), [])
  assert.equal(validate(item), true)
  // Draft corrections remain local; the public-feed review gate still applies independently.
  assert.equal(validate({ ...item, reviewStatus: 'draft' }), true)
})

test('correction metadata cannot refer to a different immutable ID date or a no-op', () => {
  assert.match(newsDateIssues({ ...base, publishedAt: '2026-08-27', publicationDateCorrection: { ...correction, previousPublishedAt: '2026-08-29' } })[0], /immutable ID date/)
  assert.match(newsDateIssues({ ...base, publicationDateCorrection: correction })[0], /must change/)
})

test('date corrections require an explicit review state, reason, eligible URL and calendar date', () => {
  const item = { ...base, publishedAt: '2026-08-27', publicationDateCorrection: correction }
  assert.equal(validate(item), false)
  const reviewed = { ...item, reviewStatus: 'reviewed' }
  assert.equal(validate({ ...reviewed, publicationDateCorrection: { ...correction, reason: '' } }), false)
  assert.equal(validate({ ...reviewed, publicationDateCorrection: { ...correction, sourceUrl: 'http://example.test/release' } }), false)
  assert.equal(validate({ ...reviewed, publicationDateCorrection: { ...correction, previousPublishedAt: '2026-02-30' } }), false)
})
