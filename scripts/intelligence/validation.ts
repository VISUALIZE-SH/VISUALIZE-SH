import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import Ajv, { type ErrorObject } from 'ajv'
import addFormats from 'ajv-formats'
import yaml from 'js-yaml'
import type { EvidenceDate, IntelligenceData, SourceRef } from '../../src/types/intelligence'
import { validateComparativeDataset } from '../comparative-schema-validation'

export interface ValidationOptions {
  schemaPath: string
  legacyIds?: ReadonlySet<string>
}

export class IntelligenceValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`intelligence validation failed:\n${issues.map(issue => `- ${issue}`).join('\n')}`)
    this.name = 'IntelligenceValidationError'
  }
}

const COLLECTIONS = [
  'sources', 'families', 'versions', 'claims', 'decisions', 'indications', 'trials',
  'trialSnapshots', 'cohorts', 'endpoints', 'readouts', 'outcomes', 'lineage', 'events', 'media',
  'comparisonCategories', 'standardAttributes',
] as const

type Identified = { id: string }
type Provenanced = { id: string; sourceRefs: SourceRef[]; reviewStatus: 'draft' | 'reviewed' }

function ajvIssue(error: ErrorObject): string {
  const path = error.instancePath || '/'
  return `${path} ${error.message ?? error.keyword}`
}

function collectionIndex<T extends Identified>(records: T[]): Map<string, T> {
  return new Map(records.map(record => [record.id, record]))
}

