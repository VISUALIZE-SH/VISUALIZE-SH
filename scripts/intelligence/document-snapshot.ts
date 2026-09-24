import { createHash } from 'node:crypto'
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { stableHash, writeDraftProposal } from './snapshot'

const MAX_DOCUMENT_BYTES = 100_000_000
const OFFICIAL_DOCUMENT_HOSTS = new Set([
  'www.accessdata.fda.gov',
  'www.fda.gov',
  'clinicaltrials.gov',
  'cdn.clinicaltrials.gov',
])
const EXTENSIONS = new Set(['.pdf', '.html', '.htm', '.json', '.xml', '.txt'])

export interface DocumentSnapshot {
  schemaVersion: 1
  kind: 'public_document'
  identifier: string
  sourceUrl: string
  retrievedAt: string
  contentHash: string
  byteLength: number
  contentFile: string
  originalFilename: string
}

export interface DocumentCaptureOptions {
  identifier: string
  sourceUrl: string
  filePath: string
  retrievedAt: string
  snapshotDir: string
  queuePath: string
}

export interface DocumentCaptureResult {
  snapshotPath: string
  metadataPath: string
  contentHash: string
  snapshotCreated: boolean
  proposalCreated: boolean
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  try {
    writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
    renameSync(temporary, path)
  } finally {
    rmSync(temporary, { force: true })
  }
}

function validateIdentity(identifier: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,119}$/.test(identifier)) throw new Error('document identifier must use 2-120 letters, digits, dots, underscores, or hyphens')
  return identifier
}

function validateSourceUrl(sourceUrl: string): void {
  const url = new URL(sourceUrl)
  if (url.protocol !== 'https:' || url.username || url.password || !OFFICIAL_DOCUMENT_HOSTS.has(url.hostname)) {
    throw new Error(`document source URL must be public HTTPS on an allowlisted FDA or ClinicalTrials.gov host`)
  }
}

function fileHash(path: string): { contentHash: string; bytes: Buffer } {
  const stat = statSync(path)
  if (!stat.isFile()) throw new Error('document path must be a regular local file')
  if (stat.size > MAX_DOCUMENT_BYTES) throw new Error(`document exceeds ${MAX_DOCUMENT_BYTES} bytes`)
  const bytes = readFileSync(path)
  return { contentHash: createHash('sha256').update(bytes).digest('hex'), bytes }
}

function readSnapshots(directory: string, identifier: string, sourceUrl: string): DocumentSnapshot[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory).filter(name => /^[a-f0-9]{64}\.metadata\.json$/.test(name)).map(name => {
    const metadataPath = join(directory, name)
    const snapshot = JSON.parse(readFileSync(metadataPath, 'utf8')) as DocumentSnapshot
    const filenameHash = name.slice(0, -'.metadata.json'.length)
    const contentPath = join(directory, snapshot.contentFile)
    if (snapshot.schemaVersion !== 1 || snapshot.kind !== 'public_document' || snapshot.identifier !== identifier || snapshot.sourceUrl !== sourceUrl || snapshot.contentHash !== filenameHash || basename(snapshot.contentFile) !== snapshot.contentFile || !existsSync(contentPath)) {
      throw new Error(`invalid immutable document snapshot ${metadataPath}`)
    }
    const current = fileHash(contentPath)
    if (current.contentHash !== filenameHash || current.bytes.byteLength !== snapshot.byteLength) throw new Error(`modified immutable document snapshot ${contentPath}`)
    return snapshot
  }).sort((left, right) => left.retrievedAt.localeCompare(right.retrievedAt) || left.contentHash.localeCompare(right.contentHash))
}

export function capturePublicDocument(options: DocumentCaptureOptions): DocumentCaptureResult {
  const identifier = validateIdentity(options.identifier)
  validateSourceUrl(options.sourceUrl)
  if (Number.isNaN(new Date(options.retrievedAt).valueOf()) || !options.retrievedAt.includes('T')) throw new Error('retrievedAt must be an ISO date-time')
  const extension = extname(options.filePath).toLowerCase()
  if (!EXTENSIONS.has(extension)) throw new Error(`unsupported public document extension ${extension || '(none)'}`)
  const acquired = fileHash(options.filePath)
  const directory = resolve(options.snapshotDir, 'documents', identifier)
  const previous = readSnapshots(directory, identifier, options.sourceUrl).at(-1)
  const contentFile = `${acquired.contentHash}${extension}`
  const snapshotPath = join(directory, contentFile)
  const metadataPath = join(directory, `${acquired.contentHash}.metadata.json`)
  const snapshotCreated = !existsSync(metadataPath)
  if (snapshotCreated) {
    mkdirSync(directory, { recursive: true })
    copyFileSync(options.filePath, snapshotPath, constants.COPYFILE_EXCL)
    const metadata: DocumentSnapshot = {
      schemaVersion: 1,
      kind: 'public_document',
      identifier,
      sourceUrl: options.sourceUrl,
      retrievedAt: options.retrievedAt,
      contentHash: acquired.contentHash,
      byteLength: acquired.bytes.byteLength,
      contentFile,
      originalFilename: basename(options.filePath),
    }
    try { atomicJson(metadataPath, metadata) } catch (error) {
      rmSync(snapshotPath, { force: true })
      throw error
    }
  }
  if (!previous || previous.contentHash === acquired.contentHash) {
    return { snapshotPath, metadataPath, contentHash: acquired.contentHash, snapshotCreated, proposalCreated: false }
  }
  const proposal = {
    id: `document-${stableHash({ identifier, sourceUrl: options.sourceUrl, previousHash: previous.contentHash, currentHash: acquired.contentHash }).slice(0, 24)}`,
    status: 'DRAFT' as const,
    kind: 'document_content_changed',
    identifier,
    sourceUrl: options.sourceUrl,
    createdAt: options.retrievedAt,
    previousHash: previous.contentHash,
    currentHash: acquired.contentHash,
    reviewNote: 'Document bytes changed. Review the retained files manually; no semantic or clinical change is inferred.',
  }
  const proposalCreated = writeDraftProposal(resolve(options.queuePath), proposal, options.retrievedAt)
  return { snapshotPath, metadataPath, contentHash: acquired.contentHash, snapshotCreated, proposalCreated }
}
