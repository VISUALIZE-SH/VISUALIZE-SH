import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { GraphData } from '../src/types/entities'
import type { IntelligenceData, SourceDocument } from '../src/types/intelligence'
import { canonicalReferenceUrl, formatApaReference, referencesFor, referencesToApaHtml } from '../src/data/references'
import { addGraphBibliography } from './intelligence/bibliography'

const source = (id: string, kind: SourceDocument['kind'] = 'other', url = `https://example.org/${id}`): SourceDocument => ({ id, kind, url, title: id, publisher: 'Example', retrievedAt: '2026-10-04', access: 'public' })
const provenance = (sourceId: string, locator = 'Section 1') => ({ sourceRefs: [{ sourceId, locator }], reviewStatus: 'draft' as const })
function fixture(): IntelligenceData {
  return {
    schemaVersion: 1, updatedAt: '2026-10-04', coverage: { title: 'Test', description: 'Test' },
    sources: [source('src-design'), source('src-design-duplicate', 'other', 'https://example.org/src-design/#figure'), source('src-registry', 'registry'), source('src-paper', 'publication'), source('src-endpoint'), source('src-sibling'), source('src-marking', 'manufacturer'), { ...source('src-patent', 'patent'), publishedAt: { value: '2020', precision: 'year' }, citation: { authors: ['Inventor, A.'], patentNumber: 'U.S. Patent No. 10,000,001', patentOffice: 'U.S. Patent and Trademark Office' } }],
    families: [{ id: 'family-one', name: 'Product', manufacturer: 'Example', entityIds: ['dev-one', 'dev-two'], conditionIds: [], description: 'Test' }],
    versions: [{ id: 'ver-one', graphEntityId: 'dev-one', familyId: 'family-one', name: 'One', kind: 'device', clinicalRole: 'treats', summary: 'Test', ...provenance('src-design') }, { id: 'ver-two', graphEntityId: 'dev-two', familyId: 'family-one', name: 'Two', kind: 'device', clinicalRole: 'treats', summary: 'Test', ...provenance('src-sibling') }],
    claims: [{ id: 'claim-one', versionId: 'ver-one', category: 'design', key: 'material', label: 'Material', value: 'Nitinol', availability: 'reported', basis: 'directly_reported', observedAt: '2026-10-04', ...provenance('src-design-duplicate', 'Table 2') }],
    bibliography: [{ id: 'bib-patent', entityIds: ['dev-one'], versionIds: ['ver-two'], ...provenance('src-patent'), patentConnection: { sourceId: 'src-marking', locator: 'Product Two row', statement: 'Product Two is explicitly listed.' } }],
    trials: [{ id: 'trial-one', familyIds: ['family-one'], versionIds: [], versionMapping: 'unclear', name: 'Family trial', design: 'Test', population: 'Test', ...provenance('src-registry') }],
    readouts: [{ id: 'readout-one', trialId: 'trial-one', cohortId: 'cohort-one', versionIds: [], title: 'Test', publishedAt: { value: '2026', precision: 'year' }, followUp: '1 year', maturity: 'primary', ...provenance('src-paper') }, { id: 'readout-sibling', trialId: 'trial-one', cohortId: 'cohort-one', versionIds: ['ver-two'], title: 'Sibling', publishedAt: { value: '2026', precision: 'year' }, followUp: '1 year', maturity: 'primary', ...provenance('src-sibling') }],
    outcomes: [{ id: 'outcome-one', readoutId: 'readout-one', endpointId: 'endpoint-one', arms: [], interpretation: 'Test', ...provenance('src-paper') }],
    endpoints: [{ id: 'endpoint-one', name: 'Endpoint', definition: 'Test', hierarchy: 'primary', measureType: 'binary', timeframe: 'One year', analysisPopulation: 'ITT', ...provenance('src-endpoint') }],
    decisions: [], indications: [], lineage: [], events: [], trialSnapshots: [], cohorts: [], media: [],
  }
}

test('consolidates repeated documents, every locator, and family clinical references', () => {
  const references = referencesFor(fixture(), { versionId: 'ver-one' })
  assert.deepEqual(references.map(item => item.source.id).sort(), ['src-design', 'src-endpoint', 'src-paper', 'src-registry'])
  const design = references.find(item => item.source.id === 'src-design')!
  assert.deepEqual(design.locators, ['Section 1', 'Table 2'])
  assert.deepEqual(design.contexts, ['Product version', 'Design'])
  assert.ok(references.find(item => item.source.id === 'src-paper')!.contexts.includes('Family readout; exact version unresolved'))
})

