import type { BibliographyEntry, IntelligenceData, SourceDocument, SourceRef } from '../types/intelligence'

export const REFERENCE_CATEGORIES = ['Clinical data', 'Publications', 'Patents', 'Regulatory documents', 'Product & technical sources', 'Other sources'] as const
export type ReferenceCategory = typeof REFERENCE_CATEGORIES[number]
export interface CollectedReference {
  source: SourceDocument
  category: ReferenceCategory
  locators: string[]
  contexts: string[]
  connections: Array<{ source: SourceDocument; locator: string; statement: string }>
}

/** Normalize only identifiers and URL syntax; distinct documents remain distinct. */
export function referenceUrl(value: string): string | undefined {
  const raw = value.startsWith('PMID:') ? `https://pubmed.ncbi.nlm.nih.gov/${value.slice(5).trim()}/` : value
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined
  } catch { return undefined }
}

export function canonicalReferenceUrl(value: string): string {
  const url = new URL(value)
  url.hash = ''
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key)
  url.searchParams.sort()
  if (url.hostname === 'dx.doi.org') url.hostname = 'doi.org'
  if (url.hostname === 'doi.org') url.pathname = url.pathname.toLowerCase()
  if (url.hostname === 'clinicaltrials.gov') {
    const nct = /NCT\d{8}/i.exec(url.pathname)?.[0]
    if (nct) { url.pathname = `/study/${nct.toUpperCase()}`; url.search = '' }
  }
  return url.href.replace(/\/$/, '')
}

export function isPatentSource(source: Pick<SourceDocument, 'kind' | 'url'>): boolean {
  return source.kind === 'patent' || /(?:patents\.google\.com\/patent\/|patentscope\.wipo\.int|patentcenter\.uspto\.gov|ppubs\.uspto\.gov)/i.test(source.url)
}

export function referenceCategory(source: SourceDocument): ReferenceCategory {
  if (isPatentSource(source)) return 'Patents'
  if (source.kind === 'registry') return 'Clinical data'
  if (source.kind === 'publication') return 'Publications'
  if (source.kind === 'regulatory') return 'Regulatory documents'
  if (source.kind === 'manufacturer' || source.kind === 'technical') return 'Product & technical sources'
  return 'Other sources'
}

function documentKey(source: SourceDocument): string {
  const doi = source.citation?.doi?.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
  return doi ? `doi:${doi.toLowerCase()}` : canonicalReferenceUrl(source.url)
}

function metadataScore(source: SourceDocument): number {
  return (source.citation?.authors?.length ? 10 : 0) + Object.keys(source.citation ?? {}).length + (source.publishedAt ? 2 : 0) + (source.id.startsWith('src-graph-') ? 0 : 1)
}

