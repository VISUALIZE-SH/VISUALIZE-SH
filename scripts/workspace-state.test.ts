import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import yaml from 'js-yaml'
import { atlasTopicNodeIds } from '../src/data/atlas-topic'
import { parseWorkspace, scopeToCondition, workspaceQuery } from '../src/data/workspace-state'
import type { IntelligenceData } from '../src/types/intelligence'
import type { GraphData } from '../src/types/entities'
import { fileURLToPath } from 'node:url'
import { defaultIntelligencePaths, loadIntelligenceSource } from './intelligence/catalog'

test('shared evidence context survives deep links; malformed dates and modes are ignored', () => {
  const state = parseWorkspace('?mode=data&version=ver-feops-heartguide&condition=cond-af&asOf=2023-04-01&jurisdiction=all')
  assert.deepEqual(parseWorkspace(`?${workspaceQuery(state)}`), state)
  assert.equal(parseWorkspace('?asOf=2023-02-31').asOf, '')
  assert.equal(parseWorkspace('?mode=unknown&version=%3Cscript%3E').mode, 'news')
  assert.equal(parseWorkspace('?mode=unknown&version=%3Cscript%3E').versionId, '')
  assert.equal(parseWorkspace('?node=dev-sapien-3').mode, 'atlas', 'legacy node links open the relationship graph')
  assert.equal(parseWorkspace('?node=dev-sapien-3').atlasView, 'graph')
  assert.equal(parseWorkspace('?mode=atlas').atlasView, 'graph', 'Atlas opens in its clustered graph by default')
  assert.equal(parseWorkspace('?mode=atlas&atlas=profiles').atlasView, 'profiles', 'profile deep links remain explicit')
  const topicState = parseWorkspace('?mode=atlas&topic=mitral%20regurgitation')
  assert.equal(topicState.atlasTopic, 'mitral regurgitation')
  assert.equal(topicState.atlasView, 'graph')
  assert.deepEqual(parseWorkspace(`?${workspaceQuery(topicState)}`), topicState)
  assert.equal(parseWorkspace('?mode=atlas&topic=%3Cscript%3E').atlasTopic, '')
})

test('Data comparison state preserves ordered repeated version parameters and validates IDs', () => {
  const state = parseWorkspace('?mode=data&dataView=compare&compareCategory=aortic-tavr&compare=ver-sapien-3&compare=ver-evolut-fx&compare=ver-sapien-3&compare=%3Cscript%3E&compare=ver-ultra&compare=ver-fx-plus&compare=ver-sixth')
  assert.equal(state.dataView, 'compare')
  assert.equal(state.compareCategory, 'aortic-tavr')
  assert.deepEqual(state.compareVersionIds, ['ver-sapien-3', 'ver-evolut-fx', 'ver-ultra', 'ver-fx-plus'])
  assert.deepEqual(parseWorkspace(`?${workspaceQuery(state)}`), state)
  assert.equal(parseWorkspace('?mode=atlas&dataView=compare&compare=ver-sapien-3').dataView, 'browse')
  assert.equal(parseWorkspace('?mode=data&compareCategory=%3Cscript%3E').compareCategory, '')
})

test('configuration comparison parameters are ordered, deduplicated, capped, and Data-only on serialization', () => {
  const state = parseWorkspace('?mode=data&compareConfig=cfg-sapien-23&compareConfig=cfg-evolut-29&compareConfig=cfg-sapien-23&compareConfig=%3Cbad%3E&compareConfig=cfg-third&compareConfig=cfg-fourth&compareConfig=cfg-fifth')
  assert.deepEqual(state.compareConfigurationIds, ['cfg-sapien-23', 'cfg-evolut-29', 'cfg-third', 'cfg-fourth'])
  assert.deepEqual(parseWorkspace(`?${workspaceQuery(state)}`).compareConfigurationIds, state.compareConfigurationIds)
  const otherMode = { ...state, mode: 'atlas' as const }
  assert.equal(new URLSearchParams(workspaceQuery(otherMode)).has('compareConfig'), false)
  assert.deepEqual(parseWorkspace('?mode=data&compareConfig=cfg-ok&compareConfig=bad_id').compareConfigurationIds, ['cfg-ok'])
})

