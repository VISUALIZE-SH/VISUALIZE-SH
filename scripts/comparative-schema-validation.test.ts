import assert from 'node:assert/strict'
import test from 'node:test'
import { validateComparativeDataset } from './comparative-schema-validation'

type RecordValue = Record<string, unknown>

function fixture() {
  return {
    schema_version: 1,
    device_configurations: [{
      configuration_id: 'sample-valve-29', product_version_id: 'sample-generation', device_family_id: 'sample-valve', generation: 'sample-generation', configuration_label: '29 mm',
      therapy_class: 'TAVR', target_structure: 'native aortic valve', mechanism: 'replacement',
      delivery: { route: 'transfemoral', component: 'sheath', profile_fr: 14, profile_definition: 'manufacturer-labeled compatible sheath' },
    }],
    metric_definitions: [{
      metric_id: 'mean-transvalvular-gradient', display_name: 'Mean transvalvular gradient', module: 'clinical_valve_hemodynamics',
      value_kind: 'numeric', canonical_unit: 'mmHg', applicable_to: ['TAVR'],
      required_context: ['method.modality', 'method.protocol_or_grading_standard', 'timepoint', 'context.anatomy_or_model'], default_comparability: 'conditional',
    }],
    observations: [{
      observation_id: 'sample-valve-29-gradient-source-one', configuration_id: 'sample-valve-29', metric_id: 'mean-transvalvular-gradient',
      module: 'clinical_valve_hemodynamics', measurement_status: 'reported', value: 8.4, unit: 'mmHg', statistic: 'mean', sample_size: 40,
      comparability: 'conditional', comparability_rationale: 'Compare only with aortic echo measurements at the same timepoint and with aligned size and anatomy strata.',
      method: { modality: 'echocardiography', protocol_or_grading_standard: 'Doppler method as reported by the source', conditions_summary: 'Discharge imaging; rhythm and flow are source-reported where available.' },
      timepoint: { label: 'discharge', phase: 'discharge' },
      context: { setting: 'in_vivo', target_structure: 'aortic valve', anatomy_or_model: 'TAVR cohort; annulus/size strata retained in the source table', cohort_or_sample: 'Synthetic treated cohort (n=40)', configuration_context: '29 mm labeled configuration' },
      provenance: { source_type: 'primary_article', url: 'https://example.org/synthetic-source-one', locator: 'Synthetic Table 1', extracted_on: '2026-09-22', review_status: 'unreviewed' },
    }],
  }
}

function validation(data: unknown) {
  return validateComparativeDataset(data)
}

function expectInvalid(data: unknown, pattern: RegExp): void {
  const result = validation(data)
  assert.equal(result.valid, false, 'fixture should be invalid')
  assert.match(result.errors.join('\n'), pattern)
}

function withoutValueFields(observation: RecordValue): RecordValue {
  const { value: _value, unit: _unit, statistic: _statistic, dispersion: _dispersion, sample_size: _sampleSize, ...nonValueObservation } = observation
  return nonValueObservation
}

function conflictFixture(): RecordValue {
  const data = fixture()
  const sourceOne = data.observations[0] as RecordValue
  const sourceTwo = {
    ...sourceOne,
    observation_id: 'sample-valve-29-gradient-source-two',
    value: 9.1,
    provenance: { ...(sourceOne.provenance as RecordValue), url: 'https://example.org/synthetic-source-two', locator: 'Synthetic Table 2' },
  }
  const conflict = {
    ...withoutValueFields(sourceOne),
    observation_id: 'sample-valve-29-gradient-conflict',
    measurement_status: 'conflicting_sources',
    comparability: 'not_comparable',
    comparability_rationale: 'The two source-specific reported values disagree and require clinical review.',
    conflict_observation_ids: [sourceOne.observation_id, sourceTwo.observation_id],
    method: { modality: 'source_scope_review', protocol_or_grading_standard: 'Source reconciliation review', conditions_summary: 'No value is duplicated on the conflict record.' },
    provenance: { source_type: 'other', url: 'https://example.org/synthetic-conflict-log', locator: 'Synthetic reconciliation record', extracted_on: '2026-09-22', review_status: 'needs_resolution' },
  }
  return { ...data, observations: [sourceOne, sourceTwo, conflict] }
}

test('accepts a source-located, method-contextualized comparative observation', () => {
  const result = validation(fixture())
  assert.equal(result.valid, true, result.errors.join('\n'))
})