test('patents require a valid direct connection and respect explicit version mappings', () => {
  const data = fixture()
  assert.ok(!referencesFor(data, { versionId: 'ver-one' }).some(item => item.category === 'Patents'))
  const patent = referencesFor(data, { versionId: 'ver-two' }).find(item => item.category === 'Patents')!
  assert.equal(patent.connections[0].locator, 'Product Two row')
  delete data.bibliography![0].patentConnection
  assert.ok(!referencesFor(data, { versionId: 'ver-two' }).some(item => item.category === 'Patents'))
  data.bibliography![0].patentConnection = { sourceId: 'src-patent', locator: 'Patent', statement: 'Same subject alone is insufficient.' }
  assert.ok(!referencesFor(data, { versionId: 'ver-two' }).some(item => item.category === 'Patents'))
})

test('APA article export uses verified author, journal, date and DOI metadata', () => {
  const article: SourceDocument = { ...source('paper', 'publication'), title: 'Clinical outcomes', publishedAt: { value: '2023-05-01', precision: 'day' }, citation: { authors: ['Smith, A. B.', 'Jones, C.'], containerTitle: 'Journal of Medicine', volume: '12', issue: '3', pages: '20-29', doi: '10.1000/example' } }
  assert.equal(formatApaReference(article), 'Smith, A. B., & Jones, C. (2023). Clinical outcomes. Journal of Medicine, 12(3), 20–29. https://doi.org/10.1000/example')
  const withoutMetadata = source('paper', 'publication')
  assert.match(formatApaReference(withoutMetadata), /^paper\. \(n\.d\.\)\. Example\./)
  assert.ok(!formatApaReference(withoutMetadata).includes('2026'))
  const patent = fixture().sources.find(item => item.kind === 'patent')!
  assert.match(formatApaReference(patent), /^Inventor, A\. \(2020\)\. src-patent \(U\.S\. Patent No\. 10,000,001\)\. U\.S\. Patent and Trademark Office\./)
})

test('portable APA export retains italics, hanging indents, all references, and escapes source text', () => {
  const data = fixture()
  data.sources[0].title = '<script>unsafe & title</script>'
  const references = referencesFor(data, { versionId: 'ver-one' })
  const html = referencesToApaHtml(references, '<Product>')
  assert.equal((html.match(/class="reference"/g) ?? []).length, references.length)
  assert.match(html, /text-indent:-\.5in/)
  assert.match(html, /&lt;script&gt;unsafe &amp; title&lt;\/script&gt;/)
  assert.ok(!html.includes('<script>'))
  assert.match(html, /<i>\s*Example<\/i>/)
})

test('APA 7 preserves up to twenty authors and truncates longer lists correctly', () => {
  const authors = Array.from({ length: 21 }, (_, i) => `Author${i + 1}, A.`)
  const article = { ...source('paper', 'publication'), citation: { authors } }
  const result = formatApaReference(article)
  assert.match(result, /Author19, A\., … Author21, A\./)
  assert.ok(!result.includes('Author20'))
  article.citation.authors = authors.slice(0, 20)
  assert.match(formatApaReference(article), /Author19, A\., & Author20, A\./)
})

test('APA expands abbreviated page ranges and keeps dates and author order precise', () => {
  const article = { ...source('paper', 'publication'), citation: { pages: '1002-9, 1009.e1; 1036-42; 1999-02' } }
  assert.match(formatApaReference(article), /1002–1009, 1009.e1; 1036–1042; 1999–2002/)
  const records: SourceDocument[] = [
    { ...source('z'), title: 'Zeta', publishedAt: { value: '2026-01-01', precision: 'day' } },
    { ...source('a'), title: 'Alpha', publishedAt: { value: '2026-01-01', precision: 'day' } },
    { ...source('joint', 'publication'), publishedAt: { value: '2020', precision: 'year' }, citation: { authors: ['Smith, A.', 'Jones, B.'] } },
    { ...source('solo', 'publication'), publishedAt: { value: '2025', precision: 'year' }, citation: { authors: ['Smith, A.'] } },
  ]
  const html = referencesToApaHtml(records.map(source => ({ source, category: 'Other sources', locators: [], contexts: [], connections: [] })), 'Test')
  assert.match(html, /\(2026a, January 1\)/)
  assert.match(html, /\(2026b, January 1\)/)
  assert.ok(html.indexOf('Smith, A. (2025)') < html.indexOf('Smith, A., &amp; Jones, B. (2020)'))
})

