import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'
import yaml from 'js-yaml'
import type { IntelligenceData } from '../src/types/intelligence'
import { compileIntelligence } from './build-intelligence'
import { IntelligenceValidationError, loadLegacyIds, validateIntelligence } from './intelligence/validation'
import { defaultIntelligencePaths, loadIntelligenceSource } from './intelligence/catalog'

const SCHEMA = resolve('schema/intelligence.schema.json')
const LEGACY = new Set(['dev-one', 'cond-one', 'trial-legacy'])
const provenance = {
  get sourceRefs() { return [{ sourceId: 'src-one', locator: 'Section 1' }] },
  reviewStatus: 'draft' as const,
}

function validData(): IntelligenceData {
  return {
    schemaVersion: 1,
    updatedAt: '2026-09-21',
    coverage: { title: 'Test pilot', description: 'Synthetic validation fixture.' },
    sources: [{ id: 'src-one', title: 'Synthetic source', url: 'https://example.org/source', kind: 'other', publisher: 'Example', retrievedAt: '2026-09-21', access: 'public' }],
    families: [{ id: 'family-one', name: 'Family One', manufacturer: 'Example', entityIds: ['dev-one'], conditionIds: ['cond-one'], description: 'Synthetic family.' }],
    versions: [
      { id: 'ver-one', familyId: 'family-one', name: 'Version One', kind: 'device', clinicalRole: 'treats', summary: 'First.', ...provenance },
      { id: 'ver-two', familyId: 'family-one', name: 'Version Two', kind: 'device', clinicalRole: 'treats', summary: 'Second.', ...provenance },
    ],
    claims: [
      { id: 'claim-zero', versionId: 'ver-one', category: 'evidence', key: 'events', label: 'Events', value: 0, unit: 'events', availability: 'reported', basis: 'directly_reported', observedAt: '2026-09-21', ...provenance },
      { id: 'claim-missing', versionId: 'ver-one', category: 'design', key: 'stress', label: 'Stress', unit: 'MPa', availability: 'not_yet_reviewed', basis: 'directly_reported', observedAt: '2026-09-21', ...provenance },
    ],
    decisions: [{ id: 'decision-one', identifier: 'P000001', rootIdentifier: 'P000001', jurisdiction: 'US', pathway: 'PMA', date: { value: '2026-09', precision: 'month' }, versionIds: ['ver-one', 'ver-two'], changeType: 'initial_authorization', summary: 'Synthetic decision.', ...provenance }],
    indications: [{ id: 'indication-one', decisionId: 'decision-one', versionIds: ['ver-one'], jurisdiction: 'US', effectiveDate: { value: '2026', precision: 'year' }, text: 'Synthetic indication.', textType: 'paraphrase', population: 'Synthetic population.', ...provenance }],
    trials: [{ id: 'trial-one', name: 'Trial One', nctId: 'NCT00000001', entityId: 'trial-legacy', familyIds: ['family-one'], design: 'Randomized', versionIds: ['ver-one'], versionMapping: 'exact', population: 'Synthetic population.', ...provenance }],
    trialSnapshots: [{ id: 'snapshot-one', trialId: 'trial-one', observedAt: '2026-09-21', status: 'COMPLETED', enrollment: { value: 10, basis: 'actual', scope: 'Participants enrolled' }, ...provenance }],
    cohorts: [{ id: 'cohort-one', trialId: 'trial-one', name: 'Randomized cohort', population: 'Synthetic population.', enrollment: [{ value: 10, stage: 'randomized' }], arms: [{ id: 'arm-one', name: 'Intervention', randomized: 10 }], ...provenance }],
    endpoints: [{ id: 'endpoint-one', name: 'Endpoint', definition: 'Synthetic endpoint.', hierarchy: 'primary', measureType: 'binary', timeframe: '1 year', analysisPopulation: 'ITT', ...provenance }],
    readouts: [{ id: 'readout-one', trialId: 'trial-one', cohortId: 'cohort-one', title: 'Primary readout', publishedAt: { value: '2026-09-20', precision: 'day' }, followUp: '1 year', maturity: 'primary', versionIds: ['ver-one'], ...provenance }],
    outcomes: [{ id: 'outcome-one', readoutId: 'readout-one', endpointId: 'endpoint-one', arms: [{ armId: 'arm-one', value: 0, unit: '%' }], effect: { measure: 'Risk difference', value: 0, unit: '%', ci: { lower: -1, upper: 1, level: 95, sidedness: 'two_sided' } }, pValue: 1, pValueQualifier: '=', interpretation: 'No difference in this synthetic fixture.', ...provenance }],
    lineage: [
      { id: 'lineage-predicate', fromVersionId: 'ver-one', toVersionId: 'ver-two', relationship: 'predicate_for', explanation: 'Regulatory predicate only.', ...provenance },
      { id: 'lineage-successor', fromVersionId: 'ver-two', toVersionId: 'ver-one', relationship: 'succeeds', explanation: 'Documented successor.', ...provenance },
    ],
    events: [{ id: 'event-one', title: 'Synthetic event', eventDate: { value: '2026-09', precision: 'month' }, publishedAt: { value: '2026', precision: 'year' }, discoveredAt: '2026-09-21', kind: 'evidence', versionIds: [], decisionIds: [], readoutIds: ['readout-one'], before: 'Before.', after: 'After.', whyItMatters: 'Synthetic rationale.', uncertainty: 'Synthetic uncertainty.', ...provenance }],
  }
}

