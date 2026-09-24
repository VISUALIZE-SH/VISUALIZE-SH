import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

export type EvidenceSource = 'fda-pma' | 'ctgov'
type JsonRecord = Record<string, unknown>

export interface NormalizedEvidence {
  [field: string]: unknown
}

export interface SnapshotEnvelope {
  schemaVersion: 1
  source: EvidenceSource
  identifier: string
  officialUrl: string
  retrievedAt: string
  contentHash: string
  normalized: NormalizedEvidence
  raw: unknown
}

export interface FieldChange {
  path: string
  before?: unknown
  after?: unknown
}

export interface EvidenceProposal {
  id: string
  status: 'DRAFT'
  kind: 'normalized_api_change'
  source: EvidenceSource
  identifier: string
  createdAt: string
  previousHash: string
  currentHash: string
  changes: FieldChange[]
  reviewNote: string
}

interface DraftProposal { id: string; status: 'DRAFT' }

interface ProposalQueue {
  schemaVersion: 1
  updatedAt: string
  proposals: DraftProposal[]
}

const MAX_RESPONSE_BYTES = 5_000_000
const SOURCE_HOSTS: Record<EvidenceSource, string> = { 'fda-pma': 'api.fda.gov', ctgov: 'clinicaltrials.gov' }

function object(value: unknown): JsonRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : undefined
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as JsonRecord).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`).join(',')}}`
  }
  const serialized = JSON.stringify(value)
  if (serialized === undefined) throw new Error('cannot canonicalize undefined')
  return serialized
}

export function stableHash(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex')
}

function getPath(value: unknown, path: string[]): unknown {
  let current = value
  for (const part of path) {
    const record = object(current)
    if (!record) return undefined
    current = record[part]
  }
  return current
}

function strings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const result = value.filter((item): item is string => typeof item === 'string')
  return result.length ? result : undefined
}

function compact(record: JsonRecord): JsonRecord {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined))
}

function normalizeFda(raw: unknown, identifier: string): NormalizedEvidence {
  const root = object(raw)
  const results = root?.results
  if (!Array.isArray(results) || results.length === 0) throw new Error('FDA response has no results')
  const requested = /^(P\d{6})(S\d{3})?$/i.exec(identifier)
  if (!requested) throw new Error('FDA identifier must match P###### or P######S###')
  const matches = results.map(object).filter(candidate => {
    if (!candidate) return false
    const base = String(candidate.pma_number ?? '').toUpperCase()
    const supplement = String(candidate.supplement_number ?? '').toUpperCase()
    return base === requested[1].toUpperCase() && (requested[2] ? supplement === requested[2].toUpperCase() : supplement === '')
  })
  if (matches.length === 0) throw new Error(`FDA response has no exact identity match for ${identifier.toUpperCase()}`)
  if (matches.length > 1) throw new Error(`FDA response has multiple exact identity matches for ${identifier.toUpperCase()}`)
  const result = matches[0] as JsonRecord
  return compact({
    applicationNumber: result.pma_number,
    supplementNumber: result.supplement_number,
    decisionDate: result.decision_date,
    decisionCode: result.decision_code,
    applicant: result.applicant,
    tradeName: result.trade_name,
    productCode: result.product_code,
    supplementType: result.supplement_type,
    supplementReason: result.supplement_reason,
    approvalOrderStatement: result.ao_statement,
  })
}

