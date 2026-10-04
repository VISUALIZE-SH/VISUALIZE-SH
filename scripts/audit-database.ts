/** Inventory every authored record and expose evidence/completeness gaps for curator review.
 * This is an offline structural audit, not a claim that linked web pages were reverified.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import { defaultIntelligencePaths, loadIntelligenceSource } from './intelligence/catalog'

type Row = Record<string, unknown>
export interface AuditSource { url: string; locator?: string; sourceId?: string }
export interface AuditRecord {
  id: string
  collection: string
  file: string
  reviewStatus?: string
  sources: AuditSource[]
  gaps: string[]
}
export interface DatabaseAudit {
  date: string
  scope: string
  limitations: string[]
  counts: Record<string, number>
  gapCounts: Record<string, number>
  records: AuditRecord[]
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const array = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : []
const row = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
const empty = (value: unknown): boolean => value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? filesBelow(path) : /\.ya?ml$/.test(entry.name) ? [path] : []
  }).sort()
}

function load(path: string): unknown { return yaml.load(readFileSync(path, 'utf8'), { schema: yaml.CORE_SCHEMA }) }

/** Collect actual evidence fields; a company homepage is not automatically proof of every fact. */
export function legacySources(record: Row): AuditSource[] {
  const urls = new Set<string>()
  for (const value of [...strings(row(record.curation).sources), ...strings(record.references)]) {
    if (/^https:\/\//.test(value)) urls.add(value)
    else if (/^PMID:\d+$/.test(value)) urls.add(`https://pubmed.ncbi.nlm.nih.gov/${value.slice(5)}/`)
  }
  for (const material of array(record.materials)) if (typeof material.source === 'string') urls.add(material.source)
  for (const link of array(record.links)) if (typeof link.url === 'string') urls.add(link.url)
  for (const source of array(record.additionalSources)) if (typeof source.url === 'string') urls.add(source.url)
  for (const value of [row(record.timeline).source, record.sourceUrl]) if (typeof value === 'string') urls.add(value)
  return [...urls].sort().map(url => ({ url }))
}

export function legacyGaps(record: Row): string[] {
  const gaps: string[] = []
  if (!legacySources(record).length) gaps.push('no_explicit_evidence')
  if (record.type === 'company') {
    if (empty(record.description)) gaps.push('missing_company_description')
    if (empty(record.hq)) gaps.push('headquarters_not_recorded')
    if (empty(record.website)) gaps.push('website_not_recorded')
  }
  if (record.type === 'therapy') {
    if (record.therapyType !== 'procedure' && empty(record.company)) gaps.push('missing_company_relationship')
    if (empty(record.description)) gaps.push('missing_therapy_context')
    if (empty(record.mechanism)) gaps.push('missing_mechanism')
    if (empty(record.links)) gaps.push('missing_info_link')
    if (record.therapyType === 'device' && empty(record.materials)) gaps.push('implant_materials_unverified_or_not_applicable')
    if (record.regulatoryStatus === 'unknown') gaps.push('regulatory_status_unverified')
    // Procedures do not have a product marketing-authorization date.
    if (record.therapyType !== 'procedure' && empty(record.timeline)) gaps.push('timeline_date_not_recorded')
    else if (record.timeline && empty(row(record.timeline).source)) gaps.push('timeline_source_not_recorded')
  }
  if (record.type === 'trial') {
    if (empty(record.nctId)) gaps.push('registry_id_not_verified')
    if (empty(record.timeline)) gaps.push('trial_start_not_recorded')
    else if (empty(row(record.timeline).source)) gaps.push('timeline_source_not_recorded')
    if (empty(record.enrollment)) gaps.push('enrollment_not_recorded')
    if (empty(record.primaryEndpoint)) gaps.push('primary_endpoint_not_recorded')
    if (empty(record.outcomeSummary)) gaps.push('outcome_summary_not_recorded')
    const registryIds = legacySources(record).flatMap(source => source.url.match(/NCT\d{8}/g) ?? [])
    if (typeof record.nctId === 'string' && registryIds.some(id => id !== record.nctId)) gaps.push('registry_reference_requires_reconciliation')
  }
  if (record.type === 'condition') {
    if (empty(record.anatomy)) gaps.push('anatomy_not_recorded')
    if (empty(record.description)) gaps.push('missing_condition_description')
  }
  return gaps.sort()
}

export function auditDatabase(root: string, date: string): DatabaseAudit {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    throw new Error('Audit date must be a valid YYYY-MM-DD date')
  }
  const origins = new Map<string, string>()
  for (const path of filesBelow(join(root, 'data'))) {
    const data = load(path)
    const collections = Array.isArray(data) ? [data] : Object.values(row(data)).filter(Array.isArray)
    for (const records of collections) for (const record of array(records)) {
      const id = record.id ?? record.configuration_id ?? record.metric_id ?? record.observation_id
      if (typeof id === 'string') origins.set(id, relative(root, path))
    }
    for (const spec of array(row(data).specs)) {
      if (typeof spec.version !== 'string') continue
      for (const key of Object.keys(row(spec.values))) origins.set(`claim-${spec.version.replace(/^ver-/, '')}-${key}`, relative(root, path))
    }
  }
  const records: AuditRecord[] = []
  for (const collection of ['companies', 'therapies', 'trials', 'conditions', 'news', 'editorial-issues']) {
    const file = `data/${collection}.yaml`
    for (const record of array(load(join(root, file)))) records.push({
      id: String(record.id ?? record.slug), collection, file,
      ...(typeof row(record.curation).status === 'string' ? { reviewStatus: String(row(record.curation).status) } : typeof record.reviewStatus === 'string' ? { reviewStatus: record.reviewStatus } : {}),
      sources: legacySources(record),
      gaps: collection === 'editorial-issues' ? [] : legacyGaps(record),
    })
  }
  const intelligence = loadIntelligenceSource(defaultIntelligencePaths(root))
  const sourceRows = array(intelligence.sources)
  const sources = new Map(sourceRows.map(source => [String(source.id), source]))
  for (const [collection, values] of Object.entries(intelligence)) {
    if (!Array.isArray(values)) continue
    for (const record of array(values)) {
      if (typeof record.id !== 'string') continue
      const evidence = array(record.sourceRefs).map(ref => ({
        sourceId: String(ref.sourceId), url: String(sources.get(String(ref.sourceId))?.url ?? ''), locator: String(ref.locator ?? ''),
      }))
      if (collection === 'sources') evidence.push({ sourceId: record.id, url: String(record.url), locator: 'Source document' })
      const gaps: string[] = []
      if (collection === 'families') {
        if (empty(record.entityIds)) gaps.push('missing_graph_crosswalk')
        if (empty(record.conditionIds)) gaps.push('condition_mapping_not_established')
      }
      if (['claims', 'versions', 'decisions', 'indications', 'outcomes'].includes(collection)) {
        if (!evidence.length) gaps.push('missing_source_reference')
        if (evidence.some(ref => !ref.url || !ref.locator)) gaps.push('unresolved_source_locator')
      }
      if (record.availability && record.availability !== 'reported' && record.availability !== 'not_applicable') gaps.push(`evidence_${record.availability}`)
      if (record.versionMapping === 'unclear' || record.versionMapping === 'mixed') gaps.push(`trial_generation_${record.versionMapping}`)
      if (collection === 'claims' && evidence.some(ref => {
        const source = sources.get(ref.sourceId)
        return source?.kind === 'publication' && /\breview\b|spectrum of devices|src-frontiers-corvia-2019/i
          .test(`${String(source.id)} ${String(source.title)}`)
      })) gaps.push('secondary_evidence_requires_primary_confirmation')
      records.push({ id: record.id, collection: `intelligence.${collection}`, file: origins.get(record.id) ?? 'data/intelligence/pilot.yaml',
        ...(typeof record.reviewStatus === 'string' ? { reviewStatus: record.reviewStatus } : {}), sources: evidence, gaps: gaps.sort() })
    }
  }
  const comparativeFile = 'data/intelligence/comparative-pilot.yaml'
  for (const [collection, values] of Object.entries(row(load(join(root, comparativeFile))))) {
    if (!Array.isArray(values)) continue
    for (const record of array(values)) {
      const id = record.configuration_id ?? record.metric_id ?? record.observation_id
      if (typeof id !== 'string') continue
      const provenance = row(record.provenance)
      records.push({ id, collection: `comparative.${collection}`, file: comparativeFile,
        ...(typeof provenance.review_status === 'string' ? { reviewStatus: provenance.review_status } : {}),
        sources: typeof provenance.url === 'string' ? [{ url: provenance.url, locator: String(provenance.locator ?? '') }] : [],
        gaps: typeof record.measurement_status === 'string' && record.measurement_status !== 'reported' && record.measurement_status !== 'not_applicable' ? [`comparison_${record.measurement_status}`] : [],
      })
    }
  }
  records.sort((a, b) => a.collection.localeCompare(b.collection) || a.id.localeCompare(b.id))
  const counts: Record<string, number> = {}
  const gapCounts: Record<string, number> = {}
  for (const record of records) {
    counts[record.collection] = (counts[record.collection] ?? 0) + 1
    for (const gap of record.gaps) gapCounts[gap] = (gapCounts[gap] ?? 0) + 1
  }
  return { date, scope: 'All authored entity, news, editorial, merged intelligence, taxonomy, and comparative records.',
    limitations: ['Offline inventory checks evidence fields and completeness; it does not certify source reachability or factual correctness.',
      'Companion domain reports identify sources re-opened for factual review and unresolved findings.',
      'Optional fields, historical websites, inapplicable implant materials, and unverified dates can remain legitimate gaps.',
      'Draft and unreviewed evidence still requires curator approval. Historical news and clinical observations are not silently rewritten.'],
    counts, gapCounts: Object.fromEntries(Object.entries(gapCounts).sort(([a], [b]) => a.localeCompare(b))), records }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    const dateIndex = args.indexOf('--date'), outputIndex = args.indexOf('--output')
    if (dateIndex < 0 || !args[dateIndex + 1]) throw new Error('Usage: npm run audit:database -- --date YYYY-MM-DD [--output path]')
    const audit = auditDatabase(ROOT, args[dateIndex + 1])
    const json = `${JSON.stringify(audit, null, 2)}\n`
    if (outputIndex >= 0) {
      if (!args[outputIndex + 1]) throw new Error('--output requires a path')
      const output = resolve(ROOT, args[outputIndex + 1]); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, json)
      console.log(`Audit inventory: ${audit.records.length} records -> ${relative(ROOT, output)}`)
      console.log(JSON.stringify({ counts: audit.counts, gapCounts: audit.gapCounts }, null, 2))
    } else process.stdout.write(json)
  } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 }
}
