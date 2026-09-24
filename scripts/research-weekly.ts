/**
 * Produce a review-only weekly research proposal. This script intentionally
 * never modifies data/*.yaml; a later reviewed merge/apply step owns that work.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

type RecordValue = Record<string, unknown>
type Entity = RecordValue & { id?: string; name?: string; pulse?: number }
type News = RecordValue & { id?: string; publishedAt?: string; title?: string; sourceUrl?: string }

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'data')
const DEFAULT_OUTPUT = join(ROOT, 'artifacts', 'weekly-research.json')
const PROMPT_PATH = join(ROOT, 'prompts', 'weekly-research.md')
const DICTIONARY_PATH = join(ROOT, 'schema', 'DATA_DICTIONARY.md')
const DEFAULT_SOURCE_REGISTRY_PATH = join(ROOT, 'artifacts', 'research', 'source-registry.yaml')
const MAX_CONTEXT_ITEMS = 400
const MAX_DEDUPE_NEWS = 250
const MAX_DICTIONARY_CHARS = 14_000
const MAX_SOURCE_REGISTRY_CHARS = 40_000
const MAX_SOURCE_REGISTRY_ENTRIES = 240

function fail(message: string): never { throw new Error(`weekly research: ${message}`) }

function parseArgs(argv: string[]) {
  let dryRun = false
  let output = DEFAULT_OUTPUT
  let endDate: string | undefined
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') dryRun = true
    else if (argv[i] === '--end-date') {
      const value = argv[++i]
      if (!value) fail('--end-date requires YYYY-MM-DD')
      endDate = value
    }
    else if (argv[i] === '--output') {
      const value = argv[++i]
      if (!value) fail('--output requires a path')
      output = resolve(ROOT, value)
    } else if (argv[i] === '--help') {
      console.log('Usage: tsx scripts/research-weekly.ts [--dry-run] [--end-date YYYY-MM-DD] [--output path]')
      process.exit(0)
    } else fail(`unknown argument ${argv[i]}`)
  }
  return { dryRun, output, endDate }
}

function loadYamlList(name: string): RecordValue[] {
  const path = join(DATA_DIR, `${name}.yaml`)
  const parsed = yaml.load(readFileSync(path, 'utf8'), { schema: yaml.CORE_SCHEMA })
  if (!Array.isArray(parsed)) fail(`data/${name}.yaml must be a YAML list`)
  return parsed as RecordValue[]
}

interface ResearchSource {
  name: string
  url: string
  role: string
  coverage?: string
}

interface ResearchSourceCategory {
  id: string
  label: string
  sources: ResearchSource[]
}

/**
 * Read the private watchlist without copying its contents into tracked files or
 * logs. CI supplies the same YAML as a repository secret; local runs use the
 * ignored artifacts path. Only a small allowlisted shape reaches the model.
 */
function loadSourceRegistry(required: boolean): { categories: ResearchSourceCategory[]; origin: 'secret' | 'local' | 'none'; entryCount: number } {
  const inline = process.env.NEWS_SOURCE_REGISTRY_YAML?.trim()
  const configuredPath = process.env.RESEARCH_SOURCE_REGISTRY_PATH?.trim()
  const path = configuredPath ? resolve(ROOT, configuredPath) : DEFAULT_SOURCE_REGISTRY_PATH
  const origin = inline ? 'secret' as const : 'local' as const
  if (!inline && !existsSync(path)) {
    if (required) fail(`private source registry not found at ${relative(ROOT, path)}; set NEWS_SOURCE_REGISTRY_YAML in CI or RESEARCH_SOURCE_REGISTRY_PATH locally`)
    return { categories: [], origin: 'none', entryCount: 0 }
  }
  const raw = inline || readFileSync(path, 'utf8')
  if (raw.length > MAX_SOURCE_REGISTRY_CHARS) fail(`private source registry exceeds ${MAX_SOURCE_REGISTRY_CHARS} characters`)
  const parsed = requiredObject(yaml.load(raw, { schema: yaml.CORE_SCHEMA }), 'source registry')
  if (parsed.version !== 1) fail('source registry.version must be 1')
  const categoryIds = new Set<string>()
  const sourceUrls = new Set<string>()
  const categories = requiredArray(parsed.categories, 'source registry.categories').map((categoryValue, categoryIndex) => {
    const category = requiredObject(categoryValue, `source registry.categories[${categoryIndex}]`)
    const id = requiredString(category.id, `source registry.categories[${categoryIndex}].id`)
    const label = requiredString(category.label, `source registry.categories[${categoryIndex}].label`)
    if (!/^[a-z][a-z0-9-]+$/.test(id)) fail(`source registry category id ${id} is invalid`)
    if (categoryIds.has(id)) fail(`source registry category id ${id} is duplicated`)
    categoryIds.add(id)
    const sources = requiredArray(category.sources, `source registry.categories[${categoryIndex}].sources`).map((sourceValue, sourceIndex) => {
      const source = requiredObject(sourceValue, `source registry.categories[${categoryIndex}].sources[${sourceIndex}]`)
      const url = requiredString(source.url, `source registry ${id}.sources[${sourceIndex}].url`)
      if (!isHttps(url)) fail(`source registry ${id}.sources[${sourceIndex}].url must be an HTTPS URL`)
      const sourceKey = normalizeUrl(url)
      if (sourceUrls.has(sourceKey)) fail(`source registry contains a duplicated URL`)
      sourceUrls.add(sourceKey)
      return {
        name: requiredString(source.name, `source registry ${id}.sources[${sourceIndex}].name`),
        url,
        role: requiredString(source.role, `source registry ${id}.sources[${sourceIndex}].role`),
        ...(typeof source.coverage === 'string' && source.coverage.trim() ? { coverage: source.coverage.trim() } : {}),
      }
    })
    if (!sources.length) fail(`source registry category ${id} must contain at least one source`)
    return { id, label, sources }
  })
  if (!categories.length) fail('source registry must contain at least one category')
  const entryCount = categories.reduce((count, category) => count + category.sources.length, 0)
  if (entryCount > MAX_SOURCE_REGISTRY_ENTRIES) fail(`source registry may contain at most ${MAX_SOURCE_REGISTRY_ENTRIES} sources`)
  return { categories, origin, entryCount }
}

