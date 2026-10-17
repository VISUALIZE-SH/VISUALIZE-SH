import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import yaml from 'js-yaml'
import type { NewsItem } from '../src/types/entities'

export interface RunManifest {
  runDate: string
  windowFrom: string
  windowTo: string
  previousRunDate: string | null
  windowBasis: 'initial-explicit' | 'since-last-completed-run' | 'owner-explicit'
  status: 'prepared' | 'complete'
  candidates: { item: NewsItem; fingerprint: string; reason: 'new' | 'updated' | 'revisited' }[]
  candidateNewsIds: string[]
  backfillNewsIds: string[]
  fingerprints: Record<string, string>
  articlePath?: string
  previewPath?: string
}

const DEFAULT_ROOT = 'artifacts/news-insights'

function validDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid calendar date: ${value}`)
  }
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)]))
  }
  return value
}

function fingerprint(item: NewsItem): string {
  const { reviewStatus: _reviewStatus, ...content } = item
  return createHash('sha256').update(JSON.stringify(canonical(content))).digest('hex')
}

function readRuns(rootDir: string): RunManifest[] {
  const path = join(rootDir, 'runs.json')
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as RunManifest[] : []
}

function save(manifest: RunManifest, rootDir: string): void {
  const runs = readRuns(rootDir)
  const index = runs.findIndex((run) => run.runDate === manifest.runDate)
  if (index < 0) runs.push(manifest)
  else runs[index] = manifest
  runs.sort((a, b) => a.runDate.localeCompare(b.runDate))
  const path = join(rootDir, manifest.runDate, 'run.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`)
  writeFileSync(join(rootDir, 'runs.json'), `${JSON.stringify(runs, null, 2)}\n`)
}

/** Freeze a local candidate inventory. This neither interprets nor approves news. */
export function prepareRun({ runDate, from, windowFrom: explicitWindowFrom, rootDir = DEFAULT_ROOT, newsPath = 'data/news.yaml' }: {
  runDate: string; from?: string; windowFrom?: string; rootDir?: string; newsPath?: string
}): RunManifest {
  validDate(runDate)
  if (from !== undefined && explicitWindowFrom !== undefined) throw new Error('Use either --from or --window-from, not both')
  for (const start of [from, explicitWindowFrom]) {
    if (start === undefined) continue
    validDate(start)
    if (start > runDate) throw new Error('Window start must not follow run date')
  }
  const runs = readRuns(rootDir)
  const previous = runs.filter((run) => run.status === 'complete').sort((a, b) => b.runDate.localeCompare(a.runDate))[0]
  if (previous && runDate < previous.runDate) throw new Error('Run date must not move backwards from the completed checkpoint')
  const manifestPath = join(rootDir, runDate, 'run.json')
  if (existsSync(manifestPath)) {
    const frozen = JSON.parse(readFileSync(manifestPath, 'utf8')) as RunManifest
    if (from !== undefined && from !== frozen.windowFrom) throw new Error('--from must match the frozen same-date window start')
    if (from !== undefined && frozen.windowBasis === 'owner-explicit') throw new Error('--from cannot replace the frozen same-date owner-explicit window; use --window-from')
    if (explicitWindowFrom !== undefined && (explicitWindowFrom !== frozen.windowFrom || frozen.windowBasis !== 'owner-explicit')) {
      throw new Error('--window-from must match the frozen same-date owner-explicit window')
    }
    if (frozen.status === 'prepared' && frozen.previousRunDate !== (previous?.runDate ?? null)) {
      throw new Error('Prepared run has a stale completed checkpoint; deliberately reconcile and reprepare this run')
    }
    return frozen
  }
  if (!previous && !from && explicitWindowFrom === undefined) throw new Error('The first run requires an explicit --from date (or owner override --window-from)')
  if (previous && from !== undefined && from !== previous.runDate) throw new Error('Subsequent runs use the previous completed run date; omit --from')
  const windowFrom = explicitWindowFrom ?? previous?.runDate ?? from!
  const parsed = yaml.load(readFileSync(newsPath, 'utf8'), { schema: yaml.JSON_SCHEMA })
  if (!Array.isArray(parsed)) throw new Error('News YAML must contain an array')
  const fingerprints: Record<string, string> = { ...(previous?.fingerprints ?? {}) }
  const candidates: RunManifest['candidates'] = []
  const backfillNewsIds: string[] = []
  const ids = new Set<string>()
  for (const item of parsed as NewsItem[]) {
    if (!item || typeof item.id !== 'string' || typeof item.publishedAt !== 'string') throw new Error('News record needs id and publishedAt')
    validDate(item.publishedAt)
    if (ids.has(item.id)) throw new Error(`Duplicate news id: ${item.id}`)
    ids.add(item.id)
    if (item.contentType === 'news-insights' || item.contentType === 'editorial' || item.publishedAt > runDate) continue
    const current = fingerprint(item)
    const prior = previous?.fingerprints[item.id]
    fingerprints[item.id] = current
    const unchanged = current === prior
    if (unchanged && (explicitWindowFrom === undefined || item.publishedAt < windowFrom)) continue
    if (item.publishedAt < windowFrom) {
      // Initial older records form the baseline; discovery requires a prior inventory.
      if (previous) backfillNewsIds.push(item.id)
      continue
    }
    candidates.push({ item, fingerprint: current, reason: unchanged ? 'revisited' : prior ? 'updated' : 'new' })
  }
  candidates.sort((a, b) => b.item.publishedAt.localeCompare(a.item.publishedAt) || a.item.id.localeCompare(b.item.id))
  const manifest: RunManifest = {
    runDate, windowFrom, windowTo: runDate, previousRunDate: previous?.runDate ?? null,
    windowBasis: explicitWindowFrom !== undefined ? 'owner-explicit' : previous ? 'since-last-completed-run' : 'initial-explicit', status: 'prepared',
    candidates, candidateNewsIds: candidates.map(({ item }) => item.id),
    backfillNewsIds: backfillNewsIds.sort(), fingerprints,
  }
  save(manifest, rootDir)
  return manifest
}