function expectInvalid(data: IntelligenceData, pattern: RegExp): void {
  assert.throws(() => validateIntelligence(data, { schemaPath: SCHEMA, legacyIds: LEGACY }), (error: unknown) => {
    assert.ok(error instanceof IntelligenceValidationError)
    assert.match(error.message, pattern)
    return true
  })
}

test('accepts reported zero, explicit missingness, and keeps predicate relationships out of ancestry', () => {
  assert.equal(validateIntelligence(validData(), { schemaPath: SCHEMA, legacyIds: LEGACY }).claims[0].value, 0)
})

test('comparison categories and attributes keep exact version and scope boundaries', () => {
  function comparisonData() {
    const data = validData()
    data.comparisonCategories = [{ id: 'category-one', label: 'Synthetic devices', conditionId: 'cond-one', versionKind: 'device', therapyClass: 'Synthetic class', targetStructure: 'Synthetic target', mechanism: 'Replacement', versionIds: ['ver-one', 'ver-two'] }]
    data.standardAttributes = [{ id: 'attribute-one', label: 'Material', section: 'Design', order: 1, valueType: 'text', scope: 'version_wide', categoryIds: ['category-one'] }]
    data.claims[1].comparisonAttributeId = 'attribute-one'
    return data
  }
  assert.doesNotThrow(() => validateIntelligence(comparisonData(), { schemaPath: SCHEMA, legacyIds: LEGACY }))

  const wrongKind = comparisonData(); wrongKind.comparisonCategories![0].versionKind = 'digital'
  expectInvalid(wrongKind, /kind device does not match digital/)
  const wrongScope = comparisonData(); wrongScope.standardAttributes![0].scope = 'configuration'
  expectInvalid(wrongScope, /cannot use configuration without a scoped observation/)
  const wrongType = comparisonData(); wrongType.claims[1].availability = 'reported'; wrongType.claims[1].value = 42
  expectInvalid(wrongType, /value type does not match attribute-one/)
  const interpretation = comparisonData(); interpretation.claims[1].basis = 'analyst_interpretation'
  expectInvalid(interpretation, /cannot attach an analyst interpretation/)
  const dangling = comparisonData(); dangling.claims[1].comparisonAttributeId = 'attribute-missing'
  expectInvalid(dangling, /references missing standard attribute attribute-missing/)
})

