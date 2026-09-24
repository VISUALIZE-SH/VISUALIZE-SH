/**
 * build-data.ts — compile data/*.yaml into public/graph.json.
 *
 * Pipeline:
 *   1. Parse YAML entity files.
 *   2. Validate every entity against its JSON Schema (schema/*.schema.json).
 *   3. Enforce cross-field + referential integrity (ids unique, refs resolve to
 *      the correct entity type, therapy id prefix matches therapyType).
 *   4. Derive graph nodes + edges, compute node degree.
 *   5. Validate data/news.yaml and verify all of its node references resolve.
 *   6. Write public/graph.json with graph metadata and a news feed.
 *
 * Any error fails the build (exit 1) with a clear message, so a scheduled
 * updater (or CI) catches malformed data before it ships.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import Ajv, { type ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'
import type {
  Entity,
  NewsItem,
  Therapy,
  Trial,
  GraphData,
  GraphEdgeData,
  GraphNodeData,
  NodeGroup,
  TherapyType,
} from '../src/types/entities'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA_DIR = join(ROOT, 'data')
const SCHEMA_DIR = join(ROOT, 'schema')
const OUT_FILE = join(ROOT, 'public', 'graph.json')

const errors: string[] = []
const fail = (msg: string) => errors.push(msg)

function checkPublicHttps(label: string, value: string | undefined) {
  if (!value || value.startsWith('PMID:')) return
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
      fail(`${label} must be a public HTTPS URL without embedded credentials`)
    }
  } catch {
    fail(`${label} must be a valid public HTTPS URL`)
  }
}

// --- ajv setup -------------------------------------------------------------
const ajv = new Ajv({ allErrors: true, allowUnionTypes: true })
addFormats(ajv)

function loadSchema(name: string): ValidateFunction {
  const schema = JSON.parse(readFileSync(join(SCHEMA_DIR, name), 'utf8'))
  return ajv.compile(schema)
}

const validators: Record<string, ValidateFunction> = {
  conditions: loadSchema('condition.schema.json'),
  therapies: loadSchema('therapy.schema.json'),
  companies: loadSchema('company.schema.json'),
  trials: loadSchema('trial.schema.json'),
  news: loadSchema('news.schema.json'),
}

// --- load + parse YAML -----------------------------------------------------
function loadEntities(file: string): Entity[] {
  const path = join(DATA_DIR, `${file}.yaml`)
  if (!existsSync(path)) {
    fail(`Missing data file: data/${file}.yaml`)
    return []
  }
  // CORE_SCHEMA (not DEFAULT_SCHEMA) so unquoted ISO dates like 2026-06-22 stay
  // strings instead of being coerced to Date objects by YAML's timestamp type.
  const parsed = yaml.load(readFileSync(path, 'utf8'), { schema: yaml.CORE_SCHEMA })
  if (parsed == null) return []
  if (!Array.isArray(parsed)) {
    fail(`data/${file}.yaml must be a YAML list of entities`)
    return []
  }
  return parsed as Entity[]
}

const files = ['conditions', 'therapies', 'companies', 'trials'] as const
const all: Entity[] = []

for (const file of files) {
  const entities = loadEntities(file)
  const validate = validators[file]
  entities.forEach((entity, i) => {
    if (!validate(entity)) {
      const id = (entity as { id?: string })?.id ?? `index ${i}`
      for (const e of validate.errors ?? []) {
        fail(`data/${file}.yaml [${id}] ${e.instancePath || '/'} ${e.message}`)
      }
    }
    all.push(entity)
  })
}

// News attaches to graph nodes but is not itself a graph entity.
function loadNews(): NewsItem[] {
  const items = loadEntities('news') as unknown as NewsItem[]
  const validate = validators.news
  items.forEach((item, i) => {
    const id = item?.id ?? `index ${i}`
    if (!validate(item)) {
      for (const e of validate.errors ?? []) {
        fail(`data/news.yaml [${id}] ${e.instancePath || '/'} ${e.message}`)
      }
    }
  })
  return items
}

const news = loadNews()

// --- build id index + uniqueness ------------------------------------------
const byId = new Map<string, Entity>()
for (const entity of all) {
  if (!entity?.id) continue
  if (byId.has(entity.id)) fail(`Duplicate id: ${entity.id}`)
  byId.set(entity.id, entity)
}

const newsIds = new Set<string>()
for (const item of news) {
  if (!item?.id) continue
  if (newsIds.has(item.id)) fail(`Duplicate news id: ${item.id}`)
  newsIds.add(item.id)
  const idDate = item.id.match(/^news-(\d{4}-\d{2}-\d{2})-/)?.[1]
  if (idDate && item.publishedAt && idDate !== item.publishedAt) {
    fail(`news "${item.id}" date prefix must match publishedAt "${item.publishedAt}"`)
  }
  checkPublicHttps(`news "${item.id}".sourceUrl`, item.sourceUrl)
  for (const source of item.additionalSources ?? []) {
    checkPublicHttps(`news "${item.id}".additionalSources`, source.url)
    if (source.url === item.sourceUrl) fail(`news "${item.id}" repeats its primary URL in additionalSources`)
  }
  for (const nodeId of item.relevantNodeIds ?? []) {
    if (!byId.has(nodeId)) fail(`news "${item.id}" references unknown node id "${nodeId}"`)
  }
}

// Reference must exist and resolve to the expected entity type.
function checkRef(from: string, ref: string, expected: Entity['type']) {
  const target = byId.get(ref)
  if (!target) {
    fail(`${from} references unknown id "${ref}"`)
  } else if (target.type !== expected) {
    fail(`${from} references "${ref}" which is a ${target.type}, expected ${expected}`)
  }
}

const PREFIX_TO_THERAPY_TYPE: Record<string, TherapyType> = {
  rx: 'pharmaceutical',
  dev: 'device',
  dig: 'digital',
  proc: 'procedure',
}

// --- cross-field + referential integrity ----------------------------------
for (const entity of all) {
  for (const [index, source] of (entity.curation?.sources ?? []).entries()) {
    checkPublicHttps(`${entity.type} "${entity.id}".curation.sources[${index}]`, source)
  }
  if (entity.type === 'company') {
    checkPublicHttps(`company "${entity.id}".website`, entity.website)
  }
  if (entity.type === 'therapy') {
    const t = entity as Therapy
    const prefix = t.id.split('-')[0]
    const expectedType = PREFIX_TO_THERAPY_TYPE[prefix]
    if (expectedType && expectedType !== t.therapyType) {
      fail(`therapy "${t.id}" has prefix "${prefix}-" but therapyType "${t.therapyType}" (expected ${expectedType})`)
    }
    if (t.company) checkRef(`therapy "${t.id}".company`, t.company, 'company')
    for (const c of t.treats ?? []) checkRef(`therapy "${t.id}".treats`, c, 'condition')
    for (const [index, link] of (t.links ?? []).entries()) {
      checkPublicHttps(`therapy "${t.id}".links[${index}].url`, link.url)
    }
    for (const [index, material] of (t.materials ?? []).entries()) {
      checkPublicHttps(`therapy "${t.id}".materials[${index}].source`, material.source)
    }
    checkPublicHttps(`therapy "${t.id}".timeline.source`, t.timeline?.source)
  }
  if (entity.type === 'trial') {
    const tr = entity as Trial
    for (const c of tr.conditions ?? []) checkRef(`trial "${tr.id}".conditions`, c, 'condition')
    for (const th of tr.therapies ?? []) checkRef(`trial "${tr.id}".therapies`, th, 'therapy')
    for (const [index, reference] of (tr.references ?? []).entries()) {
      checkPublicHttps(`trial "${tr.id}".references[${index}]`, reference)
    }
    for (const [index, link] of (tr.links ?? []).entries()) {
      checkPublicHttps(`trial "${tr.id}".links[${index}].url`, link.url)
    }
    checkPublicHttps(`trial "${tr.id}".timeline.source`, tr.timeline?.source)
  }
}

// --- derive nodes + edges --------------------------------------------------
function groupOf(entity: Entity): NodeGroup {
  if (entity.type === 'therapy') return (entity as Therapy).therapyType
  return entity.type
}

const edges: GraphEdgeData[] = []
const seenEdge = new Set<string>()
function addEdge(source: string, target: string, relationship: GraphEdgeData['relationship']) {
  const id = `${source}__${relationship}__${target}`
  if (seenEdge.has(id)) return
  seenEdge.add(id)
  edges.push({ id, source, target, relationship })
}

for (const entity of all) {
  if (entity.type === 'therapy') {
    const t = entity as Therapy
    if (t.company && byId.has(t.company)) addEdge(t.id, t.company, 'made_by')
    for (const c of t.treats ?? []) if (byId.has(c)) addEdge(t.id, c, 'treats')
  }
  if (entity.type === 'trial') {
    const tr = entity as Trial
    for (const th of tr.therapies ?? []) if (byId.has(th)) addEdge(tr.id, th, 'evaluates')
    for (const c of tr.conditions ?? []) if (byId.has(c)) addEdge(tr.id, c, 'studies')
  }
}

// degree = number of incident edges
const degree = new Map<string, number>()
for (const e of edges) {
  degree.set(e.source, (degree.get(e.source) ?? 0) + 1)
  degree.set(e.target, (degree.get(e.target) ?? 0) + 1)
}

const nodes: { data: GraphNodeData }[] = all
  .filter((e) => e?.id)
  .map((entity) => {
    const group = groupOf(entity)
    const category =
      entity.type === 'condition'
        ? entity.category
        : entity.type === 'therapy'
          ? (entity as Therapy).subtype
          : undefined
    // pulse: clamp to 0-10; default 0 (unscored) when absent.
    const rawPulse = (entity as { pulse?: number }).pulse
    const pulse =
      typeof rawPulse === 'number' ? Math.max(0, Math.min(10, rawPulse)) : 0
    return {
      data: {
        id: entity.id,
        label: entity.name,
        group,
        category,
        isDraft: entity.curation?.status === 'draft',
        degree: degree.get(entity.id) ?? 0,
        pulse,
        timelineDate:
          entity.type === 'therapy' || entity.type === 'trial'
            ? entity.timeline?.date
            : undefined,
        entity,
      },
    }
  })

// --- bail out on any error -------------------------------------------------
if (errors.length > 0) {
  console.error(`\n✗ build-data failed with ${errors.length} error(s):\n`)
  for (const e of errors) console.error(`  • ${e}`)
  console.error('')
  process.exit(1)
}

// --- meta + write ----------------------------------------------------------
const counts = nodes.reduce(
  (acc, n) => {
    acc[n.data.group] = (acc[n.data.group] ?? 0) + 1
    return acc
  },
  {} as Record<NodeGroup, number>,
)

const lastUpdated = all.reduce(
  (max, e) => (e.curation?.lastUpdated > max ? e.curation.lastUpdated : max),
  '0000-00-00',
)

const draftCount = nodes.filter((n) => n.data.isDraft).length
const scoredCount = nodes.filter((n) => n.data.pulse > 0).length
// Validate every item above, then omit unreviewed research from the public feed.
const sortedNews = news.filter((item) => item.reviewStatus !== 'draft').sort((a, b) => {
  const dateOrder = b.publishedAt.localeCompare(a.publishedAt)
  return dateOrder || a.id.localeCompare(b.id)
})

const graph: GraphData = {
  meta: {
    generatedAt: new Date().toISOString(),
    lastUpdated,
    counts,
    draftCount,
    total: nodes.length,
    newsCount: sortedNews.length,
    latestNewsDate: sortedNews[0]?.publishedAt,
  },
  news: sortedNews,
  elements: { nodes, edges: edges.map((data) => ({ data })) },
}

mkdirSync(dirname(OUT_FILE), { recursive: true })
writeFileSync(OUT_FILE, JSON.stringify(graph, null, 2) + '\n', 'utf8')

console.log('✓ build-data: wrote public/graph.json')
console.log(
  `  nodes: ${nodes.length}  edges: ${edges.length}  drafts: ${draftCount}  pulse-scored: ${scoredCount}`,
)
console.log(`  news: ${sortedNews.length}${sortedNews[0] ? `  latest: ${sortedNews[0].publishedAt}` : ''}`)
console.log(
  `  by group: ${Object.entries(counts)
    .map(([g, c]) => `${g}=${c}`)
    .join('  ')}`,
)
console.log(`  lastUpdated: ${lastUpdated}`)
