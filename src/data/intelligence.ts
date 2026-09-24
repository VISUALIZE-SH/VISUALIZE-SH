import type {
  EvidenceDate,
  IntelligenceEvent,
  IntelligenceData,
  LineageEdge,
  ProductVersion,
  EvidenceMedia,
  SourceRef,
} from '../types/intelligence'

/** Fetch the optional, source-linked pilot separately from the graph payload. */
export async function loadIntelligence(): Promise<IntelligenceData> {
  const baseUrl = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
  const response = await fetch(`${baseUrl}intelligence.json`)
  if (!response.ok) {
    throw new Error(`Failed to load intelligence data (HTTP ${response.status})`)
  }
  return (await response.json()) as IntelligenceData
}

export function dateValue(value: EvidenceDate | string | undefined): string {
  return typeof value === 'string' ? value : value?.value ?? ''
}

/** Date-only comparisons deliberately avoid a browser time-zone conversion. */
export function isOnOrBefore(value: EvidenceDate | string | undefined, asOf?: string): boolean {
  if (!asOf) return true
  const raw = dateValue(value)
  const date = typeof value === 'string' || !value ? raw : value.precision === 'year'
    ? `${raw.slice(0, 4)}-12-31`
    : value.precision === 'month'
      ? `${raw.slice(0, 7)}-${String(new Date(Date.UTC(Number(raw.slice(0, 4)), Number(raw.slice(5, 7)), 0)).getUTCDate()).padStart(2, '0')}`
      : raw
  return Boolean(date) && date.slice(0, 10) <= asOf.slice(0, 10)
}

export function formatEvidenceDate(value: EvidenceDate | string | undefined): string {
  const raw = dateValue(value)
  if (!raw) return 'Not reported'
  const [year, month, day] = raw.split('-').map(Number)
  if (!year) return raw
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1))
  const formatted = new Intl.DateTimeFormat(undefined, {
    timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric',
  }).format(date)
  if (typeof value !== 'string' && value && value.precision !== 'day') {
    return value.precision === 'year' ? String(year) : formatted.replace(/\s\d{1,2},/, '')
  }
  return formatted
}

export function sourceFor(data: IntelligenceData, refs: SourceRef[]): string {
  const source = refs.map((ref) => data.sources.find((item) => item.id === ref.sourceId)).find(Boolean)
  return source ? `${source.publisher} · ${refs[0]?.locator ?? 'source record'}` : 'Source not linked'
}

export function sourceUrl(data: IntelligenceData, refs: SourceRef[]): string | undefined {
  return refs.map((ref) => data.sources.find((item) => item.id === ref.sourceId)?.url).find(Boolean)
}

export function sourceUrls(data: IntelligenceData, refs: SourceRef[]): string {
  return refs.map((ref) => data.sources.find((item) => item.id === ref.sourceId)?.url).filter((url): url is string => Boolean(url)).join('; ')
}

export function availabilityLabel(value: string): string {
  const labels: Record<string, string> = {
    not_publicly_disclosed: 'Not publicly disclosed',
    not_yet_reviewed: 'Not yet reviewed',
    not_applicable: 'Not applicable',
    conflicting: 'Conflicting public record',
    reported: 'Reported',
  }
  return labels[value] ?? value.replace(/_/g, ' ')
}

export function displayValue(value: string | number | boolean | undefined, unit?: string, availability?: string): string {
  if (value === undefined || value === null || value === '') return availability ? availabilityLabel(availability) : 'Not reported'
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
  return unit ? `${display} ${unit}` : display
}

export interface OutcomeDisplayRow {
  id: string
  outcomeId: string
  versionIds: string[]
  versionContext: string
  trialId: string
  trial: string
  nctId?: string
  cohortId: string
  cohort: string
  cohortPopulation: string
  enrollment: string
  readoutId: string
  readout: string
  followUp: string
  endpointId: string
  endpoint: string
  endpointDefinition: string
  endpointMeasureType: string
  endpointAnalysisPopulation: string
  hierarchy: string
  arm: string
  armValues: string
  value?: number
  unit?: string
  denominator?: string
  effect: string
  ci: string
  pValue?: number
  pValueQualifier?: '=' | '<' | '>'
  interpretation: string
  limitation?: string
  observedAt: string
  source: string
  sourceUrl?: string
  sourceUrls: string
  sourceIds: string
  sourceLocators: string
  reviewStatus: string
}