test('configuration dataset validates exact version, family, and generation links', () => {
  const pilot = loadIntelligenceSource(defaultIntelligencePaths(resolve('.'))) as unknown as IntelligenceData
  const comparative = JSON.parse(readFileSync(resolve('data/intelligence/comparative-pilot.yaml'), 'utf8')) as NonNullable<IntelligenceData['comparative']>
  const data = { ...pilot, comparative }
  const legacyIds = loadLegacyIds(resolve('data'), resolve('public/graph.json'))
  assert.doesNotThrow(() => validateIntelligence(data, { schemaPath: SCHEMA, legacyIds }))

  const wrongVersion = structuredClone(data)
  wrongVersion.comparative.device_configurations[0].product_version_id = 'ver-missing'
  assert.throws(() => validateIntelligence(wrongVersion, { schemaPath: SCHEMA, legacyIds }), /product_version_id references missing version/)
  const wrongFamily = structuredClone(data)
  wrongFamily.comparative.device_configurations[0].device_family_id = 'family-evolut'
  assert.throws(() => validateIntelligence(wrongFamily, { schemaPath: SCHEMA, legacyIds }), /device_family_id does not match/)
  const wrongGeneration = structuredClone(data)
  wrongGeneration.comparative.device_configurations[0].generation = 'Evolut FX'
  assert.throws(() => validateIntelligence(wrongGeneration, { schemaPath: SCHEMA, legacyIds }), /generation does not match exact version/)
})

test('rejects dangling record and legacy cross-references', () => {
  const missingVersion = validData(); missingVersion.claims[0].versionId = 'ver-missing'
  expectInvalid(missingVersion, /references missing version ver-missing/)
  const missingLegacy = validData(); missingLegacy.families[0].conditionIds = ['cond-missing']
  expectInvalid(missingLegacy, /missing legacy graph ID cond-missing/)
})

test('keeps regulatory and product-family identities internally consistent', () => {
  const regulatory = validData(); regulatory.decisions[0].rootIdentifier = 'P999999'
  expectInvalid(regulatory, /inconsistent PMA identifier\/rootIdentifier/)
  const family = validData(); family.trials[0].familyIds = ['family-other']; family.families.push({ ...family.families[0], id: 'family-other' })
  expectInvalid(family, /familyIds omits family-one/)
})

test('rejects mismatched cohort/readout trial identity', () => {
  const data = validData()
  data.trials.push({ ...data.trials[0], id: 'trial-two', nctId: 'NCT00000002' })
  data.readouts[0].trialId = 'trial-two'
  expectInvalid(data, /combines cohort cohort-one from trial-one with trial trial-two/)
})

test('never treats an enrollment target as actual enrollment', () => {
  const data = validData(); data.trialSnapshots[0].enrollment.scope = 'Target enrollment'
  expectInvalid(data, /marked actual but scope describes a target\/estimate/)
})

test('rejects dangling, cross-jurisdiction, and cyclic indication supersession', () => {
  const dangling = validData(); dangling.indications[0].supersedesId = 'indication-missing'
  expectInvalid(dangling, /references missing indication indication-missing/)

  const jurisdiction = validData()
  jurisdiction.indications[0].jurisdiction = 'EU'
  expectInvalid(jurisdiction, /does not match decision jurisdiction US/)

  const cyclic = validData()
  cyclic.indications.push({ ...cyclic.indications[0], id: 'indication-two', supersedesId: 'indication-one' })
  cyclic.indications[0].supersedesId = 'indication-two'
  expectInvalid(cyclic, /indication supersedes cycle/)
})

test('rejects fabricated exact-version mappings and invalid date precision', () => {
  const mapping = validData(); mapping.trials[0].versionMapping = 'unclear'
  expectInvalid(mapping, /versionIds.*must NOT have more than 0 items/)
  const readoutMapping = validData(); readoutMapping.trials[0].versionMapping = 'unclear'; readoutMapping.trials[0].versionIds = []
  expectInvalid(readoutMapping, /cannot claim an exact version while trial trial-one has unresolved version mapping/)
  const date = validData(); date.decisions[0].date = { value: '2026-09-21', precision: 'month' }
  expectInvalid(date, /does not match precision month/)
})

