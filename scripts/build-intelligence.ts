/** Compile reviewed/draft intelligence YAML into a deterministic public JSON payload. */
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import type { IntelligenceData } from '../src/types/intelligence'
import { defaultIntelligencePaths, loadIntelligenceSource } from './intelligence/catalog'
import { loadLegacyIds, validateIntelligence } from './intelligence/validation'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export interface BuildIntelligenceOptions {
  input: string
  taxonomy?: string
  catalogDir?: string
  comparative?: string
  output: string
  schema: string
  legacyDataDir: string
  graph?: string
}

// Stable key and identified-record order makes generated diffs reviewable and
// avoids rewriting public/intelligence.json when source order alone changes.
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(canonicalize)
    if (items.every(item => item && typeof item === 'object' && !Array.isArray(item) && typeof (item as { id?: unknown }).id === 'string')) {
      return items.sort((left, right) => String((left as { id: string }).id).localeCompare(String((right as { id: string }).id)))
    }
    return items
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, canonicalize(child)]))
  }
  return value
}

export function compileIntelligence(options: BuildIntelligenceOptions): { data: IntelligenceData; json: string; changed: boolean } {
  const source = loadIntelligenceSource(options)
  const comparative = options.comparative ? yaml.load(readFileSync(options.comparative, 'utf8'), { schema: yaml.CORE_SCHEMA }) : undefined
  const combined = comparative === undefined ? source : { ...(source as object), comparative }
  const legacyIds = loadLegacyIds(options.legacyDataDir, options.graph)
  const data = validateIntelligence(combined, { schemaPath: options.schema, legacyIds })
  const json = `${JSON.stringify(canonicalize(data), null, 2)}\n`
  let previous: string | undefined
  try { previous = readFileSync(options.output, 'utf8') } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  if (previous === json) return { data, json, changed: false }
  mkdirSync(dirname(options.output), { recursive: true })
  const temporary = `${options.output}.${process.pid}.tmp`
  try {
    writeFileSync(temporary, json, { encoding: 'utf8', flag: 'wx' })
    renameSync(temporary, options.output)
  } finally {
    rmSync(temporary, { force: true })
  }
  return { data, json, changed: true }
}

function parseArgs(argv: string[]): BuildIntelligenceOptions {
  const options: BuildIntelligenceOptions = {
    ...defaultIntelligencePaths(ROOT),
    comparative: resolve(ROOT, 'data/intelligence/comparative-pilot.yaml'),
    output: resolve(ROOT, 'public/intelligence.json'),
    schema: resolve(ROOT, 'schema/intelligence.schema.json'),
    legacyDataDir: resolve(ROOT, 'data'),
    graph: resolve(ROOT, 'public/graph.json'),
  }
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (argument === '--help') {
      console.log('Usage: tsx scripts/build-intelligence.ts [--input path] [--taxonomy path] [--catalog dir] [--comparative path] [--output path] [--schema path] [--legacy-data path] [--graph path]')
      process.exit(0)
    }
    const value = argv[++index]
    if (!value) throw new Error(`${argument} requires a path`)
    if (argument === '--input') options.input = resolve(ROOT, value)
    else if (argument === '--taxonomy') options.taxonomy = resolve(ROOT, value)
    else if (argument === '--catalog') options.catalogDir = resolve(ROOT, value)
    else if (argument === '--comparative') options.comparative = resolve(ROOT, value)
    else if (argument === '--output') options.output = resolve(ROOT, value)
    else if (argument === '--schema') options.schema = resolve(ROOT, value)
    else if (argument === '--legacy-data') options.legacyDataDir = resolve(ROOT, value)
    else if (argument === '--graph') options.graph = resolve(ROOT, value)
    else throw new Error(`unknown argument ${argument}`)
  }
  return options
}

function main(): void {
  const options = parseArgs(process.argv.slice(2))
  const result = compileIntelligence(options)
  console.log(`intelligence: ${result.changed ? 'wrote' : 'unchanged'} ${relative(ROOT, options.output)} (${result.data.sources.length} sources, ${result.data.versions.length} versions, ${result.data.outcomes.length} outcomes)`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main() } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