/** Call only after successful rendering. Existing files are the local completion gate. */
export function completeRun(manifest: RunManifest, { articlePath, previewPath, rootDir = DEFAULT_ROOT }: {
  articlePath: string; previewPath: string; rootDir?: string
}): RunManifest {
  validDate(manifest.runDate)
  const manifestPath = join(rootDir, manifest.runDate, 'run.json')
  if (!existsSync(manifestPath)) throw new Error('Prepare the run before completing it')
  const frozen = JSON.parse(readFileSync(manifestPath, 'utf8')) as RunManifest
  for (const path of [articlePath, previewPath]) {
    if (!existsSync(path) || !statSync(path).isFile() || !statSync(path).size) throw new Error(`Missing or empty completion artifact: ${path}`)
  }
  const latest = readRuns(rootDir).filter((run) => run.status === 'complete').sort((a, b) => b.runDate.localeCompare(a.runDate))[0]
  if (latest && frozen.runDate < latest.runDate) throw new Error('Cannot complete a run behind the completed checkpoint')
  if (frozen.status === 'complete') return frozen
  if (frozen.previousRunDate !== (latest?.runDate ?? null)) {
    throw new Error('Prepared run has a stale completed checkpoint; deliberately reconcile and reprepare this run')
  }
  const completed: RunManifest = { ...frozen, status: 'complete', articlePath: resolve(articlePath), previewPath: resolve(previewPath) }
  save(completed, rootDir)
  return completed
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2)
    const usage = 'Usage: prepare --date YYYY-MM-DD [--from YYYY-MM-DD | --window-from YYYY-MM-DD]'
    if (args.shift() !== 'prepare') throw new Error(usage)
    const options: { runDate?: string; from?: string; windowFrom?: string } = {}
    while (args.length) {
      const flag = args.shift()
      const value = args.shift()
      if (!value || (flag !== '--date' && flag !== '--from' && flag !== '--window-from')) throw new Error(usage)
      const key = flag === '--date' ? 'runDate' : flag === '--from' ? 'from' : 'windowFrom'
      if (options[key]) throw new Error(`Duplicate option: ${flag}`)
      options[key] = value
    }
    if (!options.runDate) throw new Error('--date is required (local Los Angeles calendar date)')
    const manifest = prepareRun({ runDate: options.runDate, from: options.from, windowFrom: options.windowFrom })
    console.log(`Prepared ${manifest.runDate}: ${manifest.windowFrom}–${manifest.windowTo}; ${manifest.candidates.length} candidates, ${manifest.backfillNewsIds.length} backfills (${manifest.status}).`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