test('requires source locators for reported claims and correct confidence bounds', () => {
  const locator = validData(); locator.claims[0].sourceRefs[0].locator = ''
  expectInvalid(locator, /locator.*must NOT have fewer than 1 characters|locator.*must match pattern/)
  const bounds = validData(); bounds.outcomes[0].effect!.ci = { lower: -1, upper: 1, sidedness: 'one_sided' }
  expectInvalid(bounds, /one-sided interval must report exactly one bound/)
  const halfInterval = validData(); halfInterval.outcomes[0].effect!.ci = { upper: 1, sidedness: 'one_sided' }
  assert.doesNotThrow(() => validateIntelligence(halfInterval, { schemaPath: SCHEMA, legacyIds: LEGACY }))
})

test('outcomes retain readout provenance and plausible arm denominators', () => {
  const source = validData()
  source.sources.push({ ...source.sources[0], id: 'src-other' }); source.outcomes[0].sourceRefs = [{ sourceId: 'src-other', locator: 'Results' }]
  expectInvalid(source, /sourceRefs does not include a source from readout readout-one/)
  const denominator = validData(); denominator.outcomes[0].arms[0].denominator = 11
  expectInvalid(denominator, /denominator exceeds randomized count/)
  const percentage = validData(); percentage.outcomes[0].arms[0].value = 101
  expectInvalid(percentage, /percentage for arm-one must be between 0 and 100/)
})

test('public source snapshots require both a path and a content hash', () => {
  const data = validData(); data.sources[0].snapshotPath = 'evidence/source.pdf'
  expectInvalid(data, /must have required property 'sha256'/)
})

test('validates cited local evidence-media renditions and their version references', () => {
  const data = validData()
  data.media = [{
    id: 'media-one', versionIds: ['ver-one'], panel: 'design', title: 'Device profile', caption: 'A cited source-page rendition.',
    alt: 'A labeled device profile from an official document.', assetPath: '/evidence/fda/device-profile-page-4.png', page: 4, figure: 'Figure 2',
    crop: { x: 0.1, y: 0.2, width: 0.7, height: 0.6 }, ...provenance,
  }]
  assert.doesNotThrow(() => validateIntelligence(data, { schemaPath: SCHEMA, legacyIds: LEGACY }))

  const path = validData(); path.media = [{ ...data.media[0], assetPath: 'https://example.org/device.png' }]
  expectInvalid(path, /assetPath.*must match pattern|safe root-relative image/)
  const version = validData(); version.media = [{ ...data.media[0], versionIds: ['ver-missing'] }]
  expectInvalid(version, /versionIds references missing version ver-missing/)
  const crop = validData(); crop.media = [{ ...data.media[0], crop: { x: 0.8, y: 0.2, width: 0.4, height: 0.6 } }]
  expectInvalid(crop, /crop must remain within normalized source-page bounds/)
})

test('compiler output is deterministic and unchanged inputs are not rewritten', () => {
  const directory = mkdtempSync(join(tmpdir(), 'visualize-sh-intelligence-'))
  try {
    const input = join(directory, 'pilot.yaml'); const output = join(directory, 'intelligence.json')
    const legacy = join(directory, 'legacy'); const graph = join(directory, 'graph.json'); const schema = SCHEMA
    const data = validData()
    writeFileSync(input, yaml.dump(data, { noRefs: true, sortKeys: false }))
    writeFileSync(graph, JSON.stringify({ nodes: [...LEGACY].map(id => ({ data: { id } })) }))
    const options = { input, output, schema, legacyDataDir: legacy, graph }
    const first = compileIntelligence(options); const contents = readFileSync(output, 'utf8')
    const second = compileIntelligence(options)
    assert.equal(first.changed, true); assert.equal(second.changed, false); assert.equal(second.json, contents)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
