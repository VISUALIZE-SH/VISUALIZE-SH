import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { trialIssues } from './trial-validation'
import { enrollmentCountLabel, enrollmentEntries, primaryAnalysisLabel, trialStatusLabel } from '../src/data/trial-display'
import type { EnrollmentCount } from '../src/types/entities'

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true })
addFormats(ajv)
const validate = ajv.compile(JSON.parse(readFileSync(new URL('../schema/trial.schema.json', import.meta.url), 'utf8')))

const trial = {
  id: 'trial-example', type: 'trial', name: 'EXAMPLE', conditions: ['cond-af'], therapies: ['dev-example'],
  resultStatus: 'ongoing', curation: { status: 'draft', lastUpdated: '2026-10-21' },
}
const source = 'https://clinicaltrials.gov/study/NCT00000001'
const randomized: EnrollmentCount = { count: 250, basis: 'randomized', source }
const actual: EnrollmentCount = { count: 312, basis: 'actual', asOf: '2026-03-01', scope: 'excludes roll-in', source }

test('legacy trials without the new fields remain valid', () => {
  assert.equal(validate({ ...trial, status: 'active', enrollment: 100 }), true, JSON.stringify(validate.errors))
})

test('registry status accepts not-yet-recruiting and rejects unknown values', () => {
  assert.equal(validate({ ...trial, status: 'not-yet-recruiting' }), true, JSON.stringify(validate.errors))
  assert.equal(validate({ ...trial, status: 'reported' }), false)
})

test('primaryAnalysis is separate from status and requires a source when reported', () => {
  const reported = { status: 'reported', date: '2025-05-01', precision: 'month', source }
  assert.equal(validate({ ...trial, status: 'active', primaryAnalysis: reported }), true, JSON.stringify(validate.errors))
  assert.equal(validate({ ...trial, primaryAnalysis: { status: 'not-reported' } }), true, JSON.stringify(validate.errors))
  assert.equal(validate({ ...trial, primaryAnalysis: { status: 'reported' } }), false)
  assert.equal(validate({ ...trial, primaryAnalysis: { ...reported, source: 'http://example.org/insecure' } }), false)
  assert.equal(validate({ ...trial, primaryAnalysis: { status: 'reported', source, date: '2025-05-01' } }), false, 'date requires precision')
  assert.equal(validate({ ...trial, primaryAnalysis: { ...reported, precision: 'quarter' } }), false)
  assert.equal(validate({ ...trial, primaryAnalysis: { status: 'completed' } }), false)
  assert.equal(validate({ ...trial, primaryAnalysis: { ...reported, extra: true } }), false)
})

test('enrollmentCounts are typed, sourced and closed', () => {
  assert.equal(validate({ ...trial, enrollmentCounts: [randomized, actual] }), true, JSON.stringify(validate.errors))
  assert.equal(validate({ ...trial, enrollmentCounts: [{ count: 10, basis: 'actual' }] }), false, 'source required')
  assert.equal(validate({ ...trial, enrollmentCounts: [{ ...randomized, basis: 'target' }] }), false)
  assert.equal(validate({ ...trial, enrollmentCounts: [{ ...randomized, count: -1 }] }), false)
  assert.equal(validate({ ...trial, enrollmentCounts: [{ ...randomized, count: 1.5 }] }), false)
  assert.equal(validate({ ...trial, enrollmentCounts: [{ ...randomized, note: 'x' }] }), false)
})

test('cross-check requires a source for a reported primary analysis', () => {
  assert.deepEqual(trialIssues({ primaryAnalysis: { status: 'reported', source } }), { errors: [], warnings: [] })
  assert.match(trialIssues({ primaryAnalysis: { status: 'reported' } }).errors[0], /primaryAnalysis\.source is required/)
  assert.deepEqual(trialIssues({ primaryAnalysis: { status: 'not-reported' } }).errors, [])
  assert.match(trialIssues({ primaryAnalysis: { status: 'reported', source, date: '2025-05-01' } }).errors[0], /precision is required/)
})

test('cross-check keeps basis and scope pairs unique', () => {
  assert.deepEqual(trialIssues({ enrollmentCounts: [randomized, actual, { ...actual, scope: 'includes roll-in' }] }).errors, [])
  const duplicate = trialIssues({ enrollmentCounts: [randomized, { ...randomized, count: 251 }] }).errors
  assert.equal(duplicate.length, 1)
  assert.match(duplicate[0], /enrollmentCounts\[1\] repeats basis "randomized"/)
  assert.equal(trialIssues({ enrollmentCounts: [actual, { ...actual, count: 300 }] }).errors.length, 1)
})

test('a legacy enrollment that matches no typed count is a warning, not an error', () => {
  assert.deepEqual(trialIssues({ enrollment: 312, enrollmentCounts: [randomized, actual] }), { errors: [], warnings: [] })
  const mismatch = trialIssues({ enrollment: 999, enrollmentCounts: [randomized, actual] })
  assert.deepEqual(mismatch.errors, [])
  assert.match(mismatch.warnings[0], /enrollment 999 matches none of enrollmentCounts \(250 randomized, 312 actual\)/)
  assert.deepEqual(trialIssues({ enrollment: 999 }), { errors: [], warnings: [] })
  assert.deepEqual(trialIssues({ enrollmentCounts: [randomized] }), { errors: [], warnings: [] })
})

test('display labels keep status separate from primary analysis and type each count', () => {
  assert.equal(trialStatusLabel('not-yet-recruiting'), 'Not yet recruiting')
  assert.equal(trialStatusLabel('active'), 'Active')
  assert.equal(trialStatusLabel(undefined), undefined)
  assert.equal(primaryAnalysisLabel(undefined), undefined)
  assert.equal(primaryAnalysisLabel({ status: 'not-reported' }), 'Not reported')
  assert.equal(primaryAnalysisLabel({ status: 'reported', source }), 'Reported')
  assert.equal(primaryAnalysisLabel({ status: 'reported', source, date: '2025-05-01', precision: 'month' }), 'Reported (2025-05)')
  assert.equal(primaryAnalysisLabel({ status: 'reported', source, date: '2025-01-01', precision: 'year' }), 'Reported (2025)')
  assert.equal(primaryAnalysisLabel({ status: 'reported', source, date: '2025-05-17', precision: 'day' }), 'Reported (2025-05-17)')
  assert.equal(enrollmentCountLabel(randomized), '250 randomized')
  assert.equal(enrollmentCountLabel({ ...actual, scope: undefined }), '312 enrolled (actual)')
  assert.equal(enrollmentCountLabel(actual), '312 enrolled (actual, excludes roll-in)')
  assert.equal(enrollmentCountLabel({ count: 1200, basis: 'estimated', source }), '1,200 enrolled (estimated)')
  assert.equal(enrollmentCountLabel({ count: 90, basis: 'analyzed', scope: 'per protocol', source }), '90 analyzed (per protocol)')
})

test('enrollment falls back to the legacy count unchanged when typed counts are absent', () => {
  assert.deepEqual(enrollmentEntries({ enrollment: 1025 }), [{ label: '1,025' }])
  assert.deepEqual(enrollmentEntries({ enrollment: 1025, enrollmentCounts: [] }), [{ label: '1,025' }])
  assert.deepEqual(enrollmentEntries({}), [])
  assert.deepEqual(enrollmentEntries({ enrollment: 312, enrollmentCounts: [randomized, actual] }).map(entry => entry.label),
    ['250 randomized', '312 enrolled (actual, excludes roll-in)'])
})
