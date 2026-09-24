/** Apply a validated weekly research artifact as reviewable, draft-only data changes. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

type JsonObject = Record<string, unknown>
type EntityType = 'condition' | 'therapy' | 'company' | 'trial'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_INPUT = join(ROOT, 'artifacts', 'weekly-research.json')
const ENTITY_FILES: Record<EntityType, string> = {
  condition: 'conditions.yaml', therapy: 'therapies.yaml', company: 'companies.yaml', trial: 'trials.yaml',
}

function fail(message: string): never { throw new Error(`apply weekly research: ${message}`) }
function object(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`)
  return value as JsonObject
}
function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`)
  return value
}
function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} must be a non-empty string`)
  return value
}
function parseArgs(argv: string[]): string {
  if (argv.length === 0) return DEFAULT_INPUT
  if (argv.length === 2 && argv[0] === '--input') return resolve(ROOT, argv[1])
  fail('usage: tsx scripts/apply-weekly-research.ts [--input path]')
}
function loadList(path: string): JsonObject[] {
  const value = yaml.load(readFileSync(path, 'utf8'), { schema: yaml.CORE_SCHEMA })
  if (!Array.isArray(value)) fail(`${path} must contain a YAML list`)
  return value as JsonObject[]
}
function dumpList(items: JsonObject[]): string {
  return yaml.dump(items, { noRefs: true, lineWidth: 120, sortKeys: false, quotingType: '"' }).trimEnd()
}
// Retain hand-curated news YAML blocks verbatim while inserting new proposals;
// reserializing the entire feed would obscure a weekly review diff.
export function blocks(path: string): { header: string; entries: Array<{ id: string; publishedAt: string; block: string }> } {
  const source = readFileSync(path, 'utf8')
  const first = source.search(/^- id:/m)
  if (first < 0) return { header: source.trimEnd(), entries: [] }
  const header = source.slice(0, first).trimEnd()
  const rawBlocks = source.slice(first).split(/(?=^- id:)/m).filter(Boolean)
  const entries = rawBlocks.map((block, index) => {
    const parsed = yaml.load(block, { schema: yaml.CORE_SCHEMA })
    if (!Array.isArray(parsed) || parsed.length !== 1) fail(`cannot parse news block ${index + 1}`)
    const item = object(parsed[0], `news block ${index + 1}`)
    return { id: string(item.id, `news block ${index + 1}.id`), publishedAt: string(item.publishedAt, `news block ${index + 1}.publishedAt`), block: block.trimEnd() }
  })
  return { header, entries }
}
export function replacePulse(path: string, id: string, pulse: number): void {
  const source = readFileSync(path, 'utf8')
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const startMatch = new RegExp(`^- id:\\s*["']?${escaped}["']?\\s*$`, 'm').exec(source)
  if (!startMatch) fail(`cannot find ${id} in ${path}`)
  const start = startMatch.index
  const afterStart = start + startMatch[0].length
  const next = /^- id:/m.exec(source.slice(afterStart))
  const end = next ? afterStart + next.index : source.length
  let block = source.slice(start, end)
  if (/^  pulse:/m.test(block)) block = block.replace(/^  pulse:.*$/m, `  pulse: ${pulse}`)
  else {
    const curation = /^  curation:/m.exec(block)
    if (!curation) fail(`cannot place pulse for ${id}; curation block not found`)
    block = `${block.slice(0, curation.index)}  pulse: ${pulse}\n${block.slice(curation.index)}`
  }
  writeFileSync(path, `${source.slice(0, start)}${block}${source.slice(end)}`, 'utf8')
}
function assertSafeFields(fields: JsonObject, label: string): void {
  for (const key of ['id', 'type', 'curation', '__proto__', 'prototype', 'constructor']) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) fail(`${label} may not contain ${key}`)
  }
}

function sourceLabel(url: string): string {
  const hostname = new URL(url).hostname.replace(/^www\./, '')
  return hostname
}

function main(): void {
  const input = parseArgs(process.argv.slice(2))
  if (!existsSync(input)) fail(`artifact does not exist: ${input}`)
  const artifact = object(JSON.parse(readFileSync(input, 'utf8')), 'artifact')
  const window = object(artifact.dateWindow, 'dateWindow')
  const issueDate = string(window.end, 'dateWindow.end')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) fail('dateWindow.end must be YYYY-MM-DD')
  const proposal = object(artifact.proposal, 'proposal')

  const entityPaths = Object.values(ENTITY_FILES).map(file => join(ROOT, 'data', file))
  const existingEntities = entityPaths.flatMap(loadList)
  const existingIds = new Set(existingEntities.map((entry, index) => string(entry.id, `existing entity ${index}.id`)))

  const additions = new Map<EntityType, JsonObject[]>(Object.keys(ENTITY_FILES).map(type => [type as EntityType, []]))
  const appliedEntityRationales: JsonObject[] = []
  for (const [index, value] of array(proposal.proposedEntities, 'proposedEntities').entries()) {
    const candidate = object(value, `proposedEntities[${index}]`)
    const id = string(candidate.id, `proposedEntities[${index}].id`)
    const entityType = string(candidate.entityType, `proposedEntities[${index}].entityType`) as EntityType
    if (!(entityType in ENTITY_FILES)) fail(`unsupported entity type ${entityType}`)
    if (existingIds.has(id)) fail(`entity ${id} already exists`)
    const fields = object(candidate.fields, `proposedEntities[${index}].fields`)
    assertSafeFields(fields, `proposedEntities[${index}].fields`)
    const sources = array(candidate.sources, `proposedEntities[${index}].sources`).map((source, sourceIndex) => string(source, `proposedEntities[${index}].sources[${sourceIndex}]`))
    if (sources.length === 0) fail(`proposedEntities[${index}] requires a source`)
    const entity: JsonObject = { id, type: entityType, ...fields, curation: { status: 'draft', lastUpdated: issueDate, sources } }
    additions.get(entityType)!.push(entity)
    existingIds.add(id)
    appliedEntityRationales.push({ id, rationale: candidate.rationale, sources })
  }
  for (const [entityType, items] of additions) {
    if (items.length === 0) continue
    const path = join(ROOT, 'data', ENTITY_FILES[entityType])
    const source = readFileSync(path, 'utf8').trimEnd()
    writeFileSync(path, `${source}\n\n${dumpList(items)}\n`, 'utf8')
  }

  const newsPath = join(ROOT, 'data', 'news.yaml')
  const newsSource = blocks(newsPath)
  const existingNewsIds = new Set(newsSource.entries.map(entry => entry.id))
  const newNewsEntries: Array<{ id: string; publishedAt: string; block: string }> = []
  for (const [index, value] of array(proposal.newNews, 'newNews').entries()) {
    const item = object(value, `newNews[${index}]`)
    const id = string(item.id, `newNews[${index}].id`)
    if (existingNewsIds.has(id)) fail(`news item ${id} already exists`)
    const publishedAt = string(item.publishedAt, `newNews[${index}].publishedAt`)
    const relevantNodeIds = array(item.relevantNodeIds, `newNews[${index}].relevantNodeIds`).map((nodeId, nodeIndex) => string(nodeId, `newNews[${index}].relevantNodeIds[${nodeIndex}]`))
    if (relevantNodeIds.length === 0 || relevantNodeIds.some(nodeId => !existingIds.has(nodeId))) fail(`news item ${id} must reference existing or newly-added nodes`)
    const sourceUrl = string(item.sourceUrl, `newNews[${index}].sourceUrl`)
    const additionalSources = [...new Set(array(item.sources, `newNews[${index}].sources`).map((source, sourceIndex) => string(source, `newNews[${index}].sources[${sourceIndex}]`)))]
      .filter((source) => source !== sourceUrl)
      .slice(0, 5)
      .map((url) => ({ label: sourceLabel(url), url }))
    const clean: JsonObject = {
      id, publishedAt,
      reviewStatus: 'draft',
      title: string(item.title, `newNews[${index}].title`),
      summary: string(item.summary, `newNews[${index}].summary`),
      sourceName: string(item.sourceName, `newNews[${index}].sourceName`),
      sourceUrl,
      ...(additionalSources.length ? { additionalSources } : {}),
      topicTags: array(item.topicTags, `newNews[${index}].topicTags`),
      relevantNodeIds,
    }
    newNewsEntries.push({ id, publishedAt, block: dumpList([clean]) })
    existingNewsIds.add(id)
  }
  const sortedNews = [...newNewsEntries, ...newsSource.entries]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id))
  // The feed keeps the newest 250 items (DATA_DICTIONARY); say so when older items fall off.
  const mergedNews = sortedNews.slice(0, 250)
  if (sortedNews.length > mergedNews.length) console.warn(`weekly apply: dropped ${sortedNews.length - mergedNews.length} oldest news item(s) to keep 250: ${sortedNews.slice(250).map(entry => entry.id).join(', ')}`)
  writeFileSync(newsPath, `${newsSource.header}\n\n${mergedNews.map(entry => entry.block).join('\n\n')}\n`, 'utf8')

  const idToPath = new Map<string, string>()
  for (const path of entityPaths) for (const entity of loadList(path)) idToPath.set(string(entity.id, 'entity.id'), path)
  const appliedPulses: JsonObject[] = []
  for (const [index, value] of array(proposal.pulseAdjustments, 'pulseAdjustments').entries()) {
    const adjustment = object(value, `pulseAdjustments[${index}]`)
    const id = string(adjustment.id, `pulseAdjustments[${index}].id`)
    const pulse = adjustment.pulse
    if (typeof pulse !== 'number' || pulse < 0 || pulse > 10) fail(`pulseAdjustments[${index}].pulse must be 0..10`)
    const path = idToPath.get(id)
    if (!path) fail(`pulse target ${id} does not exist`)
    replacePulse(path, id, pulse)
    appliedPulses.push({ id, pulse, rationale: adjustment.rationale, sources: adjustment.sources })
  }

  // Existing curated fields are never overwritten by automation. Proposed
  // edits and the rationale for applied draft/Pulse changes stay reviewable.
  const reviewRecord = {
    issueDate,
    generatedAt: artifact.generatedAt,
    model: artifact.model,
    addedEntities: appliedEntityRationales,
    proposedUpdates: array(proposal.proposedUpdates, 'proposedUpdates'),
    pulseAdjustments: appliedPulses,
    reviewFlags: array(proposal.reviewFlags, 'reviewFlags'),
  }
  if (appliedEntityRationales.length || (reviewRecord.proposedUpdates as unknown[]).length || appliedPulses.length || (reviewRecord.reviewFlags as unknown[]).length) {
    const reviewPath = join(ROOT, 'data', 'research-proposals', `${issueDate}.json`)
    mkdirSync(dirname(reviewPath), { recursive: true })
    writeFileSync(reviewPath, `${JSON.stringify(reviewRecord, null, 2)}\n`, 'utf8')
  }

  console.log(`✓ applied ${newNewsEntries.length} news items, ${appliedEntityRationales.length} draft entities, and ${appliedPulses.length} pulse updates for review`)
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  try { main() } catch (error) {
    console.error(error instanceof Error ? error.message : 'apply weekly research failed')
    process.exitCode = 1
  }
}
