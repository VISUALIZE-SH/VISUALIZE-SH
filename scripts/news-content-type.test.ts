import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import type { NewsItem } from '../src/types/entities'

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)
const validate = ajv.compile(JSON.parse(readFileSync('schema/news.schema.json', 'utf8')))
const item: NewsItem = {
  id: 'news-2026-10-13-example', publishedAt: '2026-10-13',
  title: 'Synthetic story', summary: 'Synthetic summary.',
  sourceName: 'Example', sourceUrl: 'https://example.org/story',
  topicTags: ['test'], relevantNodeIds: ['cond-example'],
}

test('news schema accepts explicit categories and rejects unsupported values', () => {
  assert.equal(validate(item), true)
  for (const contentType of ['news', 'news-insights', 'editorial']) {
    assert.equal(validate({ ...item, contentType }), true)
    assert.equal(validate({ ...item, contentType, reviewStatus: 'draft' }), true)
  }
  for (const contentType of ['News Insights', 'analysis', '', null, 1]) {
    assert.equal(validate({ ...item, contentType }), false)
  }
})

test('both actual News surfaces badge only explicit Insights and Editorial cards', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  try {
    const { default: NewsFeed } = await server.ssrLoadModule('/src/components/NewsFeed.tsx')
    const { default: NewsWorkspace } = await server.ssrLoadModule('/src/components/intelligence/NewsWorkspace.tsx')
    const workspaceProps = {
      data: { families: [], versions: [] }, nodesById: new Map(), versionId: null,
      onOpenAtlas() {}, onOpenAtlasTopic() {}, onOpenData() {}, atlasTopics: new Set(),
      newsFrom: '', newsTo: '', searchQuery: '',
    }
    for (const contentType of [undefined, 'news', 'news-insights', 'editorial'] as const) {
      const story = { ...item, contentType }
      for (const html of [
        renderToStaticMarkup(createElement(NewsFeed, { items: [story] })),
        renderToStaticMarkup(createElement(NewsWorkspace, { ...workspaceProps, legacyNews: [story] })),
      ]) {
        if (contentType === 'news-insights' || contentType === 'editorial') {
          const label = contentType === 'news-insights' ? 'News Insights' : 'Editorial'
          assert.equal((html.match(/news-content-badge/g) ?? []).length, 1, 'one category label is rendered')
          assert.ok(html.includes(`news-content-badge">${label}</span>`))
          const metadataClass = html.includes('news-card-meta') ? 'news-card-meta' : 'intel-news-story-meta'
          const metadataStart = html.indexOf(`class="${metadataClass}"`)
          const metadataEnd = html.indexOf('</div>', metadataStart)
          const labelIndex = html.indexOf('news-content-badge', metadataStart)
          assert.ok(metadataStart >= 0 && labelIndex > metadataStart && labelIndex < metadataEnd, 'category label appears in metadata')
          assert.equal((html.match(/<span class="news-content-badge"/g) ?? []).length, 1, 'no standalone duplicate badge')
          assert.ok(html.includes('Example'), 'the publisher remains visible alongside the category')
        } else {
          assert.ok(!html.includes('news-content-badge'))
        }
      }
    }
    const keywordStory = { ...item, contentType: 'news-insights', topicTags: ['News Insights'] }
    for (const html of [
      renderToStaticMarkup(createElement(NewsFeed, { items: [keywordStory] })),
      renderToStaticMarkup(createElement(NewsWorkspace, { ...workspaceProps, legacyNews: [keywordStory] })),
    ]) assert.equal((html.match(/News Insights/g) ?? []).length, 1, 'the keyword does not repeat as a topic pill')
    const inferred = { ...item, title: 'News Insights: Editorial', topicTags: ['Editorial'] }
    assert.ok(!renderToStaticMarkup(createElement(NewsFeed, { items: [inferred] })).includes('news-content-badge'))
    const searchable = renderToStaticMarkup(createElement(NewsWorkspace, {
      ...workspaceProps, legacyNews: [{ ...item, contentType: 'news-insights' }], searchQuery: 'News Insights',
    }))
    assert.ok(searchable.includes('Synthetic story'))
    const absent = renderToStaticMarkup(createElement(NewsWorkspace, {
      ...workspaceProps, legacyNews: [item], searchQuery: 'News Insights',
    }))
    assert.ok(absent.includes('No matching news'))
    const longform = renderToStaticMarkup(createElement(NewsWorkspace, {
      ...workspaceProps,
      data: { families: [{ id: 'family-test', entityIds: ['cond-example'] }], versions: [{ id: 'ver-test', familyId: 'family-test', name: 'Test version' }] },
      legacyNews: [{ ...item, contentType: 'news-insights' }],
    }))
    assert.ok(!longform.includes('>Open product profile</button>'), 'a cross-topic article does not infer one primary product')
  } finally {
    await server.close()
  }
})
