import test from 'node:test';
import assert from 'node:assert/strict';
import { hiddenMask, imageSources, keyItems, locatorCaption, maskGhost, paneLabelIds, partIndexAt, referencePlacement, veilMask } from '../src/components/scenes/plateFocus';
import type { PartMap } from '../src/components/scenes/plateFocus';

/** 4x1 map: background, part 1, part 2 (G byte = 1 -> 257), part 3. */
const map = (): PartMap => {
  const data = new Uint8ClampedArray(16);
  const set = (x: number, r: number, g: number, a: number) => { data.set([r, g, 0, a], x * 4); };
  set(0, 0, 0, 0); set(1, 1, 0, 255); set(2, 1, 1, 255); set(3, 3, 0, 255);
  return { width: 4, height: 1, data };
};
test('part index decodes R + 256*G and treats alpha 0 as empty', () => {
  const m = map();
  assert.deepEqual([0, 1, 2, 3].map(x => partIndexAt(m, x, 0)), [0, 1, 257, 3]);
});
test('veil covers non-empty pixels outside the focus parts and never the background', () => {
  assert.deepEqual([...veilMask(map(), [1, 257])], [0, 0, 0, 153]);
  assert.deepEqual([...veilMask(map(), [3], .5)], [0, 128, 128, 0]);
  assert.deepEqual([...veilMask(map(), [])], [0, 153, 153, 153]);
});
test('ghost shows only where another part hides the target', () => {
  const hidden = hiddenMask(map(), 1);
  assert.deepEqual([...hidden], [0, 0, 1, 1]);
  const ghost = new Uint8ClampedArray([9, 9, 9, 255, 9, 9, 9, 255, 9, 9, 9, 200, 9, 9, 9, 0]);
  maskGhost(ghost, hidden, .5);
  assert.deepEqual([ghost[3], ghost[7], ghost[11], ghost[15]], [0, 0, 100, 0]);
});
test('reference line follows the image transform', () => {
  const canvas = { width: 800, height: 600 }, stage = { width: 1000, height: 600 };
  assert.deepEqual(referencePlacement(.5, canvas, stage, { zoom: 1, x: 0, y: 0 }), { y: 300, x1: 0, x2: 1000 });
  assert.equal(referencePlacement(.25, canvas, stage, { zoom: 2, x: 0, y: 30 }).y, 300 + 30 - 300);
  const spanned = referencePlacement(.5, canvas, stage, { zoom: 1, x: 0, y: 0 }, { x: .25, width: .5 });
  assert.ok(spanned.x1 > 0 && spanned.x2 < stage.width && spanned.x1 < spanned.x2);
});
test('pane labels: selected first, shared next, only if pinned and not hidden', () => {
  const pins = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 0, y: 0 }, { id: 'c', x: 0, y: 0 }];
  assert.deepEqual(paneLabelIds(pins, 'c', ['a', 'zz', 'c', 'b'], ['b']), ['c', 'a']);
  assert.deepEqual(paneLabelIds(pins, 'zz', ['a']), ['a']);
  assert.deepEqual(paneLabelIds(pins, null), []);
});
test('locator caption names representative sections only', () => {
  assert.equal(locatorCaption({ directionCaption: 'Viewed from above', representation: 'representative-section', regionLabel: 'x' }), 'Representative section · Viewed from above');
  assert.equal(locatorCaption({ directionCaption: 'Viewed from above', representation: 'representative-view', regionLabel: 'x' }), 'Viewed from above');
  assert.equal(locatorCaption(undefined), '');
});
test('figure keys are deduplicated; mid is used only at low zoom', () => {
  assert.deepEqual(keyItems({ keys: ['cut', 'contact', 'cut'] }), ['cut', 'contact']);
  assert.deepEqual(keyItems({}), []);
  const image = { src: '/scenes/x/images/a.webp', mid: '/scenes/x/images/a_mid.webp' };
  assert.deepEqual(imageSources({ src: image.src }, 900, 1), { src: image.src });
  assert.deepEqual(imageSources(image, 400, 1), { src: image.src, srcSet: `${image.mid} 1200w, ${image.src} 2400w`, sizes: '400px' });
  assert.deepEqual(imageSources(image, 900, 1.6), { src: image.src });
});
