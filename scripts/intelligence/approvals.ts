/** Content-bound owner approvals for generated specs and graph bibliography. */
import { createHash } from 'node:crypto'
import type { IntelligenceData, Provenance } from '../../src/types/intelligence'

export interface GeneratedApprovals { approvedAt: string; records: Record<string, string> }
const collections = ['versions', 'claims', 'decisions', 'indications', 'outcomes', 'media', 'bibliography'] as const

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, stable(child)]))
  return value
}

export function approvalFingerprint(record: Provenance & { id: string }, data: IntelligenceData): string {
  const { reviewStatus: _reviewStatus, ...content } = record
  const sources = record.sourceRefs.map(ref => data.sources.find(source => source.id === ref.sourceId))
  return createHash('sha256').update(JSON.stringify(stable({ content, sources }))).digest('hex')
}

export function snapshotGeneratedApprovals(data: IntelligenceData, approvedAt: string): GeneratedApprovals {
  const records: Record<string, string> = {}
  for (const key of collections) for (const record of data[key] ?? []) {
    if (record.reviewStatus === 'draft') records[record.id] = approvalFingerprint(record, data)
  }
  return { approvedAt, records: Object.fromEntries(Object.entries(records).sort(([a], [b]) => a.localeCompare(b))) }
}

export function applyGeneratedApprovals(data: IntelligenceData, approvals: GeneratedApprovals): IntelligenceData {
  const result = { ...data }
  for (const key of collections) {
    if (!data[key]) continue
    // Each collection retains its concrete record type; only reviewStatus changes.
    Object.assign(result, { [key]: data[key]!.map(record => record.reviewStatus === 'draft'
      && approvals.records[record.id] === approvalFingerprint(record, data)
      ? { ...record, reviewStatus: 'reviewed' as const } : record) })
  }
  return result
}
