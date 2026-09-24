import assert from 'node:assert/strict'
import test from 'node:test'
import { escapeHtml, groupFor, isHttpsUrl, isSendableNewsItem, renderDocument, selectNewsForIssue } from './render-newsletter'

test('escapes text and permits only public HTTPS URLs', () => {
  assert.equal(escapeHtml('<a&"\'>'), '&lt;a&amp;&quot;&#39;&gt;')
  assert.equal(isHttpsUrl('https://example.test/source'), true)
  assert.equal(isHttpsUrl('http://example.test/source'), false)
  assert.equal(isHttpsUrl('javascript:alert(1)'), false)
})

test('uses deterministic newsletter groups', () => {
  const base = { id: 'news-2026-01-01-example', publishedAt: '2026-01-01', title: 'x', summary: 'x', sourceName: 'x', sourceUrl: 'https://example.test', relevantNodeIds: ['cond-as'] }
  assert.equal(groupFor({ ...base, topicTags: ['TAVR'] }), 'Structural Heart')
  assert.equal(groupFor({ ...base, topicTags: ['clinical AI'] }), 'SH-relevant Digital Therapies')
  assert.equal(groupFor({ ...base, topicTags: ['heart failure', 'clinical AI'] }), 'Heart Failure')
})

test('weekly sendable output excludes explicitly draft news', () => {
  const item = { id: 'draft', publishedAt: '2026-01-01', title: 'x', summary: 'x', sourceName: 'x', sourceUrl: 'https://example.test', topicTags: [], relevantNodeIds: [] }
  assert.equal(isSendableNewsItem(item), true)
  assert.equal(isSendableNewsItem({ ...item, reviewStatus: 'reviewed' }), true)
  assert.equal(isSendableNewsItem({ ...item, reviewStatus: 'draft' }), false)
  assert.deepEqual(selectNewsForIssue([{ ...item, reviewStatus: 'draft' }], '2026-01-01', '2026-01-07', true).map((value) => value.id), ['draft'])
  assert.deepEqual(selectNewsForIssue([{ ...item, reviewStatus: 'draft' }], '2026-01-01', '2026-01-07', false), [])
  const grouped: Parameters<typeof renderDocument>[2] = new Map([['Structural Heart', [{ ...item, reviewStatus: 'draft' as const }]]])
  assert.match(renderDocument('2026-01-07', '2026-01-01', grouped, true, true), /DRAFT REVIEW — FOR LOCAL REVIEW ONLY; DO NOT SEND/)
})
