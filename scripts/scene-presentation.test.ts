import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { assetPath, withAssetBase } from '../src/components/scenes/assets'
import type { VisualizationManifest } from '../src/components/scenes/types'

const root = new URL('../public/scenes/', import.meta.url)
const classes = readdirSync(root).filter(name => !name.startsWith('.'))
const load = (id: string) => JSON.parse(readFileSync(new URL(`${id}/manifest.json`, root), 'utf8')) as VisualizationManifest

test('scene asset paths resolve against a sub-path base', () => {
  assert.equal(assetPath('/', '/scenes/a/images/x.webp'), '/scenes/a/images/x.webp')
  assert.equal(assetPath('/VISUALIZE-SH/', '/scenes/a/images/x.webp'), '/VISUALIZE-SH/scenes/a/images/x.webp')
  assert.equal(assetPath('/VISUALIZE-SH', 'scenes/a/images/x.webp'), '/VISUALIZE-SH/scenes/a/images/x.webp')
  assert.equal(assetPath('/VISUALIZE-SH/', undefined), '')
  const manifest = load('mitral-teer')
  const based = withAssetBase(manifest, '/VISUALIZE-SH/')
  const paths = (m: VisualizationManifest) => Object.values(m.images).flatMap(image => [image.src, image.thumb, image.mid, image.partMap, image.locator?.src, ...Object.values(image.focus ?? {}).map(entry => entry.ghost?.src)].filter((path): path is string => !!path))
  const before = paths(manifest), after = paths(based)
  // The sample covers every rewritten field: part maps, hidden-part outlines and locators.
  assert.ok(before.some(path => path.endsWith('.parts.png')), 'part map')
  assert.ok(Object.values(manifest.images).some(image => Object.values(image.focus ?? {}).some(entry => entry.ghost)), 'outline')
  assert.ok(Object.values(manifest.images).some(image => image.locator), 'locator')
  assert.equal(after.length, before.length)
  for (const [i, path] of after.entries()) assert.equal(path, `/VISUALIZE-SH${before[i]}`)
  assert.equal(paths(withAssetBase(manifest, '/')).join(), before.join())
})

for (const id of classes) {
  test(`${id}: presentation settings name existing designs, views, states and labels`, () => {
    const manifest = load(id)
    const p = manifest.presentation
    if (!p) return
    const annotationIds = new Set(Object.keys(manifest.annotations))
    const stateIds = new Set(manifest.states.map(state => state.id))
    const designIds = new Set(manifest.designs.map(design => design.id))
    for (const label of [...(p.hiddenLabels ?? []), ...Object.keys(p.labels ?? {})]) assert.ok(annotationIds.has(label), `label ${label}`)
    for (const state of [...Object.keys(p.stateLabels ?? {}), ...(p.stateGroups ?? []).flatMap(group => group.states)]) assert.ok(stateIds.has(state), `state ${state}`)
    for (const pair of p.designComparison?.pairs ?? []) {
      for (const design of pair.designs) assert.ok(designIds.has(design), `pair design ${design}`)
      for (const label of pair.sharedLabels ?? []) assert.ok(annotationIds.has(label), `shared label ${label}`)
      for (const viewId of pair.views) {
        const view = manifest.views.find(item => item.id === viewId)
        assert.ok(view, `pair view ${viewId}`)
        for (const state of pair.states) {
          assert.ok(view.states.includes(state), `pair state ${viewId}/${state}`)
          for (const design of pair.designs) assert.ok(manifest.images[`${design}/${viewId}/${state}`], `pair image ${design}/${viewId}/${state}`)
        }
      }
    }
    // The viewer opens on the first design, view and state.
    assert.ok(manifest.images[`${manifest.designs[0].id}/${manifest.views[0].id}/${manifest.views[0].states[0]}`], 'opening image')
  })
}
