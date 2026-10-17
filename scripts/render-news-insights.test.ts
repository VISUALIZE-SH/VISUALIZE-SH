import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import yaml from 'js-yaml'
import type { GraphData } from '../src/types/entities'
import type { RunManifest } from './news-insights-run'
import { renderEdition, validateEdition, type InsightsEdition } from './render-news-insights'

const edition = { ...(yaml.load(readFileSync('data/news-insights/2026-10-13.yaml', 'utf8')) as InsightsEdition), reviewStatus: 'draft' as const }
const run = { runDate: edition.runDate, windowFrom: edition.windowFrom, windowTo: edition.windowTo,
  candidateNewsIds: edition.selectedNewsIds } as RunManifest
const graph = JSON.parse(readFileSync('public/graph.json', 'utf8')) as GraphData
const intel = JSON.parse(readFileSync('public/intelligence.json', 'utf8')) as { versions: { id: string }[] }
const versions = new Set(intel.versions.map(version => version.id))

test('draft rendering retains review scope, near-claim sources, contextual evidence routes and original Atlas capture', () => {
  const valid = validateEdition(edition, run, graph, versions)
  const { html, markdown, newsItem } = renderEdition(valid)
  assert.equal(newsItem.contentType, 'news-insights')
  assert.equal(newsItem.reviewStatus, 'draft')
  assert.equal(newsItem.publishedAt, '2026-10-13')
  assert.ok(html.includes('LOCAL DRAFT · Review pending'))
  assert.ok(html.includes('aria-label="Source 1"'))
  assert.ok(html.includes('<caption>Validation scope.'))
  assert.ok(html.includes('src="./figures/atlas-cardioguide.jpg"'))
  assert.ok(html.includes('mode=data&amp;version=ver-autus-size-adjustable'))
  assert.ok(html.includes('Atlas: Evolut lineage context'))
  assert.ok(html.includes('node=dig-cardioguide-hf&amp;jurisdiction=all&amp;condition=cond-hfpef'))
  assert.ok(!html.includes('<script'))
  assert.ok(markdown.includes('Evidence priorities for the next edition'))
  assert.ok(markdown.includes('pretraining corpus'))
  assert.ok(markdown.includes('[Data: AUTUS evidence](/?mode=data&version=ver-autus-size-adjustable'))
})

test('schema and semantic gates reject invalid review states, wrong windows, uncited facts, and bad identity/source routes', () => {
  const mutate = (change: (copy: InsightsEdition) => void) => { const copy = structuredClone(edition); change(copy); return copy }
  assert.throws(() => validateEdition({ ...edition, reviewStatus: 'unknown' }, run, graph, versions), /Invalid News Insights/)
  assert.throws(() => validateEdition({ ...edition, windowFrom: '2026-10-01' }, run, graph, versions), /frozen manual run/)
  assert.throws(() => validateEdition({ ...edition, selectedNewsIds: ['news-outside'] }, run, graph, versions), /outside frozen/)
  assert.throws(() => validateEdition({ ...edition, relevantNodeIds: ['unknown'] }, run, graph, versions), /Unknown graph/)
  assert.throws(() => validateEdition(mutate(e => e.closing!.role = 'insight'), run, graph, versions), /consequential next/)
  assert.throws(() => validateEdition(mutate(e => e.sections[0].paragraphs[0].sourceIds = ['missing']), run, graph, versions), /Unknown source/)
  assert.throws(() => validateEdition(mutate(e => e.sections[0].paragraphs[0].sourceIds = []), run, graph, versions), /Factual paragraphs/)
  assert.throws(() => validateEdition(mutate(e => e.sections[1].table!.rows[0].cells.pop()), run, graph, versions), /row\/column/)
  assert.throws(() => validateEdition(mutate(e => e.sections[0].paragraphs[0].contextLinks![0].versionId = 'ver-unverified'), run, graph, versions), /Unknown exact/)
  assert.throws(() => validateEdition(mutate(e => e.sections[1].table!.rows[0].contextLinks![0].nodeId = 'dev-unverified'), run, graph, versions), /Unknown graph context/)
  assert.throws(() => validateEdition(mutate(e => e.sections[2].atlasSnapshot!.conditionId = 'cond-unverified'), run, graph, versions), /Unknown snapshot/)
  assert.throws(() => validateEdition(mutate(e => e.sections[2].atlasSnapshot!.file = '../outside.jpg'), run, graph, versions), /Invalid News Insights/)
  assert.throws(() => validateEdition(mutate(e => { const url = new URL('https://example.org'); url.username = 'fixture'; url.password = 'fixture'; e.sources[0].url = url.href }), run, graph, versions), /Embedded credentials/)
})

test('source-derived text is escaped rather than executed in local previews', () => {
  const copy = structuredClone(edition)
  copy.opening[0].text = '<script>unsafe()</script> & original text'
  copy.sources[0].title = '<img src=x>'
  const { html } = renderEdition(validateEdition(copy, run, graph, versions))
  assert.ok(html.includes('&lt;script&gt;unsafe()&lt;/script&gt; &amp; original text'))
  assert.ok(!html.includes('<img src=x>'))
  assert.ok(!html.includes('<script>'))
})


test('reviewed rendering omits draft markers and local review navigation', () => {
  const approved = validateEdition({ ...edition, reviewStatus: 'reviewed' }, run, graph, versions)
  const { html, markdown, newsItem } = renderEdition(approved)
  assert.equal(newsItem.reviewStatus, 'reviewed')
  assert.ok(!html.includes('LOCAL DRAFT'))
  assert.ok(!html.includes('/review.html'))
  assert.ok(!html.includes('/template.html'))
  assert.ok(!html.includes('noindex'))
  assert.ok(!markdown.includes('LOCAL DRAFT'))
  assert.ok(html.includes('Full News window'))
})