function normalizeCtgov(raw: unknown, identifier: string): NormalizedEvidence {
  const study = object(object(raw)?.protocolSection ? raw : (object(raw)?.studies as unknown[])?.[0])
  if (!study) throw new Error('ClinicalTrials.gov response has no study')
  const protocol = object(study.protocolSection)
  const identification = object(protocol?.identificationModule)
  const status = object(protocol?.statusModule)
  const design = object(protocol?.designModule)
  const conditions = object(protocol?.conditionsModule)
  const outcomes = object(protocol?.outcomesModule)
  const enrollment = object(design?.enrollmentInfo)
  const nctId = identification?.nctId
  if (typeof nctId !== 'string' || !nctId) throw new Error('ClinicalTrials.gov response is missing nctId')
  if (nctId.toUpperCase() !== identifier.toUpperCase()) throw new Error(`ClinicalTrials.gov response is for ${nctId}, not ${identifier}`)
  const normalizeOutcome = (value: unknown) => {
    const item = object(value)
    return item ? compact({ measure: item.measure, description: item.description, timeFrame: item.timeFrame }) : undefined
  }
  return compact({
    nctId,
    briefTitle: identification?.briefTitle,
    officialTitle: identification?.officialTitle,
    overallStatus: status?.overallStatus,
    studyType: design?.studyType,
    enrollment: enrollment ? compact({ count: enrollment.count, type: enrollment.type }) : undefined,
    startDate: getPath(status, ['startDateStruct', 'date']),
    startDateType: getPath(status, ['startDateStruct', 'type']),
    primaryCompletionDate: getPath(status, ['primaryCompletionDateStruct', 'date']),
    primaryCompletionDateType: getPath(status, ['primaryCompletionDateStruct', 'type']),
    completionDate: getPath(status, ['completionDateStruct', 'date']),
    completionDateType: getPath(status, ['completionDateStruct', 'type']),
    studyFirstSubmitDate: status?.studyFirstSubmitDate,
    studyFirstPostDate: getPath(status, ['studyFirstPostDateStruct', 'date']),
    lastUpdateSubmitDate: status?.lastUpdateSubmitDate,
    lastUpdatePostDate: getPath(status, ['lastUpdatePostDateStruct', 'date']),
    conditions: strings(conditions?.conditions),
    primaryOutcomes: Array.isArray(outcomes?.primaryOutcomes) ? outcomes?.primaryOutcomes.map(normalizeOutcome).filter(Boolean) : undefined,
  })
}

export function normalizeEvidence(source: EvidenceSource, raw: unknown, identifier: string): NormalizedEvidence {
  return source === 'fda-pma' ? normalizeFda(raw, identifier) : normalizeCtgov(raw, identifier)
}

export function officialUrl(source: EvidenceSource, identifier: string): string {
  if (source === 'ctgov') {
    if (!/^NCT\d{8}$/i.test(identifier)) throw new Error('ctgov identifier must match NCT########')
    return `https://clinicaltrials.gov/api/v2/studies/${identifier.toUpperCase()}`
  }
  const match = /^(P\d{6})(S\d{3})?$/i.exec(identifier)
  if (!match) throw new Error('fda-pma identifier must match P###### or P######S###')
  const query = match[2]
    ? `pma_number:${JSON.stringify(match[1].toUpperCase())} AND supplement_number:${JSON.stringify(match[2].toUpperCase())}`
    : `pma_number:${JSON.stringify(match[1].toUpperCase())}`
  return `https://api.fda.gov/device/pma.json?search=${encodeURIComponent(query)}&limit=100`
}

export async function fetchOfficialJson(source: EvidenceSource, identifier: string, fetcher: typeof fetch = fetch): Promise<{ url: string; raw: unknown }> {
  const url = officialUrl(source, identifier)
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || parsed.hostname !== SOURCE_HOSTS[source]) throw new Error(`refusing non-allowlisted URL ${url}`)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetcher(url, { method: 'GET', headers: { Accept: 'application/json', 'User-Agent': 'VISUALIZE-SH-evidence-snapshot/1.0' }, redirect: 'error', signal: controller.signal })
    if (!response.ok) throw new Error(`${source} returned HTTP ${response.status}`)
    const length = Number(response.headers.get('content-length') ?? '0')
    if (length > MAX_RESPONSE_BYTES) throw new Error(`${source} response exceeds ${MAX_RESPONSE_BYTES} bytes`)
    const text = await response.text()
    if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) throw new Error(`${source} response exceeds ${MAX_RESPONSE_BYTES} bytes`)
    return { url, raw: JSON.parse(text) as unknown }
  } finally {
    clearTimeout(timeout)
  }
}

export function diffNormalized(before: unknown, after: unknown, path = '$'): FieldChange[] {
  if (before === undefined && after === undefined) return []
  if (before !== undefined && after !== undefined && canonicalJson(before) === canonicalJson(after)) return []
  const left = object(before)
  const right = object(after)
  if (left && right) {
    const changes: FieldChange[] = []
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()
    for (const key of keys) changes.push(...diffNormalized(left[key], right[key], `${path}.${key}`))
    return changes
  }
  const change: FieldChange = { path }
  if (before !== undefined) change.before = before
  if (after !== undefined) change.after = after
  return [change]
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

function readSnapshots(directory: string, source: EvidenceSource, identifier: string): SnapshotEnvelope[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory).filter(name => /^[a-f0-9]{64}\.json$/.test(name)).map(name => {
    const snapshot = JSON.parse(readFileSync(join(directory, name), 'utf8')) as SnapshotEnvelope
    const filenameHash = name.slice(0, -5)
    if (snapshot.schemaVersion !== 1 || snapshot.source !== source || snapshot.identifier !== identifier || snapshot.contentHash !== filenameHash || stableHash(snapshot.raw) !== filenameHash) {
      throw new Error(`invalid or modified immutable snapshot ${join(directory, name)}`)
    }
    return snapshot
  })
    .sort((left, right) => left.retrievedAt.localeCompare(right.retrievedAt) || left.contentHash.localeCompare(right.contentHash))
}

