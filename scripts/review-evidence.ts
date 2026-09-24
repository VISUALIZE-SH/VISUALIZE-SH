/** Assemble one local review packet from evidence changes and the existing weekly workflow. */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IntelligenceData } from '../src/types/intelligence'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function reviewPacket(data: IntelligenceData, sourceProposals: unknown[], weeklyProposals: unknown[]) {
  const groups = ['versions', 'claims', 'decisions', 'indications', 'trials', 'trialSnapshots', 'cohorts', 'endpoints', 'readouts', 'outcomes', 'lineage', 'events'] as const
  const draftRecords = groups.flatMap(collection => data[collection].filter(record => record.reviewStatus === 'draft').map(record => ({ collection, id: record.id, sourceRefs: record.sourceRefs })))
  return {
    schemaVersion: 1,
    datasetUpdatedAt: data.updatedAt,
    instructions: 'Review source changes and weekly proposals together. Confirm model, jurisdiction, cohort, endpoint and source locator before editing authored YAML. This packet never applies or approves changes.',
    summary: { draftRecords: draftRecords.length, sourceChanges: sourceProposals.length, weeklyArtifacts: weeklyProposals.length },
    draftRecords,
    missingFields: data.claims.filter(claim => claim.availability !== 'reported').map(claim => ({ id: claim.id, versionId: claim.versionId, label: claim.label, availability: claim.availability, limitation: claim.limitation })),
    unresolvedTrialMappings: data.trials.filter(trial => trial.versionMapping !== 'exact').map(trial => ({ id: trial.id, name: trial.name, familyIds: trial.familyIds, versionMapping: trial.versionMapping, sourceRefs: trial.sourceRefs })),
    sourceChanges: sourceProposals,
    weeklyProposals,
  }
}

function json(path: string): unknown { return JSON.parse(readFileSync(path, 'utf8')) as unknown }
function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value as Record<string, unknown>
}

function main() {
  const args = process.argv.slice(2)
  if (args.length && (args.length !== 2 || args[0] !== '--output')) throw new Error('Usage: npm run review:prepare -- [--output path]')
  const output = resolve(ROOT, args[1] ?? 'artifacts/evidence/review-packet.json')
  if (!output.startsWith(`${join(ROOT, 'artifacts')}/`)) throw new Error('Review packets must stay under artifacts/ and are never public data')
  const data = json(join(ROOT, 'public/intelligence.json')) as IntelligenceData
  const queuePath = join(ROOT, 'artifacts/evidence/review-queue.json')
  const sourceProposals: unknown[] = []
  if (existsSync(queuePath)) {
    const queue = record(json(queuePath), 'source review queue')
    if (!Array.isArray(queue.proposals)) throw new Error('Source review queue must contain proposals')
    sourceProposals.push(...queue.proposals)
  }
  const weeklyProposals: unknown[] = []
  const weeklyPath = join(ROOT, 'artifacts/weekly-research.json')
  if (existsSync(weeklyPath)) weeklyProposals.push({ path: 'artifacts/weekly-research.json', record: json(weeklyPath) })
  const reviewedDir = join(ROOT, 'data/research-proposals')
  if (existsSync(reviewedDir)) for (const name of readdirSync(reviewedDir).filter(name => /^\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort()) {
    weeklyProposals.push({ path: `data/research-proposals/${name}`, record: json(join(reviewedDir, name)) })
  }
  const packet = reviewPacket(data, sourceProposals, weeklyProposals)
  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, `${JSON.stringify(packet, null, 2)}\n`)
  console.log(`Local review packet: ${packet.summary.draftRecords} draft records, ${sourceProposals.length} source changes, ${weeklyProposals.length} weekly artifacts. No changes applied.`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main() } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 }
}