function isHttps(value: unknown): value is string {
  try { const url = typeof value === 'string' ? new URL(value) : null; return Boolean(url && url.protocol === 'https:' && url.hostname && !url.username && !url.password) } catch { return false }
}

function dateOnly(value: Date): string { return value.toISOString().slice(0, 10) }
function pacificDate(value = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && dateOnly(new Date(`${value}T00:00:00.000Z`)) === value
}
function normalize(value: string): string { return value.trim().replace(/\s+/g, ' ').toLowerCase() }
function normalizeUrl(value: string): string { return value.trim().replace(/#$/, '').replace(/\/$/, '').toLowerCase() }
function summarySentenceCount(value: string): number {
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' })
  return [...segmenter.segment(value)].filter(({ segment }) => segment.trim()).length
}
function contextFor(entities: Entity[], news: News[], start: string, end: string) {
  const entityIndex = entities.slice(0, MAX_CONTEXT_ITEMS).map(({ id, name, pulse, type, therapyType }) => ({ id, name, type, therapyType, pulse }))
  const recentNews = news
    .filter(item => typeof item.publishedAt === 'string' && item.publishedAt >= start && item.publishedAt <= end)
    .concat(news.slice(0, MAX_DEDUPE_NEWS))
    .slice(0, MAX_DEDUPE_NEWS)
    .map(({ id, publishedAt, title, sourceUrl }) => ({ id, publishedAt, title, sourceUrl }))
  return { entityIndex, recentNews }
}

const proposalSchema = {
  type: 'object', additionalProperties: false,
  required: ['newNews', 'proposedEntities', 'proposedUpdates', 'pulseAdjustments', 'sources', 'reviewFlags'],
  properties: {
    newNews: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'publishedAt', 'title', 'summary', 'sourceName', 'sourceUrl', 'topicTags', 'relevantNodeIds', 'missingEntityIds', 'sources'], properties: {
      id: { type: 'string' }, publishedAt: { type: 'string' }, title: { type: 'string' }, summary: { type: 'string', maxLength: 650 }, sourceName: { type: 'string' }, sourceUrl: { type: 'string' }, topicTags: { type: 'array', items: { type: 'string' } }, relevantNodeIds: { type: 'array', items: { type: 'string' } }, missingEntityIds: { type: 'array', items: { type: 'string' } }, sources: { type: 'array', maxItems: 5, items: { type: 'string' } },
    } } },
    proposedEntities: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'entityType', 'fields', 'rationale', 'sources'], properties: { id: { type: 'string' }, entityType: { type: 'string', enum: ['condition', 'therapy', 'company', 'trial'] }, fields: { type: 'object' }, rationale: { type: 'string' }, sources: { type: 'array', items: { type: 'string' } } } } },
    proposedUpdates: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'changes', 'rationale', 'sources'], properties: { id: { type: 'string' }, changes: { type: 'object' }, rationale: { type: 'string' }, sources: { type: 'array', items: { type: 'string' } } } } },
    pulseAdjustments: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'pulse', 'rationale', 'sources'], properties: { id: { type: 'string' }, pulse: { type: 'number', minimum: 0, maximum: 10 }, rationale: { type: 'string' }, sources: { type: 'array', items: { type: 'string' } } } } },
    sources: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['url', 'title'], properties: { url: { type: 'string' }, title: { type: 'string' }, publisher: { type: 'string' } } } },
    reviewFlags: { type: 'array', items: { type: 'string' } },
  },
} as const

