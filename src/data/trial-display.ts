import type { EnrollmentCount, PrimaryAnalysis, Trial, TrialStatus } from '../types/entities'

const STATUS_LABELS: Record<TrialStatus, string> = {
  'not-yet-recruiting': 'Not yet recruiting',
  recruiting: 'Recruiting',
  active: 'Active',
  completed: 'Completed',
  suspended: 'Suspended',
  terminated: 'Terminated',
  unknown: 'Unknown',
}

/** The registry's overall status, as displayed; independent of primaryAnalysis. */
export function trialStatusLabel(status?: TrialStatus): string | undefined {
  return status ? STATUS_LABELS[status] : undefined
}

/** "Reported (2024-05)" or "Not reported"; the date follows its stated precision. */
export function primaryAnalysisLabel(analysis?: PrimaryAnalysis): string | undefined {
  if (!analysis) return undefined
  if (analysis.status === 'not-reported') return 'Not reported'
  if (!analysis.date) return 'Reported'
  const length = analysis.precision === 'year' ? 4 : analysis.precision === 'month' ? 7 : 10
  return `Reported (${analysis.date.slice(0, length)})`
}

/** "250 randomized", "312 enrolled (actual)", "400 enrolled (estimated, excludes roll-in)". */
export function enrollmentCountLabel(entry: EnrollmentCount): string {
  const enrolled = entry.basis === 'actual' || entry.basis === 'estimated'
  const qualifiers = [enrolled ? entry.basis : undefined, entry.scope].filter(Boolean)
  return `${entry.count.toLocaleString('en-US')} ${enrolled ? 'enrolled' : entry.basis}${qualifiers.length ? ` (${qualifiers.join(', ')})` : ''}`
}

/** Typed counts when present; otherwise the legacy headline count, unchanged. */
export function enrollmentEntries(trial: Pick<Trial, 'enrollment' | 'enrollmentCounts'>): Array<{ label: string; count?: EnrollmentCount }> {
  if (trial.enrollmentCounts?.length) {
    return trial.enrollmentCounts.map((count) => ({ label: enrollmentCountLabel(count), count }))
  }
  return trial.enrollment ? [{ label: trial.enrollment.toLocaleString() }] : []
}
