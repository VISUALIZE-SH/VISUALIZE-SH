import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import yaml from 'js-yaml'
import type { GraphData, NewsItem } from '../src/types/entities'
import { NEWS_PAGE_LIMIT, orderNews, splitNewsArchive } from '../src/data/news-archive'

const item = (id: string, publishedAt: string) => ({ id, publishedAt }) as NewsItem

test('News keeps the newest items and moves only the older ones to the archive', () => {
  const ordered = orderNews([
    item('news-2026-01-02-b', '2026-01-02'), item('news-2025-05-01-old', '2025-05-01'),
    item('news-2026-01-02-a', '2026-01-02'), item('news-2026-03-01-new', '2026-03-01'),
  ])
  assert.deepEqual(ordered.map(news => news.id), ['news-2026-03-01-new', 'news-2026-01-02-a', 'news-2026-01-02-b', 'news-2025-05-01-old'])
  const { current, archive } = splitNewsArchive(ordered, 3)
  assert.deepEqual(current.map(news => news.id), ['news-2026-03-01-new', 'news-2026-01-02-a', 'news-2026-01-02-b'])
  assert.deepEqual(archive.map(news => news.id), ['news-2025-05-01-old'])
  assert.deepEqual(splitNewsArchive(ordered.slice(0, 3), 3).archive, [], 'a feed at the limit has an empty archive')
})

test('graph.json keeps every published item, so Atlas, search and bibliographies still see archived News', () => {
  const graph = JSON.parse(readFileSync(new URL('../public/graph.json', import.meta.url), 'utf8')) as GraphData
  const authored = yaml.load(readFileSync(new URL('../data/news.yaml', import.meta.url), 'utf8'), { schema: yaml.CORE_SCHEMA }) as NewsItem[]
  const published = authored.filter(news => news.reviewStatus !== 'draft')
  assert.equal(graph.news.length, published.length)
  assert.equal(new Set(graph.news.map(news => news.id)).size, published.length)
  assert.deepEqual(graph.news.map(news => news.id), orderNews(published).map(news => news.id), 'graph news is newest first')
  assert.equal(graph.meta.newsCount, published.length)
  assert.equal(graph.meta.newsArchiveCount, Math.max(0, published.length - NEWS_PAGE_LIMIT))
  const { current, archive } = splitNewsArchive(graph.news)
  assert.ok(current.length <= NEWS_PAGE_LIMIT)
  if (archive.length) assert.ok(archive[0].publishedAt <= current.at(-1)!.publishedAt, 'archived items are not newer than News')
})
