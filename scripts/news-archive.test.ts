import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import yaml from 'js-yaml'
import type { GraphData, NewsItem } from '../src/types/entities'
import { NEWS_PAGE_LIMIT, orderNews, splitNewsArchive, type NewsArchiveData } from '../src/data/news-archive'

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

test('the built payloads hold every published item exactly once, split at the page limit', () => {
  const graph = JSON.parse(readFileSync(new URL('../public/graph.json', import.meta.url), 'utf8')) as GraphData
  const archivePath = new URL('../public/news-archive.json', import.meta.url)
  assert.ok(existsSync(archivePath), 'build-data writes public/news-archive.json')
  const archive = (JSON.parse(readFileSync(archivePath, 'utf8')) as NewsArchiveData).news
  const authored = yaml.load(readFileSync(new URL('../data/news.yaml', import.meta.url), 'utf8'), { schema: yaml.CORE_SCHEMA }) as NewsItem[]
  const published = authored.filter(news => news.reviewStatus !== 'draft').length
  assert.ok(graph.news.length <= NEWS_PAGE_LIMIT)
  assert.equal(graph.news.length + archive.length, published)
  assert.equal(graph.meta.newsArchiveCount, archive.length)
  if (archive.length) {
    assert.equal(graph.news.length, NEWS_PAGE_LIMIT, 'the archive fills only after News is full')
    assert.ok(archive[0].publishedAt <= graph.news.at(-1)!.publishedAt, 'archived items are not newer than News')
  }
  assert.equal(new Set([...graph.news, ...archive].map(news => news.id)).size, published)
})
