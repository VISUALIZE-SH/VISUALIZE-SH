import type { Trial } from '../src/types/entities'

export interface TrialIssues {
  errors: string[]
  warnings: string[]
}

/**
 * Cross-field checks for the registry-status, primary-analysis and typed
 * enrollment fields. Shape, enums and formats belong to schema/trial.schema.json;
 * these rules cover relationships the schema cannot express (or restate the
 * most important one so the message names the field).
 */
export function trialIssues(
  trial: Pick<Trial, 'enrollment' | 'enrollmentCounts' | 'primaryAnalysis'>,
): TrialIssues {
  const errors: string[] = []
  const warnings: string[] = []

  const analysis = trial.primaryAnalysis
  if (analysis?.status === 'reported' && !analysis.source) {
    errors.push('primaryAnalysis.source is required when primaryAnalysis.status is "reported"')
  }
  if (analysis?.date && !analysis.precision) {
    errors.push('primaryAnalysis.precision is required with primaryAnalysis.date')
  }

  const counts = trial.enrollmentCounts ?? []
  const seen = new Set<string>()
  for (const [index, entry] of counts.entries()) {
    const key = `${entry.basis}\u0000${entry.scope ?? ''}`
    if (seen.has(key)) {
      errors.push(
        `enrollmentCounts[${index}] repeats basis "${entry.basis}"${entry.scope ? ` with scope "${entry.scope}"` : ' without a scope'}; each basis and scope pair must be unique`,
      )
    }
    seen.add(key)
  }

  if (trial.enrollment !== undefined && counts.length > 0 && !counts.some((entry) => entry.count === trial.enrollment)) {
    warnings.push(
      `enrollment ${trial.enrollment} matches none of enrollmentCounts (${counts.map((entry) => `${entry.count} ${entry.basis}`).join(', ')}); reconcile or drop the legacy field`,
    )
  }

  return { errors, warnings }
}
