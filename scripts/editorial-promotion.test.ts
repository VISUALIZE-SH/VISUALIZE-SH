import assert from 'node:assert/strict'
import test from 'node:test'
import { editorialInvitation, EDITORIAL_START, EDITORIAL_END, LAAO_EDITORIAL_ID } from '../src/editorial/promotion'
import type { NewsItem } from '../src/types/entities'

const article: NewsItem = {
  id: LAAO_EDITORIAL_ID, publishedAt: '2026-10-16', contentType: 'editorial',
  title: 'LAAO Part 1', summary: 'Design review.', sourceName: 'VISUALIZE-SH',
  sourceUrl: 'https://visualize-sh.com/editorials/laao-design-series-part-1/',
  relevantNodeIds: ['cond-laa'], topicTags: ['LAAO'],
}
test('editorial invitation is limited to seven LA calendar days and an available article', () => {
  assert.equal(editorialInvitation([article], EDITORIAL_START - 1), undefined)
  assert.equal(editorialInvitation([article], EDITORIAL_START), article)
  assert.equal(editorialInvitation([article], EDITORIAL_END - 1), article)
  assert.equal(editorialInvitation([article], EDITORIAL_END), undefined)
  assert.equal(editorialInvitation([], EDITORIAL_START), undefined)
  assert.equal(editorialInvitation([{ ...article, contentType: 'news' }], EDITORIAL_START), undefined)
})
