import { createHash } from 'node:crypto'
import type { GraphData, InfoLink, Therapy, Trial } from '../../src/types/entities'
import type { CitationMetadata, EvidenceDate, IntelligenceData, SourceDocument, SourceRef } from '../../src/types/intelligence'
import { canonicalReferenceUrl, isPatentSource, referenceUrl } from '../../src/data/references'

export interface CitationOverride {
  url: string
  title?: string
  publishedAt?: EvidenceDate
  citation: CitationMetadata
}

function inferredKind(url: string): SourceDocument['kind'] {
  const host = new URL(url).hostname
  if (host === 'clinicaltrials.gov') return 'registry'
  if (/^(?:pubmed|pmc)\.ncbi\.nlm\.nih\.gov$|doi\.org$|nejm\.org$|jacc\.org$|sciencedirect\.com$|nature\.com$|eurointervention\.pcronline\.com$|frontiersin\.org$|academic\.oup\.com$|ahajournals\.org$|jamanetwork\.com$/.test(host)) return 'publication'
  if (host.endsWith('fda.gov') || host === 'dailymed.nlm.nih.gov') return 'regulatory'
  return 'other'
}

/** Keep graph/trial/news references available even when no detailed product version exists. */
export function addGraphBibliography(data: IntelligenceData, graph: GraphData): IntelligenceData {
  // Some legacy import/review callers supply an ID-only graph crosswalk.
  if (!Array.isArray(graph.elements?.nodes)) return data
  const sources = [...data.sources]
  const bibliography = [...(data.bibliography ?? [])]
  const sourceIndex = new Map(sources.map(source => [canonicalReferenceUrl(source.url), source]))
  const entities = graph.elements.nodes.map(node => node.data.entity)
  const trials = entities.filter((entity): entity is Trial => entity.type === 'trial')
  const manufacturerHosts = new Map(entities.filter((entity): entity is Therapy => entity.type === 'therapy').flatMap(therapy => {
    const maker = entities.find(entity => entity.id === therapy.company)?.name
    return maker ? (therapy.links ?? []).filter(link => /product|manufacturer|official|company/i.test(link.label) && inferredKind(link.url) === 'other').map(link => [new URL(link.url).hostname.replace(/^www\./, ''), maker] as const) : []
  }))
  const add = (raw: string, label: string | undefined, locator: string, refs: SourceRef[], retrievedAt: string, kind?: SourceDocument['kind'], publisher?: string) => {
    const url = referenceUrl(raw)
    if (!url || isPatentSource({ kind: kind ?? 'other', url })) return
    const key = canonicalReferenceUrl(url)
    let source = sourceIndex.get(key)
    if (!source) {
      const host = new URL(url).hostname.replace(/^www\./, '')
      const documentName = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() ?? '')
      source = {
        id: `src-graph-${createHash('sha256').update(key).digest('hex').slice(0, 16)}`,
        title: label ?? `[Source document: ${host}${documentName ? `, ${documentName}` : ''}]`,
        url,
        kind: inferredKind(url) === 'other' ? kind ?? (manufacturerHosts.has(host) ? 'manufacturer' : 'other') : inferredKind(url),
        publisher: host.endsWith('fda.gov') ? 'U.S. Food and Drug Administration' : host === 'clinicaltrials.gov' ? 'ClinicalTrials.gov' : publisher ?? manufacturerHosts.get(host) ?? host,
        retrievedAt,
        access: 'public',
      }
      sources.push(source)
      sourceIndex.set(key, source)
    }
    if (!refs.some(ref => ref.sourceId === source!.id && ref.locator === locator)) refs.push({ sourceId: source.id, locator })
  }
  const links = (items: InfoLink[] | undefined, name: string, locator: string, refs: SourceRef[], retrievedAt: string, publisher?: string) => {
    for (const link of items ?? []) add(link.url, `${name}: ${link.label}`, locator, refs, retrievedAt, /product|manufacturer|official/i.test(link.label) ? 'manufacturer' : undefined, publisher)
  }
  for (const therapy of entities.filter((entity): entity is Therapy => entity.type === 'therapy')) {
    const refs: SourceRef[] = []
    const maker = entities.find(entity => entity.id === therapy.company)?.name
    const retrievedAt = therapy.curation.lastUpdated
    links(therapy.links, therapy.name, 'Therapy information links', refs, retrievedAt, maker)
    for (const url of therapy.curation.sources ?? []) add(url, undefined, 'Therapy research sources', refs, retrievedAt)
    for (const material of therapy.materials ?? []) add(material.source, undefined, `Materials: ${material.name} — ${material.role}`, refs, retrievedAt)
    if (therapy.timeline?.source) add(therapy.timeline.source, undefined, `Timeline: ${therapy.timeline.event}`, refs, retrievedAt)
    for (const trial of trials.filter(trial => trial.therapies.includes(therapy.id))) {
      if (trial.nctId) add(`https://clinicaltrials.gov/study/${trial.nctId}`, `${trial.name} (${trial.nctId})`, `Related trial: ${trial.name}`, refs, trial.curation.lastUpdated)
      for (const url of [...(trial.references ?? []), ...(trial.curation.sources ?? [])]) add(url, undefined, `Related trial: ${trial.name}`, refs, trial.curation.lastUpdated)
      links(trial.links, trial.name, `Related trial: ${trial.name}`, refs, trial.curation.lastUpdated)
      if (trial.timeline?.source) add(trial.timeline.source, undefined, `Related trial timeline: ${trial.name}`, refs, trial.curation.lastUpdated)
    }
    for (const news of graph.news.filter(news => news.relevantNodeIds.includes(therapy.id))) {
      add(news.sourceUrl, news.title, `News: ${news.title}`, refs, news.publishedAt, 'other', news.sourceName)
      links(news.additionalSources, news.title, `Related news: ${news.title}`, refs, news.publishedAt)
    }
    if (refs.length) bibliography.push({ id: `bib-graph-${therapy.id}`, entityIds: [therapy.id], versionIds: [], sourceRefs: refs, reviewStatus: 'draft' })
  }
  // Configuration sources use direct URLs rather than source IDs in the authored dataset.
  for (const observation of data.comparative?.observations ?? []) add(observation.provenance.url, undefined, observation.provenance.locator, [], observation.provenance.extracted_on, 'technical')
  return { ...data, sources, bibliography }
}

export function applyCitationOverrides(data: IntelligenceData, overrides: CitationOverride[]): IntelligenceData {
  const byUrl = new Map(overrides.map(item => [canonicalReferenceUrl(item.url), item]))
  return { ...data, sources: data.sources.map(source => {
    const item = byUrl.get(canonicalReferenceUrl(source.url))
    if (!item) return source
    return { ...source, ...(item.title ? { title: item.title } : {}), ...(item.publishedAt ? { publishedAt: item.publishedAt } : {}), citation: { ...source.citation, ...item.citation } }
  }) }
}
