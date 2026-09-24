/** Bounded, review-only snapshots for official FDA PMA and ClinicalTrials.gov APIs. */
import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { captureEvidence, fetchOfficialJson, officialUrl, type EvidenceSource } from './intelligence/snapshot'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

interface CliOptions {
  source: EvidenceSource
  identifier: string
  fixture?: string
  fetch: boolean
  snapshotDir: string
  queuePath: string
  retrievedAt: string
}

function usage(): string {
  return 'Usage: tsx scripts/snapshot-evidence.ts --source fda-pma|ctgov --id IDENTIFIER [--fixture path | --fetch] [--snapshot-dir path] [--queue path] [--retrieved-at ISO_DATETIME]'
}

function parseArgs(argv: string[]): CliOptions {
  let source: EvidenceSource | undefined
  let identifier: string | undefined
  let fixture: string | undefined
  let fetch = false
  let snapshotDir = resolve(ROOT, 'artifacts/evidence/snapshots')
  let queuePath = resolve(ROOT, 'artifacts/evidence/review-queue.json')
  let retrievedAt = new Date().toISOString()
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (argument === '--help') { console.log(usage()); process.exit(0) }
    if (argument === '--fetch') { fetch = true; continue }
    const value = argv[++index]
    if (!value) throw new Error(`${argument} requires a value`)
    if (argument === '--source') {
      if (value !== 'fda-pma' && value !== 'ctgov') throw new Error('--source must be fda-pma or ctgov')
      source = value
    } else if (argument === '--id') identifier = value
    else if (argument === '--fixture') fixture = resolve(ROOT, value)
    else if (argument === '--snapshot-dir') snapshotDir = resolve(ROOT, value)
    else if (argument === '--queue') queuePath = resolve(ROOT, value)
    else if (argument === '--retrieved-at') retrievedAt = value
    else throw new Error(`unknown argument ${argument}`)
  }
  if (!source || !identifier) throw new Error(`--source and --id are required\n${usage()}`)
  if (fetch && fixture) throw new Error('--fetch and --fixture are mutually exclusive')
  if (!fetch && !fixture) fixture = resolve(ROOT, `scripts/intelligence/fixtures/${source}.json`)
  return { source, identifier: identifier.toUpperCase(), fixture, fetch, snapshotDir, queuePath, retrievedAt }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const acquired = options.fetch
    ? await fetchOfficialJson(options.source, options.identifier)
    : { url: officialUrl(options.source, options.identifier), raw: JSON.parse(readFileSync(options.fixture as string, 'utf8')) as unknown }
  const result = captureEvidence({
    source: options.source, identifier: options.identifier, raw: acquired.raw, officialUrl: acquired.url,
    retrievedAt: options.retrievedAt, snapshotDir: options.snapshotDir, queuePath: options.queuePath,
  })
  console.log(JSON.stringify({
    mode: options.fetch ? 'official-api' : 'local-fixture', source: options.source, identifier: options.identifier,
    snapshot: relative(ROOT, result.snapshotPath), snapshotCreated: result.snapshotCreated,
    contentHash: result.contentHash, proposalCreated: result.proposalCreated, changedFields: result.changes.length,
  }, null, 2))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
}
