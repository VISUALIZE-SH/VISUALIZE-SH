import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import registry from '../data/illustrations/device-schematics.json'
import therapyRegistry from '../data/illustrations/therapy-schematics.json'
import { deviceIllustrationFor } from '../src/data/device-illustrations'

test('approved illustrations and explicit gaps cover the exact device-version inventory', () => {
  const data = JSON.parse(readFileSync(new URL('../public/intelligence.json', import.meta.url), 'utf8'))
  const devices = data.versions.filter((version: { kind: string }) => version.kind === 'device').map((version: { id: string }) => version.id)
  const illustrated = registry.illustrations.map(item => item.versionId)
  const all = [...illustrated, ...registry.heldVersionIds]
  assert.equal(illustrated.length, 103)
  assert.equal(registry.heldVersionIds.length, 57)
  assert.equal(new Set(all).size, all.length, 'held and illustrated identities must be disjoint and unique')
  assert.deepEqual([...all].sort(), [...devices].sort())
  for (const id of registry.heldVersionIds) assert.equal(deviceIllustrationFor(id), undefined, `${id} must use a placeholder, even if legacy media exists`)
  assert.equal(deviceIllustrationFor('ver-amulet-future'), undefined, 'never borrow a related generation')
})

test('thumbnail SVGs match the published digests and visible illustration labels', () => {
  for (const item of registry.illustrations) {
    const { versionId, assetPath, alt, views, profileViews, configuration, limitations, sources } = item
    const expected = {
      assetPath, alt,
      ...(profileViews && { profileViews: Object.fromEntries(profileViews.map(view => [view.view, view.assetPath])) }),
      ...(views && { views: Object.fromEntries(views.map(view => [view.view, view.assetPath])) }),
      notes: {
        ...(configuration && { configuration }),
        limitations: configuration ? limitations : ['Illustrative and not to scale. Proportions and small features are representative.'],
        sources: sources.map(({ title, url, locator }) => ({ title, url, locator })),
      },
    }
    assert.deepEqual(deviceIllustrationFor(versionId), expected, 'the UI index must match the approved register')
    const bytes = readFileSync(new URL(`../public/${item.assetPath}`, import.meta.url))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.versionId)
    const svg = bytes.toString('utf8')
    assert.match(svg, /NOT TO SCALE/, item.versionId)
    assert.match(svg, item.scope === 'concept' ? /CONCEPT FOR ILLUSTRATION/ : /SCHEMATIC FOR ILLUSTRATION/, item.versionId)
    assert.doesNotMatch(svg, /<(?:script|foreignObject|image)\b/i, 'only original standalone vector artwork belongs in thumbnails')
    assert.ok(item.sources.length > 0 && item.limitations.length > 0, item.versionId)
  }
})

test('the 24 sketch sets retain all 72 original drawing geometries and contain only public-facing labels', () => {
  const devices = registry.illustrations.filter(item => item.views)
  const therapies = therapyRegistry.illustrations.filter(item => item.views)
  assert.equal(devices.length, 8)
  assert.equal(therapies.length, 16)
  const paths = new Set<string>()
  const labels = { oblique: 'OBLIQUE', front: 'FRONT / PROFILE', top: 'TOP / +Z REFERENCE' }
  for (const item of [...devices, ...therapies]) {
    const views = item.views!
    assert.deepEqual(views.map(view => view.view), Object.keys(labels))
    assert.equal(views[0].assetPath, item.assetPath)
    assert.equal(views[0].sha256, item.sha256)
    assert.ok(item.configuration)
    assert.ok(item.sources.every(source => source.title && source.locator && source.url.startsWith('https://')))
    for (const view of views) {
      const label = labels[view.view as keyof typeof labels]
      const svg = readFileSync(new URL(`../public/${view.assetPath}`, import.meta.url), 'utf8')
      assert.ok(svg.includes(` · ${label}</title>`), view.assetPath)
      assert.match(svg, /CONCEPT FOR ILLUSTRATION \/ NOT TO SCALE/, view.assetPath)
      assert.doesNotMatch(svg, /<(?:script|foreignObject|image)\b|approval pending|local artwork review/i, view.assetPath)
      const drawing = svg.replace(/<(title|desc|text)\b[^>]*>[\s\S]*?<\/\1>/g,
        element => element.replace(/>[^<]*</g, '><'))
      assert.equal(createHash('sha256').update(drawing).digest('hex'), view.geometrySha256, view.assetPath)
      assert.equal(createHash('sha256').update(svg).digest('hex'), view.sha256, view.assetPath)
      paths.add(view.assetPath)
    }
  }
  assert.equal(paths.size, 72)
})

test('profile artwork has three distinct assets for all 137 registered identities', () => {
  const records = [...registry.illustrations, ...therapyRegistry.illustrations]
  assert.equal(records.length, 137)
  const allPaths = new Set<string>()
  const alternatePaths = new Set<string>()
  for (const item of records) {
    const views = item.views ?? [{ assetPath: item.assetPath }, ...(item.profileViews ?? [])]
    assert.equal(views.length, 3, item.assetPath)
    for (const view of views) {
      assert.ok(!allPaths.has(view.assetPath), view.assetPath)
      allPaths.add(view.assetPath)
    }
    for (const view of item.profileViews ?? []) {
      const svg = readFileSync(new URL(`../public/${view.assetPath}`, import.meta.url), 'utf8')
      const title = /<title\b[^>]*>([^<]*)<\/title>/.exec(svg)?.[1].toLowerCase()
      assert.ok(title?.includes(view.view), view.assetPath)
      assert.match(svg, /NOT TO SCALE/)
      assert.doesNotMatch(svg, /<(?:script|foreignObject|image)\b|signoff pending|approval pending|SOURCES\.md/i)
      const drawing = svg.replace(/<(title|desc|text)\b[^>]*>[\s\S]*?<\/\1>/g,
        element => element.replace(/>[^<]*</g, '><'))
      assert.equal(createHash('sha256').update(svg).digest('hex'), view.sha256, view.assetPath)
      assert.equal(createHash('sha256').update(drawing).digest('hex'), view.geometrySha256, view.assetPath)
      alternatePaths.add(view.assetPath)
    }
  }
  assert.equal(allPaths.size, 411)
  assert.equal(alternatePaths.size, 226)
})