export function writeDraftProposal(queuePath: string, proposal: DraftProposal, now: string): boolean {
  if (queuePath.endsWith('.yaml') || queuePath.endsWith('.yml') || basename(queuePath) === 'news.json') throw new Error('proposal queue must be a dedicated JSON file, not curated YAML or news')
  let queue: ProposalQueue = { schemaVersion: 1, updatedAt: now, proposals: [] }
  if (existsSync(queuePath)) queue = JSON.parse(readFileSync(queuePath, 'utf8')) as ProposalQueue
  if (queue.schemaVersion !== 1 || !Array.isArray(queue.proposals)) throw new Error('proposal queue has an unsupported shape')
  if (queue.proposals.some(item => item.id === proposal.id)) return false
  queue.proposals.push(proposal)
  queue.proposals.sort((left, right) => left.id.localeCompare(right.id))
  queue.updatedAt = now
  atomicJson(queuePath, queue)
  return true
}

export interface CaptureOptions {
  source: EvidenceSource
  identifier: string
  raw: unknown
  officialUrl: string
  retrievedAt: string
  snapshotDir: string
  queuePath: string
}

export interface CaptureResult {
  snapshotPath: string
  contentHash: string
  snapshotCreated: boolean
  proposalCreated: boolean
  changes: FieldChange[]
}

export function captureEvidence(options: CaptureOptions): CaptureResult {
  if (Number.isNaN(new Date(options.retrievedAt).valueOf()) || !options.retrievedAt.includes('T')) throw new Error('retrievedAt must be an ISO date-time')
  const identifier = options.identifier.toUpperCase()
  const url = new URL(options.officialUrl)
  if (url.protocol !== 'https:' || url.hostname !== SOURCE_HOSTS[options.source] || options.officialUrl !== officialUrl(options.source, identifier)) throw new Error(`refusing non-allowlisted officialUrl ${options.officialUrl}`)
  const contentHash = stableHash(options.raw)
  const directory = resolve(options.snapshotDir, options.source, identifier)
  const snapshots = readSnapshots(directory, options.source, identifier)
  const previous = snapshots.at(-1)
  const normalized = normalizeEvidence(options.source, options.raw, identifier)
  const snapshot: SnapshotEnvelope = { schemaVersion: 1, source: options.source, identifier, officialUrl: options.officialUrl, retrievedAt: options.retrievedAt, contentHash, normalized, raw: options.raw }
  const snapshotPath = join(directory, `${contentHash}.json`)
  const snapshotCreated = !existsSync(snapshotPath)
  if (snapshotCreated) atomicJson(snapshotPath, snapshot)
  if (previous?.contentHash === contentHash) return { snapshotPath, contentHash, snapshotCreated, proposalCreated: false, changes: [] }
  const changes = previous ? diffNormalized(previous.normalized, normalized) : []
  if (!previous || changes.length === 0) return { snapshotPath, contentHash, snapshotCreated, proposalCreated: false, changes }
  const proposalId = `evidence-${stableHash({ source: options.source, identifier, previousHash: previous.contentHash, currentHash: contentHash }).slice(0, 24)}`
  const proposal: EvidenceProposal = {
    id: proposalId, status: 'DRAFT', kind: 'normalized_api_change', source: options.source, identifier, createdAt: options.retrievedAt,
    previousHash: previous.contentHash, currentHash: contentHash, changes,
    reviewNote: 'Review against the official detail page and supporting documents before updating curated intelligence or news.',
  }
  const proposalCreated = writeDraftProposal(resolve(options.queuePath), proposal, options.retrievedAt)
  return { snapshotPath, contentHash, snapshotCreated, proposalCreated, changes }
}
