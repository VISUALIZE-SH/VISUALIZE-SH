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
// Text copy has its own whole-file checksum. The drawing checksum retains every
// SVG tag and attribute, including text layout, while excluding label contents.
const drawingContent = (svg: string) => svg.replace(/<(title|desc|text)\b[^>]*>[\s\S]*?<\/\1>/g,
  element => element.replace(/>[^<]*</g, '><'))

test('drawing fingerprints exclude label copy while retaining geometry, layout, and styling', () => {
  const svg = '<svg viewBox="0 0 10 10"><desc>Example description</desc><path d="M 0,0 L 1,1" stroke="black"><title>Line</title></path><text x="2">Caption <tspan dx="1">detail</tspan></text></svg>'
  assert.equal(hash(drawingContent(svg)), hash(drawingContent(svg.replace('Example description', 'Updated description').replace('Caption ', 'Revised '))))
  for (const changed of [svg.replace('L 1,1', 'L 2,2'), svg.replace('black', 'red'), svg.replace('0 0 10 10', '0 0 20 20'), svg.replace('x="2"', 'x="3"'), svg.replace('dx="1"', 'dx="2"')]) {
    assert.notEqual(hash(drawingContent(svg)), hash(drawingContent(changed)))
  }
})

test('all graph-level illustrations retain their drawing integrity and exact identities', () => {
  assert.equal(registry.illustrations.length, 34)
  assert.equal(new Set(registry.illustrations.map(item => item.entityId)).size, 34)
  // Illustration identity checks must survive later authored profile additions.
  const rows = therapySnapshots({ ...data, versions: [] }, nodes)
  for (const item of registry.illustrations) {
    assert.ok(rows.some(row => row.therapy.id === item.entityId), item.entityId)
    assert.equal(deviceIllustrationFor(item.entityId), undefined, 'graph concepts cannot become version artwork')
    const { entityId, assetPath, alt, configuration, limitations, sources, views, profileViews } = item
    assert.deepEqual(therapyIllustrationFor(entityId), {
      entityId, assetPath, alt, configuration, limitations, sources,
      ...(views && { views: Object.fromEntries(views.map(view => [view.view, view.assetPath])) }),
      ...(profileViews && { profileViews: Object.fromEntries(profileViews.map(view => [view.view, view.assetPath])) }),
    })
    const svg = readFileSync(new URL(`../public/${assetPath}`, import.meta.url), 'utf8')
    assert.equal(hash(svg), item.sha256)
    assert.equal(hash(drawingContent(svg)), item.geometrySha256, `${entityId}: SVG drawing integrity`)
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
    // Exercise the graph-only fallback independently of the live profile inventory.
    assert.match(render({ data: { ...data, versions: [] }, catalogData: { ...data, versions: [] }, initialQuery: 'Approxima' }), /Illustration unavailable for Approxima/)
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
  assert.ok(therapySnapshots({ ...data, versions: [] }, nodes).some(row => row.therapy.id === 'dev-approxima-tricuspid-reshaping' && !row.illustration))
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

test('Profiles displays exact sketches and keeps illustrated therapy snapshots separate', async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), 'visualize-sh-profile-schematics-vite-'))
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  let server: Awaited<ReturnType<typeof createServer>> | undefined
  try {
    server = await createServer({ cacheDir, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
    const { default: AtlasEvidence } = await server.ssrLoadModule('/src/components/intelligence/AtlasEvidence.tsx')
    const renderVersion = (versionId: string) => renderToStaticMarkup(createElement(AtlasEvidence, {
      data, versionId, onSelectVersion() {}, onOpenData() {},
    }))
    const ultra = renderVersion('ver-sapien-3-ultra-progress-study')
    assert.match(ultra, />Design<.*>Schematic<.*>Fit</)
    assert.match(ultra, /ver-sapien-3-ultra-progress-study-orthographic\.svg/)
    assert.match(ultra, />Side<.*>Top</)
    const older = renderVersion('ver-accucinch')
    assert.match(older, />Side<.*>Reference</)
    assert.match(older, /Sources and depiction limits.*Instructions for Use/)
    assert.doesNotMatch(renderVersion('ver-corwave-lvas'), /intel-profile-schematic|dev-corwave-lvas-orthographic/)
    const { default: ProfileCatalog } = await server.ssrLoadModule('/src/components/intelligence/ProfileCatalog.tsx')
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { hash: '#profile-dev-corwave-lvas' } } })
    const profile = renderToStaticMarkup(createElement(ProfileCatalog, {
      data, therapyNodes: nodes, nodesById: new Map(nodes.map(node => [node.id, node])), onOpenVersion() {}, onOpenNode() {},
    }))
    const card = (id: string) => {
      const block = profile.split(`id="profile-${id}"`)[1]?.split('</article>')[0]
      assert.ok(block, id)
      return block
    }
    const artworkFamilies = new Set(data.versions.filter(version => deviceIllustrationFor(version.id)).map(version => version.familyId))
    assert.equal((profile.match(/class="profile-card-schematic"/g) ?? []).length, artworkFamilies.size + 34)
    for (const [family, image] of [['family-accucinch', 'ver-accucinch'], ['family-acurate', 'ver-acurate-neo2'], ['family-adaptr', 'ver-adaptr']]) {
      assert.ok(card(family).includes(`${image}-orthographic.svg`))
      assert.ok(card(family).indexOf('profile-card-schematic') < card(family).indexOf('profile-card-description'))
    }
    assert.doesNotMatch(card('family-acoramidis'), /class="profile-card-schematic"/)
    assert.match(card('family-xeltis-xplore2'), /value="ver-xplore2-current".*value="ver-xpv-initial-2021" selected="".*ver-xpv-initial-2021-orthographic\.svg/)
    assert.match(card('dev-corwave-lvas'), /class="profile-card-schematic".*?dev-corwave-lvas-orthographic\.svg/)
    assert.doesNotMatch(profile, /<\/dl>0/)
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else Reflect.deleteProperty(globalThis, 'window')
    await server?.close()
    rmSync(cacheDir, { recursive: true, force: true })
  }
})