/** Collect every linked record, including family trial context, without borrowing sibling generations. */
export function referencesFor(data: IntelligenceData, selection: { versionId?: string; entityId?: string }): CollectedReference[] {
  const selectedVersions = data.versions.filter(version => selection.versionId ? version.id === selection.versionId : selection.entityId && (
    version.graphEntityId === selection.entityId || (!version.graphEntityId && data.families.find(family => family.id === version.familyId)?.entityIds.length === 1 && data.families.find(family => family.id === version.familyId)?.entityIds[0] === selection.entityId)
  ))
  const versionIds = new Set(selectedVersions.map(version => version.id))
  const familyIds = new Set(selectedVersions.map(version => version.familyId))
  const entityIds = new Set(selection.entityId ? [selection.entityId] : selectedVersions.flatMap(version => {
    const family = data.families.find(item => item.id === version.familyId)
    return version.graphEntityId ? [version.graphEntityId] : family?.entityIds.length === 1 ? family.entityIds : []
  }))
  const sourceIndex = new Map(data.sources.map(source => [source.id, source]))
  const matchedEntries = (data.bibliography ?? []).filter(entry => selection.versionId && entry.versionIds.length
    ? entry.versionIds.some(id => versionIds.has(id))
    : entry.entityIds.some(id => entityIds.has(id)) || entry.versionIds.some(id => versionIds.has(id)))
  const validConnection = (entry: BibliographyEntry) => {
    const source = entry.patentConnection && sourceIndex.get(entry.patentConnection.sourceId)
    return source && source.access === 'public' && !isPatentSource(source) && entry.patentConnection?.statement.trim() ? source : undefined
  }
  const allowedPatents = new Set(matchedEntries.filter(entry => validConnection(entry)).flatMap(entry => entry.sourceRefs.map(ref => ref.sourceId)))
  const collected = new Map<string, CollectedReference>()
  const byUrl = new Map<string, string>()
  const add = (refs: SourceRef[], context: string) => {
    for (const ref of refs) {
      const source = sourceIndex.get(ref.sourceId)
      if (!source || (isPatentSource(source) && !allowedPatents.has(source.id))) continue
      const urlKey = canonicalReferenceUrl(source.url)
      const key = byUrl.get(urlKey) ?? documentKey(source)
      const prior = collected.get(key)
      const item = prior ?? { source, category: referenceCategory(source), locators: [], contexts: [], connections: [] }
      if (prior && metadataScore(source) > metadataScore(prior.source)) { item.source = source; item.category = referenceCategory(source) }
      if (!item.locators.includes(ref.locator)) item.locators.push(ref.locator)
      if (!item.contexts.includes(context)) item.contexts.push(context)
      collected.set(key, item)
      byUrl.set(urlKey, key)
    }
  }
  for (const version of selectedVersions) add(version.sourceRefs, 'Product version')
  for (const claim of data.claims.filter(item => versionIds.has(item.versionId))) add(claim.sourceRefs, claim.category === 'evidence' ? 'Clinical evidence' : claim.category === 'digital' ? 'Design' : `${claim.category[0].toUpperCase()}${claim.category.slice(1)}`)
  const decisions = data.decisions.filter(item => item.versionIds.some(id => versionIds.has(id)))
  const decisionIds = new Set(decisions.map(item => item.id))
  for (const item of decisions) add(item.sourceRefs, 'Regulatory history')
  for (const item of data.indications.filter(item => item.versionIds.some(id => versionIds.has(id)))) add(item.sourceRefs, 'Indications')
  for (const item of data.lineage.filter(item => versionIds.has(item.fromVersionId) || versionIds.has(item.toVersionId))) add(item.sourceRefs, 'Product lineage')
  for (const item of (data.media ?? []).filter(item => item.versionIds.some(id => versionIds.has(id)))) add(item.sourceRefs, 'Figures')
  const trials = data.trials.filter(item => item.versionIds.some(id => versionIds.has(id)) || item.familyIds?.some(id => familyIds.has(id)))
  const trialIds = new Set(trials.map(item => item.id))
  for (const trial of trials) add(trial.sourceRefs, trial.versionIds.some(id => versionIds.has(id)) ? 'Clinical trial' : 'Family trial; exact version unresolved')
  for (const item of data.trialSnapshots.filter(item => trialIds.has(item.trialId))) add(item.sourceRefs, 'Trial registry snapshot')
  for (const item of data.cohorts.filter(item => trialIds.has(item.trialId))) add(item.sourceRefs, 'Trial cohort')
  const readouts = data.readouts.filter(item => item.versionIds.length ? item.versionIds.some(id => versionIds.has(id)) : trialIds.has(item.trialId))
  const readoutIds = new Set(readouts.map(item => item.id))
  for (const item of readouts) add(item.sourceRefs, item.versionIds.length ? 'Clinical readout' : 'Family readout; exact version unresolved')
  const outcomes = data.outcomes.filter(item => readoutIds.has(item.readoutId))
  const endpointIds = new Set(outcomes.map(item => item.endpointId))
  for (const item of outcomes) add(item.sourceRefs, 'Clinical outcomes')
  for (const item of data.endpoints.filter(item => endpointIds.has(item.id))) add(item.sourceRefs, 'Endpoint definition')
  for (const item of data.events.filter(item => item.versionIds.some(id => versionIds.has(id)) || item.decisionIds.some(id => decisionIds.has(id)) || item.readoutIds.some(id => readoutIds.has(id)))) add(item.sourceRefs, 'History')
  const configurationIds = new Set(data.comparative?.device_configurations.filter(item => versionIds.has(item.product_version_id)).map(item => item.configuration_id) ?? [])
  for (const item of data.comparative?.observations ?? []) {
    if (!configurationIds.has(item.configuration_id)) continue
    const source = data.sources.find(source => canonicalReferenceUrl(source.url) === canonicalReferenceUrl(item.provenance.url))
    if (source) add([{ sourceId: source.id, locator: item.provenance.locator }], 'Configuration measurements')
  }
  for (const entry of matchedEntries) {
    add(entry.sourceRefs, entry.versionIds.length ? 'Additional version references' : selection.versionId ? 'Therapy / family references' : 'Therapy references')
    const connectionSource = validConnection(entry)
    if (connectionSource && entry.patentConnection) {
      add([entry.patentConnection], 'Patent connection')
      for (const ref of entry.sourceRefs) {
        const source = sourceIndex.get(ref.sourceId)
        if (!source || !isPatentSource(source)) continue
        const item = collected.get(byUrl.get(canonicalReferenceUrl(source.url)) ?? documentKey(source))
        if (item && !item.connections.some(connection => connection.source.id === connectionSource.id && connection.statement === entry.patentConnection?.statement)) item.connections.push({ source: connectionSource, locator: entry.patentConnection.locator, statement: entry.patentConnection.statement })
      }
    }
  }
  return [...collected.values()].sort((a, b) => a.source.title.localeCompare(b.source.title))
}