test('APA disambiguates the same author and year across dates in chronological order', () => {
  const records: SourceDocument[] = [
    { ...source('february'), title: 'An early alphabetic title', publishedAt: { value: '2026-02-01', precision: 'day' } },
    { ...source('january-z'), title: 'Zeta', publishedAt: { value: '2026-01-01', precision: 'day' } },
    { ...source('january-a'), title: 'The Alpha report', publishedAt: { value: '2026-01-01', precision: 'day' } },
    { ...source('year'), title: 'Year report', publishedAt: { value: '2026', precision: 'year' } },
    { ...source('older'), title: 'Older report', publishedAt: { value: '2025', precision: 'year' } },
  ]
  const html = referencesToApaHtml(records.map(source => ({ source, category: 'Other sources', locators: [], contexts: [], connections: [] })), 'Test')
  assert.match(html, /\(2025\)\. <i>Older report/)
  assert.match(html, /\(2026a\)\. <i>Year report/)
  assert.match(html, /\(2026b, January 1\)\. <i>The Alpha report/)
  assert.match(html, /\(2026c, January 1\)\. <i>Zeta/)
  assert.match(html, /\(2026d, February 1\)\. <i>An early alphabetic title/)
  assert.ok(html.indexOf('Year report') < html.indexOf('The Alpha report'))
  assert.ok(html.indexOf('The Alpha report') < html.indexOf('Zeta'))
  assert.ok(html.indexOf('Zeta') < html.indexOf('An early alphabetic title'))
})

test('the researched patent markings stay with the named WATCHMAN generations', () => {
  const data = JSON.parse(readFileSync('public/intelligence.json', 'utf8')) as IntelligenceData
  const patents = (versionId: string) => referencesFor(data, { versionId }).filter(item => item.category === 'Patents')
  assert.equal(patents('ver-watchman-flx').length, 6)
  assert.equal(patents('ver-watchman-flx-pro').length, 7)
  assert.equal(patents('ver-watchman-original').length, 0)
  assert.equal(patents('ver-watchman-flx-2015').length, 0)
  assert.equal(patents('ver-amulet').length, 17)
  assert.ok(patents('ver-watchman-flx-pro').every(item => item.connections.length > 0))
})

test('citation identity normalizes registry aliases and DOI capitalization', () => {
  assert.equal(canonicalReferenceUrl('https://clinicaltrials.gov/ct2/show/NCT00000001?utm_source=test'), canonicalReferenceUrl('https://clinicaltrials.gov/study/NCT00000001'))
  assert.equal(canonicalReferenceUrl('https://dx.doi.org/10.1000/EXAMPLE'), canonicalReferenceUrl('https://doi.org/10.1000/example'))
})

test('graph compilation gives every therapy its existing links, trial references and news sources', () => {
  const graph = JSON.parse(readFileSync('public/graph.json', 'utf8')) as GraphData
  const data = JSON.parse(readFileSync('public/intelligence.json', 'utf8')) as IntelligenceData
  const compiled = addGraphBibliography({ ...data, bibliography: [] }, graph)
  for (const { data: node } of graph.elements.nodes.filter(node => node.data.entity.type === 'therapy')) {
    assert.ok(compiled.bibliography?.some(entry => entry.entityIds.includes(node.id)), node.id)
    assert.ok(referencesFor(compiled, { entityId: node.id }).length > 0, node.id)
  }
  const watchman = referencesFor(compiled, { entityId: 'dev-watchman-flx' })
  assert.ok(watchman.some(item => new URL(item.source.url).hostname === 'clinicaltrials.gov'))
  assert.ok(watchman.some(item => item.contexts.some(context => context.includes('Clinical'))))
  const evolut = referencesFor(compiled, { entityId: 'dev-evolut' })
  assert.ok(evolut.some(item => item.source.citation?.doi === '10.1016/j.jacc.2026.02.5063'))
})

test('source attribution distinguishes FDA and publication domains from lookalike hosts', () => {
  const graph = JSON.parse(readFileSync('public/graph.json', 'utf8')) as GraphData
  const node = graph.elements.nodes.find(node => node.data.entity.type === 'therapy')!
  assert.ok(node.data.entity.type === 'therapy')
  const urls = ['https://fda.gov/document', 'https://www.accessdata.fda.gov/document', 'https://notfda.gov/document', 'https://fda.gov.example.org/document', 'https://www.nejm.org/doi/10.1000/example', 'https://notnejm.org/document', 'https://nejm.org.example.org/document']
  node.data.entity = { ...node.data.entity, curation: { ...node.data.entity.curation, sources: urls }, links: undefined, timeline: undefined, materials: undefined }
  const data = addGraphBibliography(fixture(), { ...graph, elements: { ...graph.elements, nodes: [node] }, news: [] })
  for (const url of urls.slice(0, 2)) {
    const source = data.sources.find(source => source.url === url)!
    assert.equal(source.kind, 'regulatory')
    assert.equal(source.publisher, 'U.S. Food and Drug Administration')
  }
  assert.equal(data.sources.find(source => source.url === urls[4])!.kind, 'publication')
  for (const url of [...urls.slice(2, 4), ...urls.slice(5)]) {
    const source = data.sources.find(source => source.url === url)!
    assert.equal(source.kind, 'other')
    assert.notEqual(source.publisher, 'U.S. Food and Drug Administration')
  }
})