test('News accepts a publication date window and rejects malformed or cross-mode dates', () => {
  const state = parseWorkspace('?mode=news&newsFrom=2026-01-01&newsTo=2026-09-30')
  assert.equal(state.newsFrom, '2026-01-01')
  assert.equal(state.newsTo, '2026-09-30')
  assert.equal(state.asOf, '')
  assert.equal(state.jurisdiction, '')
  assert.deepEqual(parseWorkspace(`?${workspaceQuery(state)}`), state)

  const malformed = parseWorkspace('?mode=news&newsFrom=2026-02-29&newsTo=2026-13-01&asOf=2026-01-01&jurisdiction=US')
  assert.equal(malformed.newsFrom, '')
  assert.equal(malformed.newsTo, '')
  assert.equal(malformed.asOf, '')
  assert.equal(malformed.jurisdiction, '')

  const evidence = parseWorkspace('?mode=data&newsFrom=2026-01-01&newsTo=2026-09-30')
  assert.equal(evidence.newsFrom, '')
  assert.equal(evidence.newsTo, '')
})

test('condition context retains family-level trial evidence without claiming an exact generation', () => {
  const data = loadIntelligenceSource(defaultIntelligencePaths(fileURLToPath(new URL('..', import.meta.url)))) as unknown as IntelligenceData
  const scoped = scopeToCondition(data, 'cond-af')
  assert.ok(scoped.trials.some(trial => trial.id === 'evidence-predict' && !trial.versionIds.length))
  assert.ok(scoped.outcomes.some(outcome => outcome.id === 'outcome-predict-primary'))
  assert.ok(scoped.events.some(event => event.id === 'event-predict-laa'))
  assert.ok(!scoped.outcomes.some(outcome => outcome.id.startsWith('outcome-tri-')))
  assert.ok(scoped.outcomes.every(outcome => scoped.readouts.some(readout => readout.id === outcome.readoutId)))
  assert.ok(scoped.media?.some(media => media.id === 'media-feops-heartguide-function'))
  assert.ok(!scoped.media?.some(media => media.id === 'media-sapien-3-valve'))
  assert.ok(scoped.media?.every(media => media.versionIds.some(versionId => scoped.versions.some(version => version.id === versionId))))
  assert.ok(data.versions.length > scoped.versions.length, 'derived view must not mutate the authored dataset')
})

test('condition scoping filters comparative configurations and observations while retaining metric definitions', () => {
  const data = loadIntelligenceSource(defaultIntelligencePaths(fileURLToPath(new URL('..', import.meta.url)))) as unknown as IntelligenceData
  const inside = data.versions.find(version => data.families.find(family => family.id === version.familyId)?.conditionIds.includes('cond-as'))!
  const outside = data.versions.find(version => !data.families.find(family => family.id === version.familyId)?.conditionIds.includes('cond-as'))!
  data.comparative = {
    schema_version: 1,
    device_configurations: [inside, outside].map(version => ({
      configuration_id: `cfg-${version.id}`, product_version_id: version.id, device_family_id: version.familyId,
      generation: version.name, configuration_label: version.name, therapy_class: 'test', target_structure: 'test', mechanism: 'test',
    })),
    metric_definitions: [{ metric_id: 'metric-retained', display_name: 'Metric', module: 'test', value_kind: 'text', applicable_to: [], required_context: [], default_comparability: 'not_comparable' }],
    observations: [inside, outside].map(version => ({
      observation_id: `obs-${version.id}`, configuration_id: `cfg-${version.id}`, metric_id: 'metric-retained', module: 'test',
      measurement_status: 'not_reported', comparability: 'not_comparable', comparability_rationale: '',
      method: { modality: 'unknown', protocol_or_grading_standard: 'unknown', conditions_summary: 'unknown' },
      timepoint: { label: 'unknown', phase: 'unknown' },
      context: { setting: 'unknown', target_structure: 'unknown', anatomy_or_model: 'unknown', cohort_or_sample: 'unknown' },
      provenance: { source_type: 'unknown', url: 'https://example.test', locator: 'unknown', extracted_on: '2026-01-01', review_status: 'unreviewed' },
    })),
  }
  const scoped = scopeToCondition(data, 'cond-as')
  assert.deepEqual(scoped.comparative?.device_configurations.map(configuration => configuration.product_version_id), [inside.id])
  assert.deepEqual(scoped.comparative?.observations.map(observation => observation.configuration_id), [`cfg-${inside.id}`])
  assert.equal(scoped.comparative?.metric_definitions.length, 1)
  assert.equal(data.comparative.device_configurations.length, 2, 'condition view must not mutate authored comparative data')
})

test('news topics only link when they resolve to Atlas entities', () => {
  const graph = JSON.parse(readFileSync(new URL('../public/graph.json', import.meta.url), 'utf8')) as GraphData
  const nodes = graph.elements.nodes.map((node) => node.data)
  assert.ok(atlasTopicNodeIds(nodes, 'TAVR').has('dev-evolut'))
  assert.ok(atlasTopicNodeIds(nodes, 'LAAO').has('dev-watchman-flx'), 'common topic acronyms resolve to Atlas terminology')
  assert.equal(atlasTopicNodeIds(nodes, 'not an Atlas topic').size, 0)
})
