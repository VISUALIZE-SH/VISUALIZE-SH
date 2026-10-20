import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import registry from '../data/illustrations/device-schematics.json'
import { deviceIllustrationFor } from '../src/data/device-illustrations'

test('approved illustrations and explicit gaps cover the exact device-version inventory', () => {
  const data = JSON.parse(readFileSync(new URL('../public/intelligence.json', import.meta.url), 'utf8'))
  const devices = data.versions.filter((version: { kind: string }) => version.kind === 'device').map((version: { id: string }) => version.id)
  const illustrated = registry.illustrations.map(item => item.versionId)
  const all = [...illustrated, ...registry.heldVersionIds]
  assert.equal(illustrated.length, 95)
  assert.equal(new Set(all).size, all.length, 'held and illustrated identities must be disjoint and unique')
  assert.deepEqual([...all].sort(), [...devices].sort())
  for (const id of registry.heldVersionIds) assert.equal(deviceIllustrationFor(id), undefined, `${id} must use a placeholder, even if legacy media exists`)
  assert.equal(deviceIllustrationFor('ver-amulet-future'), undefined, 'never borrow a related generation')
})

test('thumbnail SVGs retain the owner-approved original bytes and visible illustration labels', () => {
  for (const item of registry.illustrations) {
    assert.deepEqual(deviceIllustrationFor(item.versionId), { assetPath: item.assetPath, alt: item.alt }, 'the UI index must match the approved register')
    const bytes = readFileSync(new URL(`../public/${item.assetPath}`, import.meta.url))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.versionId)
    const svg = bytes.toString('utf8')
    assert.match(svg, /NOT TO SCALE/, item.versionId)
    assert.match(svg, item.scope === 'concept' ? /CONCEPT FOR ILLUSTRATION/ : /SCHEMATIC FOR ILLUSTRATION/, item.versionId)
    assert.doesNotMatch(svg, /<(?:script|foreignObject|image)\b/i, 'only original standalone vector artwork belongs in thumbnails')
    assert.ok(item.sources.length > 0 && item.limitations.length > 0, item.versionId)
  }
})
