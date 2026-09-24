import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

export type ComparativeValidationResult = {
  valid: boolean
  errors: string[]
}

type CollectionRecord = Record<string, unknown>

const schema = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../schema/comparative-observation.schema.json'), 'utf8')) as object
const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)
const validateShape = ajv.compile(schema)

function record(value: unknown): CollectionRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as CollectionRecord
    : undefined
}

function records(value: unknown): CollectionRecord[] {
  return Array.isArray(value) ? value.flatMap(item => {
    const candidate = record(item)
    return candidate ? [candidate] : []
  }) : []
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function duplicateIds(items: CollectionRecord[], idField: string, label: string): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const item of items) {
    const id = text(item[idField])
    if (!id) continue
    if (seen.has(id)) duplicates.add(id)
    seen.add(id)
  }
  return [...duplicates].map(id => `${label} has duplicate ${idField} ${id}`)
}

/** Validates draft-07 shape plus relationships that draft-07 cannot express across sibling arrays. */
export function validateComparativeDataset(data: unknown): ComparativeValidationResult {
  if (!validateShape(data)) {
    return {
      valid: false,
      errors: (validateShape.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message ?? 'schema validation failed'}`),
    }
  }

  const dataset = record(data)!
  const configurations = records(dataset.device_configurations)
  const metrics = records(dataset.metric_definitions)
  const observations = records(dataset.observations)
  const errors = [
    ...duplicateIds(configurations, 'configuration_id', 'device_configurations'),
    ...duplicateIds(metrics, 'metric_id', 'metric_definitions'),
    ...duplicateIds(observations, 'observation_id', 'observations'),
  ]
  const configurationsById = new Map(configurations.map(item => [text(item.configuration_id), item]).filter((entry): entry is [string, CollectionRecord] => Boolean(entry[0])))
  const metricsById = new Map(metrics.map(item => [text(item.metric_id), item]).filter((entry): entry is [string, CollectionRecord] => Boolean(entry[0])))
  const observationsById = new Map(observations.map(item => [text(item.observation_id), item]).filter((entry): entry is [string, CollectionRecord] => Boolean(entry[0])))

  for (const observation of observations) {
    const observationId = text(observation.observation_id) ?? '(unknown observation)'
    const configurationId = text(observation.configuration_id)
    const metricId = text(observation.metric_id)
    const configuration = configurationId ? configurationsById.get(configurationId) : undefined
    const metric = metricId ? metricsById.get(metricId) : undefined
    if (!configuration) errors.push(`${observationId} references missing configuration ${configurationId ?? '(missing)'}`)
    if (!metric) errors.push(`${observationId} references missing metric ${metricId ?? '(missing)'}`)
    if (configuration && metric) {
      const applicableTo = Array.isArray(metric.applicable_to) ? metric.applicable_to : []
      if (!applicableTo.includes(configuration.therapy_class)) errors.push(`${observationId} uses metric ${metricId} that is not applicable to ${configuration.therapy_class}`)
      if (observation.module !== metric.module) errors.push(`${observationId} module ${String(observation.module)} does not match metric ${metricId} module ${String(metric.module)}`)
    }
    if (observation.measurement_status !== 'conflicting_sources') continue
    const conflictIds = Array.isArray(observation.conflict_observation_ids) ? observation.conflict_observation_ids : []
    for (const conflictId of conflictIds) {
      const referenced = typeof conflictId === 'string' ? observationsById.get(conflictId) : undefined
      if (!referenced) {
        errors.push(`${observationId} conflict_observation_ids references missing observation ${String(conflictId)}`)
        continue
      }
      if (referenced.measurement_status !== 'reported') errors.push(`${observationId} conflict observation ${conflictId} must have measurement_status reported`)
      if (referenced.configuration_id !== observation.configuration_id || referenced.metric_id !== observation.metric_id) errors.push(`${observationId} conflict observation ${conflictId} must share configuration_id and metric_id`)
    }
  }
  return { valid: errors.length === 0, errors }
}