test('rejects a reported conditional observation without method context or comparability rationale', () => {
  const data = fixture()
  const { method: _method, comparability_rationale: _rationale, ...unsafeObservation } = data.observations[0]
  expectInvalid({ ...data, observations: [unsafeObservation] }, /required property 'method'[\s\S]*required property 'comparability_rationale'|required property 'comparability_rationale'[\s\S]*required property 'method'/)
})

test('accepts all six statuses and prevents non-value records from carrying result fields', () => {
  const nonValueStatuses = ['tested_not_publicly_disclosed', 'not_reported', 'not_extracted', 'not_applicable'] as const
  for (const measurement_status of nonValueStatuses) {
    const data = fixture()
    const observation = withoutValueFields(data.observations[0] as RecordValue)
    const result = validation({ ...data, observations: [{ ...observation, measurement_status, comparability: 'not_comparable', comparability_rationale: 'No public result is available for comparison.' }] })
    assert.equal(result.valid, true, `${measurement_status}: ${result.errors.join('\n')}`)
  }
  assert.equal(validation(conflictFixture()).valid, true, validation(conflictFixture()).errors.join('\n'))

  for (const measurement_status of nonValueStatuses) {
    const data = fixture()
    expectInvalid({ ...data, observations: [{ ...data.observations[0], measurement_status }] }, /must NOT be valid/)
  }
  const conflict = conflictFixture()
  const conflictObservation = (conflict.observations as RecordValue[])[2]
  expectInvalid({ ...conflict, observations: [...(conflict.observations as RecordValue[]).slice(0, 2), { ...conflictObservation, value: 10, unit: 'mmHg', statistic: 'mean' }] }, /must NOT be valid/)
})

test('requires structured bench conditions', () => {
  const data = fixture()
  const observation = data.observations[0]
  const bench = {
    ...observation,
    method: { ...observation.method, modality: 'bench_fixture', conditions_summary: 'Bench test conditions are summarized.' },
    timepoint: { label: 'post-deployment bench test', phase: 'bench_test' },
    context: { ...observation.context, setting: 'bench' },
  }
  expectInvalid({ ...data, observations: [bench] }, /required property 'conditions'/)
  const result = validation({
    ...data,
    observations: [{
      ...bench,
      method: { ...bench.method, conditions: { temperature_c: 37, fixture: 'synthetic radial fixture' } },
    }],
  })
  assert.equal(result.valid, true, result.errors.join('\n'))
})

test('makes conflicts auditable without duplicating source values', () => {
  const dangling = conflictFixture()
  const danglingObservations = dangling.observations as RecordValue[]
  danglingObservations[2] = { ...danglingObservations[2], conflict_observation_ids: ['sample-valve-29-gradient-source-one', 'missing-observation'] }
  expectInvalid(dangling, /references missing observation missing-observation/)

  const nonReported = conflictFixture()
  const nonReportedObservations = nonReported.observations as RecordValue[]
  nonReportedObservations[1] = { ...withoutValueFields(nonReportedObservations[1]), measurement_status: 'not_reported', comparability: 'not_comparable', comparability_rationale: 'The scoped source does not report the measure.' }
  expectInvalid(nonReported, /must have measurement_status reported/)

  const mismatched = conflictFixture()
  const mismatchedObservations = mismatched.observations as RecordValue[]
  mismatchedObservations[1] = { ...mismatchedObservations[1], metric_id: 'other-metric' }
  expectInvalid(mismatched, /must share configuration_id and metric_id/)
})

test('validates unique IDs, references, applicability, and metric-module alignment across the collection', () => {
  const duplicate = fixture()
  expectInvalid({ ...duplicate, device_configurations: [...duplicate.device_configurations, { ...duplicate.device_configurations[0] }], metric_definitions: [...duplicate.metric_definitions, { ...duplicate.metric_definitions[0] }], observations: [...duplicate.observations, { ...duplicate.observations[0] }] }, /duplicate configuration_id[\s\S]*duplicate metric_id[\s\S]*duplicate observation_id/)

  const dangling = fixture()
  expectInvalid({ ...dangling, observations: [{ ...dangling.observations[0], configuration_id: 'missing-configuration', metric_id: 'missing-metric' }] }, /missing configuration missing-configuration[\s\S]*missing metric missing-metric/)

  const inapplicable = fixture()
  expectInvalid({ ...inapplicable, metric_definitions: [{ ...inapplicable.metric_definitions[0], applicable_to: ['LAAO'] }] }, /not applicable to TAVR/)

  const moduleMismatch = fixture()
  expectInvalid({ ...moduleMismatch, observations: [{ ...moduleMismatch.observations[0], module: 'procedural' }] }, /does not match metric mean-transvalvular-gradient module clinical_valve_hemodynamics/)
})
