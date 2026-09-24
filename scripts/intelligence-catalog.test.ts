import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeCatalog } from './intelligence/catalog'

const taxonomy = {
  comparisonCategories: [
    { id: 'laao', label: 'LAA', conditionId: 'cond-af', versionKind: 'device', therapyClass: 'LAAO', targetStructure: 'LAA', mechanism: 'Occlusion', versionIds: [] },
    { id: 'unused', label: 'Unused', conditionId: 'cond-af', versionKind: 'device', therapyClass: 'x', targetStructure: 'x', mechanism: 'x', versionIds: [] },
  ],
  standardAttributes: [
    { id: 'frame-material', label: 'Frame material', section: 'Design', order: 1, valueType: 'text', scope: 'version_wide', categoryIds: ['laao', 'unused'] },
    { id: 'pivotal-trials', label: 'Pivotal trial', section: 'Use', order: 2, valueType: 'text', scope: 'version_wide', categoryIds: ['laao'] },
    { id: 'access-route', label: 'Access', section: 'Delivery & sizing', order: 3, valueType: 'text', scope: 'version_wide', categoryIds: ['unused'] },
  ],
}

test('specs expand into draft comparison claims and populate categories', () => {
  const merged = mergeCatalog({ claims: [] }, taxonomy, [{
    name: 'laao.yaml',
    data: {
      observedAt: '2026-09-23',
      specs: [{
        version: 'ver-amulet', category: 'laao', source: 'src-amulet',
        values: {
          'frame-material': { value: 'Nitinol', loc: 'p.3' },
          'pivotal-trials': { value: 'Amulet IDE', loc: 'p.20', source: 'src-trial', context: 'Randomized vs Watchman' },
        },
      }],
    },
  }])
  const claims = merged.claims as Array<Record<string, unknown>>
  assert.deepEqual(claims.map(claim => [claim.id, claim.category, claim.availability, claim.reviewStatus]), [
    ['claim-amulet-frame-material', 'design', 'reported', 'draft'],
    ['claim-amulet-pivotal-trials', 'evidence', 'reported', 'draft'],
  ])
  assert.deepEqual(claims[1].sourceRefs, [{ sourceId: 'src-trial', locator: 'p.20' }])
  assert.deepEqual((merged.comparisonCategories as Array<{ id: string; versionIds: string[] }>).map(category => [category.id, category.versionIds]), [['laao', ['ver-amulet']]])
  // Unpopulated categories and attributes that only served them are pruned.
  assert.deepEqual((merged.standardAttributes as Array<{ id: string; categoryIds: string[] }>).map(attribute => [attribute.id, attribute.categoryIds]), [['frame-material', ['laao']], ['pivotal-trials', ['laao']]])
})

test('non-values keep their status without a value, and malformed specs fail loudly', () => {
  const merged = mergeCatalog({}, taxonomy, [{ name: 'a.yaml', data: { observedAt: '2026-09-23', specs: [{ version: 'ver-a', category: 'laao', source: 'src-a', values: { 'frame-material': { availability: 'not_publicly_disclosed', loc: 'Section V' } } }] } }])
  const [claim] = merged.claims as Array<Record<string, unknown>>
  assert.equal(claim.availability, 'not_publicly_disclosed')
  assert.equal('value' in claim, false)
  assert.throws(() => mergeCatalog({}, taxonomy, [{ name: 'b.yaml', data: { specs: [{ version: 'ver-b', source: 's', values: { 'made-up': { value: 'x', loc: 'p1' } } }] } }]), /not a taxonomy standard attribute/)
  assert.throws(() => mergeCatalog({}, taxonomy, [{ name: 'c.yaml', data: { specs: [{ version: 'ver-c', source: 's', values: { 'frame-material': { value: 'x' } } }] } }]), /loc must be a non-empty string/)
  assert.throws(() => mergeCatalog({}, taxonomy, [{ name: 'd.yaml', data: { specs: [{ version: 'ver-d', category: 'nope', source: 's', values: {} }] } }]), /unknown taxonomy category/)
  assert.throws(() => mergeCatalog({}, taxonomy, [{ name: 'e.yaml', data: { claimz: [] } }]), /unsupported top-level key claimz/)
})
