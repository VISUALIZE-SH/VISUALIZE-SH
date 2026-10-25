import assert from 'node:assert/strict'
import test from 'node:test'
import type { GraphData } from '../src/types/entities'
import type { IntelligenceData } from '../src/types/intelligence'
import { addGraphBibliography } from './intelligence/bibliography'

test('authored graph bibliography keeps exact scope and state while new therapies get draft records', () => {
  const data = {
    sources: [{ id: 'src-authored', title: 'Original document', url: 'https://example.org/original', kind: 'other', publisher: 'Example', retrievedAt: '2026-10-01', access: 'public' }],
    bibliography: ['reviewed', 'draft'].map(reviewStatus => ({
      id: `bib-graph-dev-${reviewStatus}`, entityIds: [`dev-${reviewStatus}`], versionIds: [], reviewStatus,
      sourceRefs: [{ sourceId: 'src-authored', locator: 'Original exact locator' }],
    })),
  } as unknown as IntelligenceData
  const graph = {
    elements: { nodes: ['reviewed', 'draft', 'new'].map(name => ({ data: { entity: {
      id: `dev-${name}`, type: 'therapy', name, curation: { lastUpdated: '2026-10-25', sources: [`https://example.org/${name}`] },
    } } })) }, news: [],
  } as unknown as GraphData
  const before = structuredClone(data)
  const compiled = addGraphBibliography(data, graph)
  assert.deepEqual(compiled.bibliography!.slice(0, 2), before.bibliography)
  assert.equal(compiled.bibliography!.filter(entry => entry.id === 'bib-graph-dev-reviewed').length, 1)
  assert.equal(compiled.bibliography!.find(entry => entry.id === 'bib-graph-dev-new')!.reviewStatus, 'draft')
  assert.ok(compiled.sources.some(source => source.url === 'https://example.org/new'))
  assert.ok(!compiled.sources.some(source => ['https://example.org/reviewed', 'https://example.org/draft'].includes(source.url)))
  assert.equal(new Set(compiled.sources.map(source => source.id)).size, compiled.sources.length)
  assert.deepEqual(addGraphBibliography(compiled, graph), compiled)
  assert.deepEqual(data, before)
})
