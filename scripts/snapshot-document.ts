/** Capture an already-downloaded public FDA or ClinicalTrials.gov document. This command never fetches. */
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { capturePublicDocument } from './intelligence/document-snapshot'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function usage(): string {
  return 'Usage: tsx scripts/snapshot-document.ts --id IDENTIFIER --source-url HTTPS_URL --file LOCAL_FILE [--snapshot-dir path] [--queue path] [--retrieved-at ISO_DATETIME]'
}

function parseArgs(argv: string[]) {
  let identifier: string | undefined
  let sourceUrl: string | undefined
  let filePath: string | undefined
  let snapshotDir = resolve(ROOT, 'artifacts/evidence/snapshots')
  let queuePath = resolve(ROOT, 'artifacts/evidence/review-queue.json')
  let retrievedAt = new Date().toISOString()
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (argument === '--help') { console.log(usage()); process.exit(0) }
    if (argument === '--fetch') throw new Error('snapshot-document never fetches; provide --file')
    const value = argv[++index]
    if (!value) throw new Error(`${argument} requires a value`)
    if (argument === '--id') identifier = value
    else if (argument === '--source-url') sourceUrl = value
    else if (argument === '--file') filePath = resolve(ROOT, value)
    else if (argument === '--snapshot-dir') snapshotDir = resolve(ROOT, value)
    else if (argument === '--queue') queuePath = resolve(ROOT, value)
    else if (argument === '--retrieved-at') retrievedAt = value
    else throw new Error(`unknown argument ${argument}`)
  }
  if (!identifier || !sourceUrl || !filePath) throw new Error(`--id, --source-url, and --file are required\n${usage()}`)
  return { identifier, sourceUrl, filePath, snapshotDir, queuePath, retrievedAt }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2))
  const result = capturePublicDocument(options)
  console.log(JSON.stringify({
    mode: 'local-public-document', identifier: options.identifier, sourceUrl: options.sourceUrl,
    snapshot: relative(ROOT, result.snapshotPath), metadata: relative(ROOT, result.metadataPath),
    snapshotCreated: result.snapshotCreated, contentHash: result.contentHash, proposalCreated: result.proposalCreated,
  }, null, 2))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main() } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 }
}
