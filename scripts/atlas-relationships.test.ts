import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import cytoscape from 'cytoscape'
import { relationshipEndpointIssues } from './graph-relationships'
import { atlasTargetLabels } from '../src/data/atlas-targets'
import { buildStylesheet } from '../src/graph/cytoscapeStyles'
import type { Entity, GraphData, SourcedRelationship } from '../src/types/entities'

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)
const validate = ajv.compile(JSON.parse(readFileSync(new URL('../schema/relationship.schema.json', import.meta.url), 'utf8')))
const graph: GraphData = JSON.parse(readFileSync(new URL('../public/graph.json', import.meta.url), 'utf8'))
const byId = new Map(graph.elements.nodes.map(({ data }) => [data.id, data]))
const entities = new Map<string, Entity>(graph.elements.nodes.map(({ data }) => [data.id, data.entity]))
const edges = graph.elements.edges.map(({ data }) => data)
const example = edges.find(edge => edge.evidence?.relationship === 'used_in')!.evidence!

test('documentary edges require provenance, exact locators and review state', () => {
  assert.equal(validate(example), true, JSON.stringify(validate.errors))
  for (const field of ['access', 'locator', 'retrievedAt', 'sourceType']) {
    const source = { ...example.sources[0] } as Record<string, unknown>
    delete source[field]
    assert.equal(validate({ ...example, sources: [source] }), false, `missing ${field}`)
  }
  assert.equal(validate({ ...example, eventDate: '2025' }), true)
  assert.equal(validate({ ...example, eventDate: '2026-01' }), true)
  assert.equal(validate({ ...example, eventDate: '2026-13' }), false)
  assert.equal(validate({ ...example, sources: [] }), false)
  assert.equal(validate({ ...example, curation: { ...example.curation, status: 'approved' } }), false)
})

test('relationship endpoints reject semantic category errors and missing nodes', () => {
  assert.deepEqual(relationshipEndpointIssues(example, entities), [])
  assert.ok(relationshipEndpointIssues({ ...example, target: 'cond-as' }, entities).length)
  assert.ok(relationshipEndpointIssues({ ...example, source: 'co-edwards' }, entities).length)
  assert.ok(relationshipEndpointIssues({ ...example, source: 'dev-missing' }, entities).length)
  const corporate = { ...example, source: 'co-edwards', target: 'cond-as', relationship: 'invested_in' } as SourcedRelationship
  assert.ok(relationshipEndpointIssues(corporate, entities).length)
})

test('research additions preserve scoped targets and distinguish investigation from treatment', () => {
  for (const edge of edges.filter(edge => edge.evidence)) {
    assert.equal(validate(edge.evidence), true, JSON.stringify(validate.errors))
    assert.deepEqual(relationshipEndpointIssues(edge.evidence!, entities), [])
    assert.equal(edge.isDraft, false, `${edge.id} reflects owner approval`)
  }
  const pascal = atlasTargetLabels(byId.get('dev-pascal')!, byId, edges)
  assert.ok(pascal.label.includes('TR (study)'))
  assert.ok(pascal.label.includes('MR'))
  const tendyne = atlasTargetLabels(byId.get('dev-tendyne')!, byId, edges)
  assert.ok(tendyne.label.includes('MS*'))
  assert.ok(edges.find(edge => edge.source === 'dev-tendyne' && edge.target === 'cond-ms')!.evidence!.scope.includes('MAC'))
  assert.ok(!edges.some(edge => edge.source === 'co-edwards' && edge.target === 'co-jenavalve' && edge.relationship === 'acquired'))
  assert.ok(atlasTargetLabels(byId.get('dev-pascal')!, byId, edges.filter(edge => !edge.isDraft)).label.includes('TR (study)'))
})

test('Islands and Timeline distinguish reviewed, draft and investigation edges', () => {
  for (const stableIslands of [true, false]) {
    const cy = cytoscape({ headless: true, styleEnabled: true, elements: graph.elements, style: buildStylesheet({ stableIslands }) })
    try {
      for (const edge of edges.filter(edge => edge.evidence)) {
        const dotted = ['investigated_for', 'option_to_acquire', 'terminated_acquisition'].includes(edge.relationship)
          || (stableIslands && ['invested_in', 'acquired', 'portfolio_includes'].includes(edge.relationship))
        assert.equal(cy.getElementById(edge.id).style('line-style'), dotted ? 'dotted' : 'solid', `${stableIslands ? 'Islands' : 'Timeline'}: ${edge.id}`)
      }
      const reviewedEdge = edges.find(edge => edge.evidence && edge.relationship === 'used_in')!
      const draft = { ...reviewedEdge, id: 'fixture-draft-edge', isDraft: true }
      cy.add({ data: draft })
      assert.equal(cy.getElementById(draft.id).style('line-style'), 'dashed')
    } finally {
      cy.destroy()
    }
  }
})