function requiredArray(value: unknown, label: string): unknown[] { if (!Array.isArray(value)) fail(`${label} must be an array`); return value }
function requiredObject(value: unknown, label: string): RecordValue { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`); return value as RecordValue }
function requiredString(value: unknown, label: string): string { if (typeof value !== 'string' || !value.trim()) fail(`${label} must be a non-empty string`); return value }
function validateSources(value: unknown, label: string) { requiredArray(value, label).forEach((url, i) => { if (!isHttps(url)) fail(`${label}[${i}] must be an HTTPS URL`) }) }

function validateProposal(value: unknown, existingIds: Set<string>, existingNews: News[], start: string, end: string): RecordValue {
  const proposal = requiredObject(value, 'proposal')
  for (const key of ['newNews', 'proposedEntities', 'proposedUpdates', 'pulseAdjustments', 'sources', 'reviewFlags']) requiredArray(proposal[key], key)
  if ((proposal.newNews as unknown[]).length > 40) fail('newNews may contain at most 40 items')
  if ((proposal.proposedEntities as unknown[]).length > 30) fail('proposedEntities may contain at most 30 items')
  const ids = new Set<string>(); const titles = new Set<string>(); const urls = new Set<string>()
  const existingNewsIds = new Set(existingNews.map(item => item.id).filter((id): id is string => typeof id === 'string'))
  const existingTitles = new Set(existingNews.map(item => item.title).filter((title): title is string => typeof title === 'string').map(normalize))
  const existingUrls = new Set(existingNews.map(item => item.sourceUrl).filter((url): url is string => typeof url === 'string').map(normalizeUrl))
  for (const [i, itemValue] of requiredArray(proposal.newNews, 'newNews').entries()) {
    const item = requiredObject(itemValue, `newNews[${i}]`); const id = requiredString(item.id, `newNews[${i}].id`); const title = requiredString(item.title, `newNews[${i}].title`); const url = requiredString(item.sourceUrl, `newNews[${i}].sourceUrl`)
    const publishedAt = requiredString(item.publishedAt, `newNews[${i}].publishedAt`)
    const summary = requiredString(item.summary, `newNews[${i}].summary`); requiredString(item.sourceName, `newNews[${i}].sourceName`); requiredArray(item.topicTags, `newNews[${i}].topicTags`)
    if (summary.length > 650) fail(`newNews[${i}].summary may contain at most 650 characters`)
    const sentenceCount = summarySentenceCount(summary)
    if (sentenceCount < 2 || sentenceCount > 3) fail(`newNews[${i}].summary must contain two or three sentences`)
    if (!/^news-\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(id)) fail(`newNews[${i}].id has an invalid format`)
    if (!validDate(publishedAt) || publishedAt < start || publishedAt > end) fail(`newNews[${i}].publishedAt must be inside ${start}..${end}`)
    if (!id.startsWith(`news-${publishedAt}-`)) fail(`newNews[${i}].id date must match publishedAt`)
    if (!isHttps(url)) fail(`newNews[${i}].sourceUrl must be an HTTPS URL`)
    if (ids.has(id) || existingNewsIds.has(id) || existingIds.has(id)) fail(`duplicate proposed news id ${id}`)
    if (titles.has(normalize(title)) || existingTitles.has(normalize(title))) fail(`duplicate proposed news title ${title}`)
    if (urls.has(normalizeUrl(url)) || existingUrls.has(normalizeUrl(url))) fail(`duplicate proposed news URL ${url}`)
    ids.add(id); titles.add(normalize(title)); urls.add(normalizeUrl(url)); validateSources(item.sources, `newNews[${i}].sources`)
    const additionalSourceUrls = (item.sources as unknown[]).map((source) => normalizeUrl(source as string))
    if (additionalSourceUrls.length > 5) fail(`newNews[${i}].sources may contain at most 5 URLs`)
    if (new Set(additionalSourceUrls).size !== additionalSourceUrls.length) fail(`newNews[${i}].sources must not contain duplicate URLs`)
    if (additionalSourceUrls.includes(normalizeUrl(url))) fail(`newNews[${i}].sources must not repeat sourceUrl`)
    const relevantNodeIds = requiredArray(item.relevantNodeIds, `newNews[${i}].relevantNodeIds`)
    if (relevantNodeIds.length === 0) fail(`newNews[${i}].relevantNodeIds must not be empty`)
    for (const nodeId of relevantNodeIds) if (typeof nodeId !== 'string' || !existingIds.has(nodeId)) fail(`newNews[${i}] references missing node ${String(nodeId)}`)
    requiredArray(item.missingEntityIds, `newNews[${i}].missingEntityIds`)
  }
  const proposedEntityIds = new Set<string>()
  for (const [i, candidateValue] of requiredArray(proposal.proposedEntities, 'proposedEntities').entries()) {
    const candidate = requiredObject(candidateValue, `proposedEntities[${i}]`); const id = requiredString(candidate.id, `proposedEntities[${i}].id`)
    if (existingIds.has(id) || ids.has(id) || proposedEntityIds.has(id)) fail(`duplicate proposed entity id ${id}`)
    const entityType = requiredString(candidate.entityType, `proposedEntities[${i}].entityType`)
    if (!['condition', 'therapy', 'company', 'trial'].includes(entityType)) fail(`proposedEntities[${i}].entityType is invalid`)
    const fields = requiredObject(candidate.fields, `proposedEntities[${i}].fields`)
    if (['id', 'type', 'curation'].some(key => key in fields)) fail(`proposedEntities[${i}].fields may not override id, type, or curation`)
    requiredString(candidate.rationale, `proposedEntities[${i}].rationale`); proposedEntityIds.add(id); validateSources(candidate.sources, `proposedEntities[${i}].sources`)
  }
  for (const [i, updateValue] of requiredArray(proposal.proposedUpdates, 'proposedUpdates').entries()) { const update = requiredObject(updateValue, `proposedUpdates[${i}]`); const id = requiredString(update.id, `proposedUpdates[${i}].id`); if (!existingIds.has(id)) fail(`proposedUpdates[${i}] references missing entity ${id}`); requiredObject(update.changes, `proposedUpdates[${i}].changes`); requiredString(update.rationale, `proposedUpdates[${i}].rationale`); validateSources(update.sources, `proposedUpdates[${i}].sources`) }
  const pulseIds = new Set<string>()
  for (const [i, adjustmentValue] of requiredArray(proposal.pulseAdjustments, 'pulseAdjustments').entries()) { const adjustment = requiredObject(adjustmentValue, `pulseAdjustments[${i}]`); const id = requiredString(adjustment.id, `pulseAdjustments[${i}].id`); if (!existingIds.has(id)) fail(`pulseAdjustments[${i}] references missing entity ${id}`); if (pulseIds.has(id)) fail(`duplicate pulse adjustment for ${id}`); pulseIds.add(id); if (typeof adjustment.pulse !== 'number' || adjustment.pulse < 0 || adjustment.pulse > 10) fail(`pulseAdjustments[${i}].pulse must be 0..10`); requiredString(adjustment.rationale, `pulseAdjustments[${i}].rationale`); validateSources(adjustment.sources, `pulseAdjustments[${i}].sources`) }
  for (const [i, sourceValue] of requiredArray(proposal.sources, 'sources').entries()) { const source = requiredObject(sourceValue, `sources[${i}]`); if (!isHttps(source.url)) fail(`sources[${i}].url must be an HTTPS URL`); requiredString(source.title, `sources[${i}].title`) }
  for (const [i, flag] of requiredArray(proposal.reviewFlags, 'reviewFlags').entries()) requiredString(flag, `reviewFlags[${i}]`)
  return proposal
}

function extractText(response: RecordValue): string {
  if (typeof response.output_text === 'string' && response.output_text.trim()) return response.output_text
  const messages = Array.isArray(response.output) ? response.output : []
  for (const message of messages) {
    const content = (message as RecordValue).content
    if (!Array.isArray(content)) continue
    for (const part of content as RecordValue[]) {
      if (part.type === 'refusal') fail('model refused the research request')
      if (typeof part.text === 'string' && part.text.trim()) return part.text
    }
  }
  fail('response contained no JSON text')
}

async function main() {
  const { dryRun, output, endDate } = parseArgs(process.argv.slice(2))
  const collections = ['conditions', 'therapies', 'companies', 'trials'].flatMap(loadYamlList) as Entity[]
  const news = loadYamlList('news') as News[]
  const existingIds = new Set(collections.map(entity => entity.id).filter((id): id is string => typeof id === 'string'))
  if (existingIds.size !== collections.length) fail('entity IDs must be present and unique before research')
  const lookback = Number(process.env.RESEARCH_LOOKBACK_DAYS ?? 7)
  if (!Number.isInteger(lookback) || lookback < 1 || lookback > 31) fail('RESEARCH_LOOKBACK_DAYS must be an integer from 1 to 31')
  const end = endDate ?? pacificDate()
  if (!validDate(end)) fail('--end-date must be a real calendar date in YYYY-MM-DD form')
  const startDate = new Date(`${end}T00:00:00.000Z`); startDate.setUTCDate(startDate.getUTCDate() - lookback + 1); const start = dateOnly(startDate)
  const contract = readFileSync(PROMPT_PATH, 'utf8'); const dictionary = readFileSync(DICTIONARY_PATH, 'utf8').slice(0, MAX_DICTIONARY_CHARS)
  const sourceRegistry = loadSourceRegistry(!dryRun)
  const context = contextFor(collections, news, start, end)
  const effort = process.env.OPENAI_RESEARCH_EFFORT?.trim() || 'low'
  if (!['low', 'medium', 'high'].includes(effort)) fail('OPENAI_RESEARCH_EFFORT must be low, medium, or high')
  const request = { model: process.env.OPENAI_RESEARCH_MODEL?.trim() || 'gpt-5.5', store: false, reasoning: { effort }, max_tool_calls: 40, max_output_tokens: 16_000, include: ['web_search_call.action.sources'], tool_choice: 'required', tools: [{ type: 'web_search', external_web_access: true, search_context_size: 'medium' }], text: { format: { type: 'json_schema', name: 'weekly_research_proposal', strict: false, schema: proposalSchema } }, input: [{ role: 'system', content: [{ type: 'input_text', text: contract }] }, { role: 'user', content: [{ type: 'input_text', text: `Date window: ${start} through ${end}.\n\nPrivate operator-maintained source watchlist (starting points, not evidence of a claim):\n${JSON.stringify(sourceRegistry.categories)}\n\nData dictionary (reference only):\n${dictionary}\n\nCurrent bounded inventory (reference only):\n${JSON.stringify(context)}` }] }] }
  const summary = { dryRun, model: request.model, dateWindow: { start, end }, entitiesProvided: context.entityIndex.length, dedupeNewsProvided: context.recentNews.length, sourceRegistry: { origin: sourceRegistry.origin, categories: sourceRegistry.categories.length, entries: sourceRegistry.entryCount }, output: relative(ROOT, output), usesWebSearch: true, storesResponse: false }
  if (dryRun) { console.log(JSON.stringify(summary, null, 2)); return }
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) fail('OPENAI_API_KEY is required')
  const result = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(request) })
  if (!result.ok) fail(`Responses API returned HTTP ${result.status}`)
  const response = await result.json() as RecordValue
  if (response.status === 'failed' || response.error) fail('Responses API returned a failed response')
  if (response.status === 'incomplete' || response.incomplete_details) fail('Responses API returned an incomplete response')
  const text = extractText(response)
  let parsed: unknown; try { parsed = JSON.parse(text) } catch { fail('model returned invalid JSON') }
  const proposal = validateProposal(parsed, existingIds, news, start, end)
  const sourceMetadata = Array.isArray(response.output) ? response.output.filter(item => (item as RecordValue).type === 'web_search_call').map(item => {
    const call = item as RecordValue
    const action = call.action && typeof call.action === 'object' ? call.action as RecordValue : {}
    const sources = Array.isArray(action.sources) ? action.sources.flatMap(source => {
      const candidate = source && typeof source === 'object' ? source as RecordValue : {}
      return isHttps(candidate.url) ? [{ url: candidate.url, title: typeof candidate.title === 'string' ? candidate.title : undefined }] : []
    }) : []
    return { type: call.type, id: call.id, status: call.status, sources }
  }) : []
  const artifact = { generatedAt: new Date().toISOString(), dateWindow: { start, end }, model: request.model, responseMetadata: { responseId: typeof response.id === 'string' ? response.id : undefined, sourceMetadata }, proposal }
  mkdirSync(dirname(output), { recursive: true }); const temporary = `${output}.tmp`; writeFileSync(temporary, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8'); renameSync(temporary, output)
  console.log(JSON.stringify({ ...summary, result: 'validated proposal written', proposalCounts: Object.fromEntries(['newNews', 'proposedEntities', 'proposedUpdates', 'pulseAdjustments', 'reviewFlags'].map(key => [key, (proposal[key] as unknown[]).length])) }, null, 2))
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'weekly research failed'); process.exitCode = 1 })
