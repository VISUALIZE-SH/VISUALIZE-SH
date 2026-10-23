import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import registry from '../data/illustrations/therapy-schematics.json'
import { deviceIllustrationFor, therapyIllustrationFor } from '../src/data/device-illustrations'
import { therapySnapshots } from '../src/data/therapy-snapshots'
import type { GraphNodeData } from '../src/types/entities'
import type { IntelligenceData } from '../src/types/intelligence'

const data: IntelligenceData = JSON.parse(readFileSync(new URL('../public/intelligence.json', import.meta.url), 'utf8'))
const nodes: GraphNodeData[] = JSON.parse(readFileSync(new URL('../public/graph.json', import.meta.url), 'utf8')).elements.nodes.map((node: { data: GraphNodeData }) => node.data)
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')

test('all approved graph-level illustrations retain their original geometry and exact identities', () => {
  assert.equal(registry.illustrations.length, 18)
  assert.equal(new Set(registry.illustrations.map(item => item.entityId)).size, 18)
  const rows = therapySnapshots(data, nodes)
  for (const item of registry.illustrations) {
    assert.ok(rows.some(row => row.therapy.id === item.entityId), item.entityId)
    assert.equal(deviceIllustrationFor(item.entityId), undefined, 'graph concepts cannot become version artwork')
    const { entityId, assetPath, alt, configuration, limitations, sources } = item
    assert.deepEqual(therapyIllustrationFor(entityId), { entityId, assetPath, alt, configuration, limitations, sources })
    const svg = readFileSync(new URL(`../public/${assetPath}`, import.meta.url), 'utf8')
    assert.equal(hash(svg), item.sha256)
    const original = svg.replace('Artwork approved by owner 2026-10-23; not production CAD.', 'Human approval pending.')
      .replace('VISUALIZE·SH / DESIGN ILLUSTRATION', 'VISUALIZE·SH / LOCAL ARTWORK REVIEW')
      .replace('Owner-approved artwork · Pictured configuration only · Not production CAD', 'Source-informed draft · Configuration limits in source register · Approval pending')
    assert.equal(hash(original), item.approvedGeometrySha256, `${entityId}: publication must only alter review captions`)
    assert.match(svg, /NOT TO SCALE/)
    assert.match(svg, item.scope === 'concept' ? /CONCEPT FOR ILLUSTRATION/ : /SCHEMATIC FOR ILLUSTRATION/)
    assert.doesNotMatch(svg, /<(?:script|foreignObject|image)\b|approval pending/i)
    assert.ok(sources.every(source => source.locator && source.url.startsWith('https://')))
    assert.ok(limitations.length)
  }
})

test('Data renders unillustrated therapies and unresolved families with the shared placeholder', async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), 'visualize-sh-thumbnails-vite-'))
  let server: Awaited<ReturnType<typeof createServer>> | undefined
  try {
    server = await createServer({ cacheDir, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
    const { default: ProductThumbnail } = await server.ssrLoadModule('/src/components/intelligence/ProductThumbnail.tsx')
    const { default: DataWorkspace } = await server.ssrLoadModule('/src/components/intelligence/DataWorkspace.tsx')
    const { scopeToCondition } = await server.ssrLoadModule('/src/data/workspace-state.ts')
    const placeholder = renderToStaticMarkup(createElement(ProductThumbnail, { name: 'Unresolved therapy' }))
    assert.equal((placeholder.match(/<circle /g) ?? []).length, 2)
    assert.match(placeholder, /Illustration unavailable for Unresolved therapy/)
    assert.match(placeholder, />\?<\/text>/)
    const props = {
      data, catalogData: data, therapyNodes: nodes, nodesById: new Map(nodes.map(node => [node.id, node])), conditionId: '', versionId: null,
      onOpenAtlas() {}, jurisdiction: 'US', asOf: '', dataView: 'browse', initialQuery: 'Alleviant Medical',
      compareCategory: '', compareVersionIds: [], compareConfigurationIds: [], onDataViewChange() {},
      onCompareCategoryChange() {}, onCompareVersionIdsChange() {}, onCompareConfigurationIdsChange() {},
    }
    const render = (patch = {}) => renderToStaticMarkup(createElement(DataWorkspace, { ...props, ...patch }))
    assert.match(render(), /dev-alleviant-alv1-orthographic.svg/)
    assert.match(render({ initialQuery: 'Approxima' }), /Illustration unavailable for Approxima/)
    assert.doesNotMatch(render({ asOf: '2026-10-01' }), /id="data-therapy-snapshots"/)
    assert.doesNotMatch(render({ versionId: data.versions[0].id }), /id="data-therapy-snapshots"/)
    const scopedNodes = nodes.filter(node => node.entity.type === 'therapy' && node.entity.treats.includes('cond-ms'))
    assert.doesNotMatch(render({ data: scopeToCondition(data, 'cond-ms'), therapyNodes: scopedNodes, conditionId: 'cond-ms', initialQuery: 'Tendyne' }), /id="data-therapy-snapshots"/)
  } finally {
    await server?.close()
    rmSync(cacheDir, { recursive: true, force: true })
  }
})

test('snapshots filter authored graph therapies without inventing versions or dropping held therapies', () => {
  const rows = therapySnapshots(data, nodes)
  assert.ok(rows.some(row => row.therapy.therapyType !== 'device' && !row.illustration))
  assert.ok(rows.some(row => row.therapy.id === 'dev-approxima-tricuspid-reshaping' && !row.illustration))
  assert.equal(therapySnapshots(data, nodes, 'altavalve')[0].therapy.id, 'dev-altavalve')
  assert.ok(therapySnapshots(data, nodes, 'Alleviant Medical').some(row => row.therapy.id === 'dev-alleviant-alv1'), 'displayed maker is searchable')
  assert.equal(therapySnapshots(data, nodes, 'no-such-therapy-123').length, 0)
  assert.equal(therapySnapshots(data, [], 'altavalve').length, 0, 'condition-scoped caller inventory is respected')
  const version = data.versions[0]
  const node = rows[0].therapy
  const mapped = { ...data, versions: [...data.versions, { ...version, id: 'test-exact-version', graphEntityId: node.id }] }
  assert.ok(!therapySnapshots(mapped, nodes).some(row => row.therapy.id === node.id), 'exact-version records are not duplicated')
  for (const [conditionId, entityId] of [['cond-ms', 'dev-tendyne'], ['cond-tr', 'dev-pascal'], ['cond-hfpef', 'dig-story-health']]) {
    const scopedNodes = nodes.filter(node => node.entity.type === 'therapy' && node.entity.treats.includes(conditionId))
    assert.ok(!therapySnapshots(data, scopedNodes).some(row => row.therapy.id === entityId), `${entityId}: global catalog membership survives condition scoping`)
  }
})