interface CitationPart { text: string; italic?: boolean }
function authorList(authors: string[]): string {
  if (authors.length > 20) return `${authors.slice(0, 19).join(', ')}, … ${authors[authors.length - 1]}`
  if (authors.length < 2) return authors[0] ?? ''
  return `${authors.slice(0, -1).join(', ')}, & ${authors[authors.length - 1]}`
}
const period = (text: string) => /[.!?]$/.test(text) ? text : `${text}.`
function pageRange(pages: string): string {
  return pages.replace(/\b(\d+)[-–](\d+)\b/g, (_, first: string, last: string) => {
    let end = last
    if (last.length < first.length) {
      const candidate = Number(`${first.slice(0, -last.length)}${last}`)
      end = String(candidate < Number(first) ? candidate + 10 ** last.length : candidate)
    }
    return `${first}–${end}`
  })
}
function apaParts(source: SourceDocument, suffix = ''): CitationPart[] {
  const citation = source.citation
  const isArticle = source.kind === 'publication'
  const author = citation?.authors?.length ? authorList(citation.authors) : isArticle || isPatentSource(source) ? '' : source.publisher
  let date = `${source.publishedAt?.value.slice(0, 4) ?? 'n.d.'}${suffix}`
  if (!isArticle && source.kind !== 'patent' && source.publishedAt && source.publishedAt.precision !== 'year') {
    const [year, month, day] = source.publishedAt.value.split('-').map(Number)
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)))
    date = `${year}${suffix}, ${monthName}${day ? ` ${day}` : ''}`
  }
  const title = source.title.replace(/[.]$/, '')
  const titleParts: CitationPart[] = [{ text: title, italic: !isArticle }]
  if (source.kind === 'patent') titleParts.push({ text: ` (${citation?.patentNumber ?? source.identifier ?? 'Patent'})` })
  titleParts.push({ text: '.' })
  const parts: CitationPart[] = author
    ? [{ text: `${period(author)} (${date}). ` }, ...titleParts]
    : [...titleParts, { text: ` (${date}).` }]
  if (isArticle) {
    const container = citation?.containerTitle ?? source.publisher
    parts.push({ text: ` ${container}${citation?.volume ? `, ${citation.volume}` : ''}`, italic: true })
    if (citation?.issue) parts.push({ text: `(${citation.issue})` })
    if (citation?.pages) parts.push({ text: `, ${pageRange(citation.pages)}` })
    parts.push({ text: '.' })
  } else if (source.kind === 'patent') parts.push({ text: ` ${period(citation?.patentOffice ?? source.publisher)}` })
  else if (author !== source.publisher) parts.push({ text: ` ${period(source.publisher)}` })
  const doi = citation?.doi?.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
  let link = doi ? `https://doi.org/${doi}` : source.url
  if (source.kind === 'registry') {
    const retrieved = new Date(`${source.retrievedAt.slice(0, 10)}T00:00:00Z`)
    const label = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }).format(retrieved)
    link = `Retrieved ${label}, from ${link}`
  }
  parts.push({ text: ` ${link}` })
  return parts
}

export function formatApaReference(source: SourceDocument): string { return apaParts(source).map(part => part.text).join('') }
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** A portable, printable APA list with italics, double spacing, and hanging indents. */
export function referencesToApaHtml(references: CollectedReference[], name: string): string {
  const sorted = [...references].sort((a, b) => {
    const author = (source: SourceDocument) => source.citation?.authors?.join(' | ') ?? (source.kind === 'publication' || source.kind === 'patent' ? source.title : source.publisher)
    return author(a.source).localeCompare(author(b.source)) || apaDateKey(a.source).localeCompare(apaDateKey(b.source)) || a.source.title.localeCompare(b.source.title)
  })
  const dateGroups = new Map<string, number>()
  function apaDateKey(source: SourceDocument): string { return (source.kind === 'publication' || source.kind === 'patent' ? source.publishedAt?.value.slice(0, 4) : source.publishedAt?.value) ?? '' }
  const groupKey = (source: SourceDocument) => `${source.citation?.authors?.join('|') ?? (source.kind === 'publication' || source.kind === 'patent' ? source.title : source.publisher)}|${apaDateKey(source) || 'n.d.'}`
  for (const item of sorted) dateGroups.set(groupKey(item.source), (dateGroups.get(groupKey(item.source)) ?? 0) + 1)
  const offsets = new Map<string, number>()
  const entries = sorted.map(({ source }) => {
    const key = groupKey(source)
    const index = offsets.get(key) ?? 0
    offsets.set(key, index + 1)
    const letters = (value: number): string => value < 26 ? String.fromCharCode(97 + value) : `${letters(Math.floor(value / 26) - 1)}${letters(value % 26)}`
    const suffix = (dateGroups.get(key) ?? 0) > 1 ? `${source.publishedAt ? '' : '-'}${letters(index)}` : ''
    return `<p class="reference">${apaParts(source, suffix).map(part => part.italic ? `<i>${escapeHtml(part.text)}</i>` : escapeHtml(part.text)).join('')}</p>`
  }).join('\n')
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(name)} — References</title><style>body{max-width:48rem;margin:3rem auto;padding:0 2rem;font:12pt/2 "Times New Roman",serif;color:#171717}h1{text-align:center;font-size:12pt}.context{text-align:center}.reference{padding-left:.5in;text-indent:-.5in;margin:0;overflow-wrap:anywhere}@media print{body{margin:0;max-width:none}}</style></head><body><p class="context">${escapeHtml(name)}</p><h1>References</h1>\n${entries}\n</body></html>\n`
}
