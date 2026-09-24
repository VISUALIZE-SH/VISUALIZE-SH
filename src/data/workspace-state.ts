import type { AppMode, IntelligenceData } from '../types/intelligence'

// This module is the sole query-string contract for shareable workspace state.
// Keep parsing permissive for old links and serialization canonical for new ones.
export interface WorkspaceState {
  mode: AppMode
  dataView: 'browse' | 'compare'
  compareCategory: string
  compareVersionIds: string[]
  compareConfigurationIds: string[]
  atlasView: 'profiles' | 'graph'
  atlasTopic: string
  conditionId: string
  versionId: string
  jurisdiction: string
  asOf: string
  newsFrom: string
  newsTo: string
  nodeId: string
}

const id = (value: string | null) => value && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : ''
const topic = (value: string | null) => value && /^[A-Za-z0-9][A-Za-z0-9 +&./'()-]{0,79}$/.test(value) ? value.trim().replace(/\s+/g, ' ') : ''
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

export function parseWorkspace(search: string): WorkspaceState {
  const query = new URLSearchParams(search)
  const requestedMode = query.get('mode')
  const date = query.get('asOf') ?? ''
  const newsFrom = query.get('newsFrom') ?? ''
  const newsTo = query.get('newsTo') ?? ''
  const atlasTopic = topic(query.get('topic'))
  const mode = requestedMode === 'news' || requestedMode === 'data'
    ? requestedMode
    : 'atlas'
  return {
    mode,
    dataView: mode === 'data' && query.get('dataView') === 'compare' ? 'compare' : 'browse',
    compareCategory: id(query.get('compareCategory')),
    compareVersionIds: [...new Set(query.getAll('compare').map(value => id(value)).filter(Boolean))].slice(0, 4),
    compareConfigurationIds: [...new Set(query.getAll('compareConfig').map(value => id(value)).filter(Boolean))].slice(0, 4),
    atlasView: query.get('atlas') === 'profiles' && !query.has('node') && !atlasTopic ? 'profiles' : 'graph',
    atlasTopic,
    conditionId: id(query.get('condition')),
    versionId: id(query.get('version')),
    // News is a publication window, not a regulatory/evidence snapshot. Drop
    // stale context when a deep link or browser history entry crosses modes.
    jurisdiction: mode === 'news' ? '' : query.get('jurisdiction') === 'all' ? '' : 'US',
    asOf: mode === 'news' || !isCalendarDate(date) ? '' : date,
    newsFrom: mode === 'news' && isCalendarDate(newsFrom) ? newsFrom : '',
    newsTo: mode === 'news' && isCalendarDate(newsTo) ? newsTo : '',
    nodeId: id(query.get('node')),
  }
}

export function workspaceQuery(state: WorkspaceState): string {
  const query = new URLSearchParams({ mode: state.mode })
  if (state.atlasView === 'profiles') query.set('atlas', 'profiles')
  if (state.mode === 'atlas' && state.atlasView === 'graph' && state.atlasTopic) query.set('topic', state.atlasTopic)
  if (state.conditionId) query.set('condition', state.conditionId)
  if (state.versionId) query.set('version', state.versionId)
  if (state.mode === 'data' && state.dataView === 'compare') query.set('dataView', 'compare')
  if (state.mode === 'data' && state.compareCategory) query.set('compareCategory', state.compareCategory)
  if (state.mode === 'data') for (const versionId of [...new Set(state.compareVersionIds.map(value => id(value)).filter(Boolean))].slice(0, 4)) query.append('compare', versionId)
  if (state.mode === 'data') for (const configurationId of [...new Set(state.compareConfigurationIds.map(value => id(value)).filter(Boolean))].slice(0, 4)) query.append('compareConfig', configurationId)
  if (state.mode !== 'news') {
    query.set('jurisdiction', state.jurisdiction || 'all')
    if (state.asOf) query.set('asOf', state.asOf)
  }
  if (state.mode === 'news') {
    if (state.newsFrom) query.set('newsFrom', state.newsFrom)
    if (state.newsTo) query.set('newsTo', state.newsTo)
  }
  if (state.nodeId && state.atlasView === 'graph') query.set('node', state.nodeId)
  return query.toString()
}

/** A filtered view, never an edit to the authored evidence or its provenance. */
export function scopeToCondition(data: IntelligenceData, conditionId: string): IntelligenceData {
  if (!conditionId) return data
  const comparisonCategories = data.comparisonCategories?.filter(category => category.conditionId === conditionId)
  const comparisonCategoryIds = new Set(comparisonCategories?.map(category => category.id) ?? [])
  const families = data.families.filter(family => family.conditionIds.includes(conditionId))
  const familyIds = new Set(families.map(family => family.id))
  const versions = data.versions.filter(version => familyIds.has(version.familyId))
  const versionIds = new Set(versions.map(version => version.id))
  const trials = data.trials.filter(trial => trial.familyIds?.some(id => familyIds.has(id)) || trial.versionIds.some(id => versionIds.has(id)))
  const trialIds = new Set(trials.map(trial => trial.id))
  const readouts = data.readouts.filter(readout => trialIds.has(readout.trialId))
  const readoutIds = new Set(readouts.map(readout => readout.id))
  const outcomes = data.outcomes.filter(outcome => readoutIds.has(outcome.readoutId))
  const endpointIds = new Set(outcomes.map(outcome => outcome.endpointId))
  const comparative = data.comparative ? {
    ...data.comparative,
    device_configurations: data.comparative.device_configurations.filter(configuration => versionIds.has(configuration.product_version_id)),
  } : undefined
  const comparativeConfigurationIds = new Set(comparative?.device_configurations.map(configuration => configuration.configuration_id) ?? [])
  if (comparative) comparative.observations = data.comparative!.observations.filter(observation => comparativeConfigurationIds.has(observation.configuration_id))
  return {
    ...data, families, versions, trials, readouts, outcomes,
    ...(data.comparisonCategories ? { comparisonCategories } : {}),
    ...(data.standardAttributes ? { standardAttributes: data.standardAttributes.filter(attribute => attribute.categoryIds.some(id => comparisonCategoryIds.has(id))) } : {}),
    ...(comparative ? { comparative } : {}),
    claims: data.claims.filter(claim => versionIds.has(claim.versionId)),
    decisions: data.decisions.filter(decision => decision.versionIds.some(id => versionIds.has(id))),
    indications: data.indications.filter(indication => indication.versionIds.some(id => versionIds.has(id))),
    cohorts: data.cohorts.filter(cohort => trialIds.has(cohort.trialId)),
    trialSnapshots: data.trialSnapshots.filter(snapshot => trialIds.has(snapshot.trialId)),
    endpoints: data.endpoints.filter(endpoint => endpointIds.has(endpoint.id)),
    lineage: data.lineage.filter(edge => versionIds.has(edge.fromVersionId) && versionIds.has(edge.toVersionId)),
    events: data.events.filter(event => event.versionIds.some(id => versionIds.has(id)) || event.readoutIds.some(id => readoutIds.has(id))),
    media: (data.media ?? []).filter(item => item.versionIds.some(id => versionIds.has(id))),
  }
}