function evidenceDateIssue(date: EvidenceDate): string | undefined {
  const expectedLength = date.precision === 'year' ? 4 : date.precision === 'month' ? 7 : 10
  if (date.value.length !== expectedLength) return `value ${JSON.stringify(date.value)} does not match precision ${date.precision}`
  if (date.precision === 'year') return /^\d{4}$/.test(date.value) && date.value !== '0000' ? undefined : `invalid year ${date.value}`
  if (date.precision === 'month') {
    const match = /^(\d{4})-(\d{2})$/.exec(date.value)
    return match && Number(match[2]) >= 1 && Number(match[2]) <= 12 ? undefined : `invalid month ${date.value}`
  }
  const parsed = new Date(`${date.value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date.value ? undefined : `invalid day ${date.value}`
}

function findCycle(nodes: readonly string[], next: (id: string) => readonly string[]): string[] | undefined {
  const visited = new Set<string>()
  const active = new Set<string>()
  const stack: string[] = []
  const visit = (id: string): string[] | undefined => {
    if (active.has(id)) {
      const start = stack.indexOf(id)
      return [...stack.slice(start), id]
    }
    if (visited.has(id)) return undefined
    visited.add(id); active.add(id); stack.push(id)
    for (const child of next(id)) {
      const cycle = visit(child)
      if (cycle) return cycle
    }
    stack.pop(); active.delete(id)
    return undefined
  }
  for (const id of nodes) {
    const cycle = visit(id)
    if (cycle) return cycle
  }
  return undefined
}

function validateSourceRefs(record: Provenanced, sourceIds: ReadonlySet<string>, issues: string[]): void {
  const seen = new Set<string>()
  for (const [index, ref] of record.sourceRefs.entries()) {
    if (!sourceIds.has(ref.sourceId)) issues.push(`${record.id}.sourceRefs[${index}] references missing source ${ref.sourceId}`)
    const key = `${ref.sourceId}\u0000${ref.locator}`
    if (seen.has(key)) issues.push(`${record.id}.sourceRefs contains duplicate ${ref.sourceId} / ${ref.locator}`)
    seen.add(key)
  }
  if (record.reviewStatus === 'reviewed' && record.sourceRefs.length === 0) issues.push(`${record.id} is reviewed but has no sourceRefs`)
}

function validateSemantics(data: IntelligenceData, legacyIds: ReadonlySet<string>): string[] {
  const issues: string[] = []
  const allIds = new Map<string, string>()
  for (const collection of COLLECTIONS) {
    for (const record of (data[collection] ?? []) as Identified[]) {
      const previous = allIds.get(record.id)
      if (previous) issues.push(`duplicate identity ${record.id} in ${previous} and ${collection}`)
      else allIds.set(record.id, collection)
    }
  }

  const sources = collectionIndex(data.sources)
  const families = collectionIndex(data.families)
  const versions = collectionIndex(data.versions)
  const decisions = collectionIndex(data.decisions)
  const indications = collectionIndex(data.indications)
  const trials = collectionIndex(data.trials)
  const cohorts = collectionIndex(data.cohorts)
  const endpoints = collectionIndex(data.endpoints)
  const readouts = collectionIndex(data.readouts)
  const comparisonCategories = collectionIndex(data.comparisonCategories ?? [])
  const standardAttributes = collectionIndex(data.standardAttributes ?? [])
  const sourceIds = new Set(sources.keys())

  for (const source of data.sources) {
    if (!source.publishedAt) continue
    const dateIssue = evidenceDateIssue(source.publishedAt)
    if (dateIssue) issues.push(`${source.id}.publishedAt ${dateIssue}`)
  }

  for (const collection of COLLECTIONS) {
    if (collection === 'sources' || collection === 'families' || collection === 'comparisonCategories' || collection === 'standardAttributes') continue
    for (const record of (data[collection] ?? []) as Provenanced[]) validateSourceRefs(record, sourceIds, issues)
  }

  for (const family of data.families) {
    for (const id of family.entityIds) if (!legacyIds.has(id)) issues.push(`${family.id}.entityIds references missing legacy graph ID ${id}`)
    for (const id of family.conditionIds) if (!legacyIds.has(id)) issues.push(`${family.id}.conditionIds references missing legacy graph ID ${id}`)
  }
  for (const category of data.comparisonCategories ?? []) {
    if (!legacyIds.has(category.conditionId)) issues.push(`${category.id}.conditionId references missing legacy graph ID ${category.conditionId}`)
    for (const versionId of category.versionIds) {
      const version = versions.get(versionId)
      if (!version) issues.push(`${category.id}.versionIds references missing version ${versionId}`)
      else {
        if (version.kind !== category.versionKind) issues.push(`${category.id} includes ${versionId}, whose kind ${version.kind} does not match ${category.versionKind}`)
        const family = families.get(version.familyId)
        if (family && !family.conditionIds.includes(category.conditionId)) issues.push(`${category.id} includes ${versionId}, whose family is not associated with ${category.conditionId}`)
      }
    }
  }
  for (const attribute of data.standardAttributes ?? []) {
    for (const categoryId of attribute.categoryIds) if (!comparisonCategories.has(categoryId)) issues.push(`${attribute.id}.categoryIds references missing comparison category ${categoryId}`)
  }
  if (data.comparative) {
    const result = validateComparativeDataset(data.comparative)
    for (const error of result.errors) issues.push(`comparative ${error}`)
    const seenConfigurations = new Set<string>()
    for (const configuration of Array.isArray(data.comparative.device_configurations) ? data.comparative.device_configurations : []) {
      const version = versions.get(configuration.product_version_id)
      if (!version) issues.push(`${configuration.configuration_id}.product_version_id references missing version ${configuration.product_version_id}`)
      else {
        if (configuration.device_family_id !== version.familyId) issues.push(`${configuration.configuration_id}.device_family_id does not match ${version.id}`)
        if (configuration.generation !== version.name) issues.push(`${configuration.configuration_id}.generation does not match exact version ${version.name}`)
      }
      const identity = `${configuration.product_version_id}\u0000${configuration.configuration_label}`
      if (seenConfigurations.has(identity)) issues.push(`duplicate configuration label ${configuration.configuration_label} for ${configuration.product_version_id}`)
      seenConfigurations.add(identity)
    }
  }
  for (const version of data.versions) if (!families.has(version.familyId)) issues.push(`${version.id}.familyId references missing family ${version.familyId}`)
  for (const claim of data.claims) {
    if (!versions.has(claim.versionId)) issues.push(`${claim.id}.versionId references missing version ${claim.versionId}`)
    if (claim.comparisonAttributeId && !standardAttributes.has(claim.comparisonAttributeId)) issues.push(`${claim.id}.comparisonAttributeId references missing standard attribute ${claim.comparisonAttributeId}`)
    if (claim.comparisonAttributeId) {
      const attribute = standardAttributes.get(claim.comparisonAttributeId)
      const categoryIds = (data.comparisonCategories ?? []).filter(category => category.versionIds.includes(claim.versionId)).map(category => category.id)
      if (attribute && !categoryIds.some(categoryId => attribute.categoryIds.includes(categoryId))) issues.push(`${claim.id}.comparisonAttributeId is not applicable to any comparison category containing ${claim.versionId}`)
      if (attribute && attribute.scope !== 'version_wide') issues.push(`${claim.id}.comparisonAttributeId cannot use ${attribute.scope} without a scoped observation`)
      const expectedType = attribute?.valueType === 'text' ? 'string' : attribute?.valueType
      if (attribute && claim.availability === 'reported' && typeof claim.value !== expectedType) issues.push(`${claim.id}.value type does not match ${attribute.id} (${attribute.valueType})`)
      if (claim.basis === 'analyst_interpretation') issues.push(`${claim.id}.comparisonAttributeId cannot attach an analyst interpretation`)
      // Trial names may sit in the matrix; numeric outcomes stay in readouts with their cohort context.
      if (!['design', 'fit', 'digital', 'evidence'].includes(claim.category)) issues.push(`${claim.id}.comparisonAttributeId cannot attach a ${claim.category} claim`)
      if (claim.category === 'evidence' && typeof claim.value === 'number') issues.push(`${claim.id}.comparisonAttributeId cannot attach a numeric evidence result`)
    }
  }
  for (const decision of data.decisions) for (const id of decision.versionIds) if (!versions.has(id)) issues.push(`${decision.id}.versionIds references missing version ${id}`)

  const decisionKeys = new Set<string>()
  for (const decision of data.decisions) {
    const key = `${decision.jurisdiction.toLocaleLowerCase()}\u0000${decision.identifier.toLocaleLowerCase()}`
    if (decisionKeys.has(key)) issues.push(`duplicate regulatory identity ${decision.jurisdiction} / ${decision.identifier}`)
    decisionKeys.add(key)
    if (decision.pathway === 'PMA') {
      const match = /^(P\d{6})(?:\/S\d{3})?$/.exec(decision.identifier)
      if (!match || match[1] !== decision.rootIdentifier) issues.push(`${decision.id} has inconsistent PMA identifier/rootIdentifier`)
    }
    if (decision.pathway === '510(k)' && (!/^K\d{6}$/.test(decision.identifier) || decision.rootIdentifier !== decision.identifier)) {
      issues.push(`${decision.id} has inconsistent 510(k) identifier/rootIdentifier`)
    }
    const dateIssue = evidenceDateIssue(decision.date)
    if (dateIssue) issues.push(`${decision.id}.date ${dateIssue}`)
  }

  for (const indication of data.indications) {
    const decision = decisions.get(indication.decisionId)
    if (!decision) issues.push(`${indication.id}.decisionId references missing decision ${indication.decisionId}`)
    else {
      if (decision.jurisdiction !== indication.jurisdiction) issues.push(`${indication.id}.jurisdiction ${indication.jurisdiction} does not match decision jurisdiction ${decision.jurisdiction}`)
      for (const id of indication.versionIds) if (!decision.versionIds.includes(id)) issues.push(`${indication.id}.versionIds includes ${id}, which is not covered by ${decision.id}`)
    }
    for (const id of indication.versionIds) if (!versions.has(id)) issues.push(`${indication.id}.versionIds references missing version ${id}`)
    if (indication.supersedesId && !indications.has(indication.supersedesId)) issues.push(`${indication.id}.supersedesId references missing indication ${indication.supersedesId}`)
    if (indication.supersedesId) {
      const prior = indications.get(indication.supersedesId)
      if (prior && prior.jurisdiction !== indication.jurisdiction) issues.push(`${indication.id} cannot supersede ${prior.id} across jurisdictions`)
    }
    const dateIssue = evidenceDateIssue(indication.effectiveDate)
    if (dateIssue) issues.push(`${indication.id}.effectiveDate ${dateIssue}`)
  }
  const indicationCycle = findCycle([...indications.keys()], id => {
    const next = indications.get(id)?.supersedesId
    return next ? [next] : []
  })
  if (indicationCycle) issues.push(`indication supersedes cycle: ${indicationCycle.join(' -> ')}`)

  const nctIds = new Set<string>()
  for (const trial of data.trials) {
    if (trial.nctId) {
      if (nctIds.has(trial.nctId)) issues.push(`duplicate trial registry identity ${trial.nctId}`)
      nctIds.add(trial.nctId)
    }
    if (trial.entityId && !legacyIds.has(trial.entityId)) issues.push(`${trial.id}.entityId references missing legacy graph ID ${trial.entityId}`)
    for (const familyId of trial.familyIds ?? []) if (!families.has(familyId)) issues.push(`${trial.id}.familyIds references missing family ${familyId}`)
    for (const id of trial.versionIds) if (!versions.has(id)) issues.push(`${trial.id}.versionIds references missing version ${id}`)
    if (trial.familyIds?.length) for (const versionId of trial.versionIds) {
      const familyId = versions.get(versionId)?.familyId
      if (familyId && !trial.familyIds.includes(familyId)) issues.push(`${trial.id}.familyIds omits ${familyId}, the family of mapped version ${versionId}`)
    }
  }

  for (const snapshot of data.trialSnapshots) {
    if (!trials.has(snapshot.trialId)) issues.push(`${snapshot.id}.trialId references missing trial ${snapshot.trialId}`)
    const targetLanguage = /\b(target|planned|anticipated|estimated)\b/i.test(snapshot.enrollment.scope)
    if (snapshot.enrollment.basis === 'actual' && targetLanguage) issues.push(`${snapshot.id}.enrollment is marked actual but scope describes a target/estimate`)
  }

  for (const cohort of data.cohorts) {
    if (!trials.has(cohort.trialId)) issues.push(`${cohort.id}.trialId references missing trial ${cohort.trialId}`)
    const stages = new Set<string>()
    for (const enrollment of cohort.enrollment) {
      if (stages.has(enrollment.stage)) issues.push(`${cohort.id}.enrollment repeats stage ${enrollment.stage}`)
      stages.add(enrollment.stage)
    }
    const armIds = new Set<string>()
    for (const arm of cohort.arms) {
      if (armIds.has(arm.id)) issues.push(`${cohort.id}.arms repeats arm ID ${arm.id}`)
      armIds.add(arm.id)
    }
    const randomized = cohort.enrollment.find(item => item.stage === 'randomized')?.value
    const armRandomized = cohort.arms.map(arm => arm.randomized).filter((value): value is number => value !== undefined)
    if (randomized !== undefined && armRandomized.length === cohort.arms.length && armRandomized.reduce((sum, value) => sum + value, 0) !== randomized) {
      issues.push(`${cohort.id} randomized enrollment does not equal the sum of randomized arm counts`)
    }
  }

  for (const readout of data.readouts) {
    const trial = trials.get(readout.trialId)
    const cohort = cohorts.get(readout.cohortId)
    if (!trial) issues.push(`${readout.id}.trialId references missing trial ${readout.trialId}`)
    if (!cohort) issues.push(`${readout.id}.cohortId references missing cohort ${readout.cohortId}`)
    else if (cohort.trialId !== readout.trialId) issues.push(`${readout.id} combines cohort ${cohort.id} from ${cohort.trialId} with trial ${readout.trialId}`)
    for (const id of readout.versionIds) {
      if (!versions.has(id)) issues.push(`${readout.id}.versionIds references missing version ${id}`)
      if (trial && trial.versionMapping !== 'unclear' && !trial.versionIds.includes(id)) issues.push(`${readout.id}.versionIds includes ${id}, which is not mapped to trial ${trial.id}`)
    }
    if (trial?.versionMapping === 'exact' && readout.versionIds.length !== 1) issues.push(`${readout.id} must retain the exact version mapped to ${trial.id}`)
    if (trial?.versionMapping === 'unclear' && readout.versionIds.length !== 0) issues.push(`${readout.id} cannot claim an exact version while trial ${trial.id} has unresolved version mapping`)
    const dateIssue = evidenceDateIssue(readout.publishedAt)
    if (dateIssue) issues.push(`${readout.id}.publishedAt ${dateIssue}`)
  }

  for (const outcome of data.outcomes) {
    const readout = readouts.get(outcome.readoutId)
    if (!readout) issues.push(`${outcome.id}.readoutId references missing readout ${outcome.readoutId}`)
    if (!endpoints.has(outcome.endpointId)) issues.push(`${outcome.id}.endpointId references missing endpoint ${outcome.endpointId}`)
    if (readout && !outcome.sourceRefs.some(ref => readout.sourceRefs.some(readoutRef => readoutRef.sourceId === ref.sourceId))) {
      issues.push(`${outcome.id}.sourceRefs does not include a source from readout ${readout.id}`)
    }
    const cohort = readout ? cohorts.get(readout.cohortId) : undefined
    const cohortArms = new Map(cohort?.arms.map(arm => [arm.id, arm]) ?? [])
    const armIds = new Set(cohortArms.keys())
    const usedArms = new Set<string>()
    for (const arm of outcome.arms) {
      if (!armIds.has(arm.armId)) issues.push(`${outcome.id}.arms references ${arm.armId}, which is not in cohort ${cohort?.id ?? '(missing)'}`)
      if (usedArms.has(arm.armId)) issues.push(`${outcome.id}.arms repeats arm ${arm.armId}`)
      const randomized = cohortArms.get(arm.armId)?.randomized
      if (arm.denominator !== undefined && randomized !== undefined && arm.denominator > randomized) issues.push(`${outcome.id}.arms denominator exceeds randomized count for ${arm.armId}`)
      if (arm.unit === '%' && (arm.value < 0 || arm.value > 100)) issues.push(`${outcome.id}.arms percentage for ${arm.armId} must be between 0 and 100`)
      usedArms.add(arm.armId)
    }
    const ci = outcome.effect?.ci
    if (ci) {
      const hasLower = ci.lower !== undefined
      const hasUpper = ci.upper !== undefined
      if (ci.sidedness === 'one_sided' && hasLower === hasUpper) issues.push(`${outcome.id}.effect.ci one-sided interval must report exactly one bound`)
      if (ci.sidedness === 'two_sided' && (!hasLower || !hasUpper)) issues.push(`${outcome.id}.effect.ci two-sided interval must report both bounds`)
      if (hasLower && hasUpper && (ci.lower as number) > (ci.upper as number)) issues.push(`${outcome.id}.effect.ci lower bound exceeds upper bound`)
    }
  }

  const lineageKeys = new Set<string>()
  const ancestry = new Map<string, string[]>()
  for (const edge of data.lineage) {
    if (!versions.has(edge.fromVersionId)) issues.push(`${edge.id}.fromVersionId references missing version ${edge.fromVersionId}`)
    if (!versions.has(edge.toVersionId)) issues.push(`${edge.id}.toVersionId references missing version ${edge.toVersionId}`)
    if (edge.fromVersionId === edge.toVersionId) issues.push(`${edge.id} cannot link a version to itself`)
    const key = `${edge.fromVersionId}\u0000${edge.toVersionId}\u0000${edge.relationship}`
    if (lineageKeys.has(key)) issues.push(`duplicate lineage relationship ${edge.relationship} ${edge.fromVersionId} -> ${edge.toVersionId}`)
    lineageKeys.add(key)
    // Predicates, compatibility, components, and evidence bridges are explicitly not design ancestry.
    if (edge.relationship === 'succeeds' || edge.relationship === 'derived_from') {
      ancestry.set(edge.fromVersionId, [...(ancestry.get(edge.fromVersionId) ?? []), edge.toVersionId])
    }
  }
  const ancestryCycle = findCycle([...versions.keys()], id => ancestry.get(id) ?? [])
  if (ancestryCycle) issues.push(`version ancestry cycle: ${ancestryCycle.join(' -> ')}`)

  for (const event of data.events) {
    for (const id of event.versionIds) if (!versions.has(id)) issues.push(`${event.id}.versionIds references missing version ${id}`)
    for (const id of event.decisionIds) if (!decisions.has(id)) issues.push(`${event.id}.decisionIds references missing decision ${id}`)
    for (const id of event.readoutIds) if (!readouts.has(id)) issues.push(`${event.id}.readoutIds references missing readout ${id}`)
    for (const [field, date] of [['eventDate', event.eventDate], ['publishedAt', event.publishedAt]] as const) {
      const dateIssue = evidenceDateIssue(date)
      if (dateIssue) issues.push(`${event.id}.${field} ${dateIssue}`)
    }
  }
  for (const media of data.media ?? []) {
    for (const id of media.versionIds) if (!versions.has(id)) issues.push(`${media.id}.versionIds references missing version ${id}`)
    if (!media.sourceRefs.length) issues.push(`${media.id} must link at least one source locator`)
    if (!/^\/evidence\/(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9][A-Za-z0-9._/-]*\.(?:png|jpe?g|webp|avif)$/.test(media.assetPath)) {
      issues.push(`${media.id}.assetPath must be a safe root-relative image under /evidence/`)
    }
    if (media.crop && (media.crop.x + media.crop.width > 1 || media.crop.y + media.crop.height > 1)) {
      issues.push(`${media.id}.crop must remain within normalized source-page bounds`)
    }
  }
  return issues
}

export function validateIntelligence(value: unknown, options: ValidationOptions): IntelligenceData {
  const schema = JSON.parse(readFileSync(options.schemaPath, 'utf8')) as object
  const ajv = new Ajv({ allErrors: true, strict: true, strictRequired: false, strictTypes: false })
  addFormats(ajv)
  const validate = ajv.compile(schema)
  if (!validate(value)) throw new IntelligenceValidationError((validate.errors ?? []).map(ajvIssue))
  const data = value as IntelligenceData
  const issues = validateSemantics(data, options.legacyIds ?? new Set())
  if (issues.length) throw new IntelligenceValidationError(issues)
  return data
}

export function loadLegacyIds(dataDir: string, graphPath?: string): Set<string> {
  const ids = new Set<string>()
  for (const name of ['conditions', 'therapies', 'companies', 'trials']) {
    const path = join(dataDir, `${name}.yaml`)
    if (!existsSync(path)) continue
    const parsed = yaml.load(readFileSync(path, 'utf8'), { schema: yaml.CORE_SCHEMA })
    if (!Array.isArray(parsed)) throw new Error(`${path} must contain a YAML list`)
    for (const record of parsed) {
      if (record && typeof record === 'object' && typeof (record as { id?: unknown }).id === 'string') ids.add((record as { id: string }).id)
    }
  }
  if (graphPath && existsSync(graphPath)) {
    const graph = JSON.parse(readFileSync(graphPath, 'utf8')) as { nodes?: Array<{ data?: { id?: unknown }; id?: unknown }> }
    for (const node of graph.nodes ?? []) {
      const id = node.data?.id ?? node.id
      if (typeof id === 'string') ids.add(id)
    }
  }
  return ids
}
