import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import yaml from 'js-yaml'
import { comparisonState, stateLabel } from '../src/components/scenes/selection'
import { constrainViewport, fitCanvas, INITIAL_VIEWPORT, safeSourceURL, zoomAt } from '../src/components/scenes/viewport'

const root = new URL('../public/scenes/', import.meta.url)
const index = JSON.parse(readFileSync(new URL('../src/components/scenes/scene-index.json', import.meta.url), 'utf8')) as Array<{ classId: string; conditionId: string; title: string; designs: number; views: number }>
const classes = readdirSync(root).filter(name => !name.startsWith('.'))

test('every Data device class has illustrations with the matching condition', () => {
  const taxonomy = yaml.load(readFileSync(new URL('../data/intelligence/taxonomy.yaml', import.meta.url), 'utf8')) as { comparisonCategories: Array<{ id: string; versionKind: string; conditionId: string }> }
  const devices = taxonomy.comparisonCategories.filter(row => row.versionKind === 'device')
  assert.deepEqual([...classes].sort(), devices.map(row => row.id).sort())
  assert.deepEqual(index.map(row => row.classId).sort(), [...classes].sort())
  for (const device of devices) assert.equal(index.find(row => row.classId === device.id)?.conditionId, device.conditionId, device.id)
})

for (const id of classes) {
  const manifest = JSON.parse(readFileSync(new URL(`${id}/manifest.json`, root), 'utf8'))
  test(`${id}: every design, view and state has a still and in-frame markers`, () => {
    assert.equal(manifest.classId, id)
    const entry = index.find(row => row.classId === id)!
    assert.equal(entry.designs, manifest.designs.length)
    assert.equal(entry.views, manifest.views.length)
    for (const design of manifest.designs) for (const view of manifest.views) for (const state of view.states) {
      const image = manifest.images[`${design.id}/${view.id}/${state}`]
      assert.ok(image, `${design.id}/${view.id}/${state}`)
      for (const path of [image.src, image.thumb]) {
        assert.match(path, new RegExp(`^/scenes/${id}/images/[\\w.-]+\\.webp$`))
        assert.ok(existsSync(new URL(`.${path.slice('/scenes'.length)}`, root)), path)
      }
      for (const pin of image.pins) {
        assert.ok(manifest.annotations[pin.id], pin.id)
        assert.ok(pin.x >= 0 && pin.x <= 1 && pin.y >= 0 && pin.y <= 1, `${pin.id} out of frame`)
      }
    }
  })
  test(`${id}: reader text is schematic, attributed and free of process wording`, () => {
    assert.match(manifest.stageLabel, /schematic/i)
    assert.match(manifest.stageLabel, /not to scale/i)
    assert.match(manifest.attribution, /CC BY 4\.0/)
    const text = JSON.stringify(manifest)
    assert.ok(!/claim-|sourceRefs|private|draft|review packet|owner|coordinator/i.test(text), 'process wording')
    for (const source of manifest.sources) assert.ok(safeSourceURL(source.url), source.url)
  })
}

test('only stills and manifests are published (no meshes or build files)', () => {
  for (const id of classes) {
    for (const name of readdirSync(new URL(`${id}/`, root))) assert.ok(name === 'manifest.json' || name === 'images', `${id}/${name}`)
    for (const name of readdirSync(new URL(`${id}/images/`, root))) assert.match(name, /\.webp$/, `${id}/images/${name}`)
  }
})

test('state comparison and labels', () => {
  assert.equal(comparisonState(['open', 'closed'], 'open'), 'closed')
  assert.equal(comparisonState(['open'], 'open'), null)
  const states = [{ id: 'closed', label: '4. Arms closed', note: 'Leaflets captured. Authored pose.' }, { id: 'open', label: '5. Arms closed', note: 'Leaflets open around the clip. Authored pose.' }]
  assert.equal(stateLabel(states[0], states), '4. Arms closed — Leaflets captured')
})

test('zoom anchors the pointer and pan stays within the image', () => {
  const stage = { width: 800, height: 600 }
  const canvas = fitCanvas(stage)
  const before = { zoom: 2, x: 40, y: -20 }
  const pointer = { x: 100, y: 60 }
  const after = zoomAt(before, 3, pointer, canvas, stage)
  assert.equal((pointer.x - before.x) / before.zoom, (pointer.x - after.x) / after.zoom)
  const wide = { width: 1000, height: 600 }
  assert.deepEqual(constrainViewport({ zoom: 2, x: 800, y: -1000 }, fitCanvas(wide), wide), { zoom: 2, x: 300, y: -300 })
  assert.deepEqual(constrainViewport({ zoom: .2, x: 800, y: -1000 }, fitCanvas(wide), wide), INITIAL_VIEWPORT)
})

test('source links allow HTTPS and safe local paths only', () => {
  assert.equal(safeSourceURL('https://example.org/source#figure'), 'https://example.org/source#figure')
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', '//evil.test', '/a/../secret', 'http://example.org']) assert.equal(safeSourceURL(url), undefined)
})