/** One rendered/exported row represents one arm's observation at one readout. */
export function outcomeRows(data: IntelligenceData, versionId?: string | null, asOf?: string): OutcomeDisplayRow[] {
  const trials = new Map(data.trials.map((item) => [item.id, item]))
  const cohorts = new Map(data.cohorts.map((item) => [item.id, item]))
  const endpoints = new Map(data.endpoints.map((item) => [item.id, item]))
  const readouts = new Map(data.readouts.map((item) => [item.id, item]))
  const armName = (cohortId: string, armId: string) =>
    cohorts.get(cohortId)?.arms.find((arm) => arm.id === armId)?.name ?? armId

  return data.outcomes.flatMap((outcome) => {
    const readout = readouts.get(outcome.readoutId)
    const trial = readout ? trials.get(readout.trialId) : undefined
    const cohort = readout ? cohorts.get(readout.cohortId) : undefined
    const endpoint = endpoints.get(outcome.endpointId)
    if (!readout || !trial || !cohort || !endpoint || !isOnOrBefore(readout.publishedAt, asOf)) return []
    const versions = readout.versionIds.length ? readout.versionIds : trial.versionIds
    const selectedVersion = versionById(data, versionId)
    const familyKnown = Boolean(selectedVersion && trial.familyIds?.includes(selectedVersion.familyId))
    if (versionId && !versions.includes(versionId) && !familyKnown) return []
    const enrollment = cohort.enrollment.map((item) => `${item.value} ${item.stage}`).join('; ') || 'Not reported'
    const effect = outcome.effect ? `${outcome.effect.measure} ${outcome.effect.value}${outcome.effect.unit ? ` ${outcome.effect.unit}` : ''}` : 'Not reported'
    const ci = outcome.effect?.ci
      ? `${outcome.effect.ci.level ?? 'level not reported'}${outcome.effect.ci.level ? '%' : ''} ${outcome.effect.ci.sidedness === 'one_sided' ? 'one-sided' : 'two-sided'} CI: ${outcome.effect.ci.lower ?? 'not reported'} to ${outcome.effect.ci.upper ?? 'not reported'}`
      : 'Not reported'
    const arms: { armId: string; value?: number; unit?: string; denominator?: number }[] = outcome.arms.length ? outcome.arms : [{ armId: 'effect-level' }]
    return arms.map((arm) => ({
      id: `${outcome.id}:${arm.armId}`,
      outcomeId: outcome.id,
      versionIds: versions,
      versionContext: versions.length
        ? `Exact version mapping: ${versions.map((id) => versionName(data, id)).join('; ')}`
        : familyKnown
          ? 'Family-level evidence. Exact generation/software build unresolved; no evidence inheritance.'
          : 'Exact generation/software build unresolved; no evidence inheritance.',
      trialId: trial.id,
      trial: trial.name,
      nctId: trial.nctId,
      cohortId: cohort.id,
      cohort: cohort.name,
      cohortPopulation: cohort.population,
      enrollment,
      readoutId: readout.id,
      readout: readout.title,
      followUp: readout.followUp,
      endpointId: endpoint.id,
      endpoint: endpoint.name,
      endpointDefinition: endpoint.definition,
      endpointMeasureType: endpoint.measureType,
      endpointAnalysisPopulation: endpoint.analysisPopulation,
      hierarchy: endpoint.hierarchy,
      arm: arm.armId === 'effect-level' ? 'Effect-level observation (no arm value reported)' : armName(cohort.id, arm.armId),
      armValues: arm.armId === 'effect-level' ? 'No arm-specific value reported' : `${arm.value} ${arm.unit ?? ''}`.trim(),
      value: arm.value,
      unit: arm.unit,
      denominator: arm.denominator === undefined ? undefined : String(arm.denominator),
      effect,
      ci,
      pValue: outcome.pValue,
      pValueQualifier: outcome.pValueQualifier,
      interpretation: outcome.interpretation,
      limitation: outcome.limitation ?? readout.limitation,
      observedAt: readout.publishedAt.value,
      source: sourceFor(data, outcome.sourceRefs),
      sourceUrl: sourceUrl(data, outcome.sourceRefs),
      sourceUrls: sourceUrls(data, outcome.sourceRefs),
      sourceIds: outcome.sourceRefs.map((ref) => ref.sourceId).join('; '),
      sourceLocators: outcome.sourceRefs.map((ref) => ref.locator).join('; '),
      reviewStatus: outcome.reviewStatus,
    }))
  })
}

export function sourceProvenance(refs: SourceRef[]): { sourceIds: string; locators: string } {
  return { sourceIds: refs.map((ref) => ref.sourceId).join('; '), locators: refs.map((ref) => ref.locator).join('; ') }
}

export function lineageVisibleAsOf(data: IntelligenceData, edge: LineageEdge, asOf?: string): boolean {
  if (!asOf) return true
  return edge.sourceRefs.some((ref) => isOnOrBefore(data.sources.find((source) => source.id === ref.sourceId)?.publishedAt, asOf))
}

/** Labels read left-to-right from an authored predecessor/basis to its successor. */
export function lineageRelationshipLabel(relationship: LineageEdge['relationship']): string {
  const labels: Record<LineageEdge['relationship'], string> = {
    succeeds: 'succeeded by',
    derived_from: 'basis for',
    uses_component: 'uses component',
    compatible_with: 'compatible with',
    predicate_for: 'predicate for',
    evidence_bridged_to: 'evidence bridged to',
  }
  return labels[relationship]
}

export type EventVersionAssociation = 'exact' | 'family' | null

export function eventVersionAssociation(data: IntelligenceData, event: IntelligenceEvent, versionId: string): EventVersionAssociation {
  if (event.versionIds.includes(versionId)) return 'exact'
  const version = versionById(data, versionId)
  if (!version) return null
  const readoutIds = new Set(event.readoutIds)
  return data.readouts.some((readout) => readoutIds.has(readout.id) && data.trials.find((trial) => trial.id === readout.trialId)?.familyIds?.includes(version.familyId)) ? 'family' : null
}

export function versionName(data: IntelligenceData, id: string): string {
  return data.versions.find((version) => version.id === id)?.name ?? id
}

export function versionById(data: IntelligenceData, id: string | null | undefined): ProductVersion | undefined {
  return id ? data.versions.find((version) => version.id === id) : undefined
}

/** Media is opt-in during the pipeline migration, so an absent collection is safely empty. */
export function mediaForVersion(data: IntelligenceData, versionId?: string | null): EvidenceMedia[] {
  return (data.media ?? []).filter((media) => !versionId || media.versionIds.includes(versionId))
}

export function csvEscape(value: unknown): string {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  return [keys.join(','), ...rows.map((row) => keys.map((key) => csvEscape(row[key])).join(','))].join('\n')
}
