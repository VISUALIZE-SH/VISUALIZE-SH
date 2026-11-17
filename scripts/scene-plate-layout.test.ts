import test from 'node:test';
import assert from 'node:assert/strict';
import { externalCallouts, plateCallouts, screenAnchor, screenContentBox } from '../src/components/scenes/externalAnnotations';
import { fitCanvas } from '../src/components/scenes/viewport';
const viewport = { zoom: 1, x: 0, y: 0 };
test('screen anchor follows exact center-origin canvas zoom and pan across resize', () => {
  const pin = { id: 'a', x: .75, y: .25 };
  assert.deepEqual(screenAnchor(pin, { width: 800, height: 600 }, { width: 1000, height: 600 }, { zoom: 2, x: -25, y: 30 }), { x: 875, y: 30 });
  const stage = { width: 360, height: 480 };
  assert.deepEqual(screenAnchor(pin, fitCanvas(stage), stage, viewport), { x: 270, y: 172.5 });
});
test('labels fit stage, clear the central anchor group and retain selected first when crowded', () => {
  const stage = { width: 900, height: 140 };
  const pins = Array.from({ length: 12 }, (_, i) => ({ id: `${i}`, x: .3, y: .4 }));
  const labels = externalCallouts(pins, '11', null, fitCanvas(stage), stage, viewport);
  assert.equal(labels[0].id, '11');
  assert.equal(labels.length, 2);
  labels.forEach(label => {
    assert.ok(label.x >= 0 && label.y >= 0);
    assert.ok(label.x + label.width <= stage.width && label.y + label.height <= stage.height);
    assert.ok(label.x + label.width <= screenAnchor(pins[0], fitCanvas(stage), stage, viewport).x - 28);
  });
  assert.ok(labels[1].y + labels[1].height <= labels[0].y || labels[0].y + labels[0].height <= labels[1].y);
});
test('clipped anchors are omitted rather than moved; labels stay screen sized on zoom', () => {
  const stage = { width: 900, height: 600 }, canvas = fitCanvas(stage);
  const pins = [{ id: 'edge', x: 0, y: 0 }, { id: 'center', x: .5, y: .5 }];
  const normal = externalCallouts(pins, 'center', null, canvas, stage, viewport);
  const zoomed = externalCallouts(pins, 'center', null, canvas, stage, { zoom: 3, x: 0, y: 0 });
  assert.deepEqual(zoomed.map(item => item.id), ['center']);
  assert.equal(normal[0].width, zoomed[0].width);
  assert.equal(normal[0].height, zoomed[0].height);
});
test('narrow stage shows only selected callout, or explicit initial fallback', () => {
  const stage = { width: 360, height: 400 }, canvas = fitCanvas(stage);
  const pins = [{ id: 'a', x: .4, y: .4 }, { id: 'b', x: .6, y: .6 }];
  assert.deepEqual(externalCallouts(pins, 'b', 'a', canvas, stage, viewport).map(item => item.id), ['b']);
  assert.deepEqual(externalCallouts(pins, null, 'a', canvas, stage, viewport).map(item => item.id), ['a']);
  assert.deepEqual(externalCallouts(pins, 'unavailable', null, canvas, stage, viewport), []);
  assert.deepEqual(externalCallouts(pins, null, 'a', canvas, { width: 30, height: 30 }, viewport), []);
});

test('clustered anchors keep same-side rows monotonic with selected inclusion first', () => {
  const stage = { width: 900, height: 400 }, canvas = fitCanvas(stage);
  const pins = [{ id: 'selected', x: .3, y: .50 }, { id: 'next', x: .3, y: .51 }, { id: 'third', x: .3, y: .52 }, { id: 'above', x: .3, y: .49 }];
  const labels = externalCallouts(pins, 'selected', null, canvas, stage, viewport);
  assert.equal(labels[0].id, 'selected');
  assert.ok(labels.length >= 3);
  const ordered = [...labels].sort((a, b) => a.anchor.y - b.anchor.y);
  ordered.slice(1).forEach((label, i) => assert.ok(label.y > ordered[i].y));
});
test('labels avoid their own and every other visible anchor with a six-pixel margin', () => {
  const stage = { width: 900, height: 400 }, canvas = fitCanvas(stage);
  const pins = [{ id: 'selected', x: .03, y: .5 }, { id: 'edge', x: .04, y: .64 }, { id: 'center', x: .4, y: .4 }];
  const view = { zoom: 2, x: 190, y: 0 };
  const labels = externalCallouts(pins, 'selected', null, canvas, stage, view);
  assert.ok(labels.some(label => label.id === 'selected'));
  for (const label of labels) for (const pin of pins) {
    const anchor = screenAnchor(pin, canvas, stage, view);
    assert.ok(anchor.x < label.x - 6 || anchor.x > label.x + label.width + 6 || anchor.y < label.y - 6 || anchor.y > label.y + label.height + 6);
  }
});
test('a fully occupied rail omits callouts without relocating anchors', () => {
  const stage = { width: 900, height: 110 }, canvas = fitCanvas(stage);
  const pins = Array.from({ length: 12 }, (_, i) => ({ id: `${i}`, x: .05, y: i / 11 }));
  const view = { zoom: 5, x: -110, y: 0 };
  const labels = externalCallouts(pins, '5', null, canvas, stage, view);
  for (const label of labels) assert.deepEqual(label.anchor, screenAnchor(pins.find(pin => pin.id === label.id)!, canvas, stage, view));
  assert.equal(labels.length, 0);
});


test('different anchor depths cannot introduce crossing same-side leader segments', () => {
  const stage = { width: 900, height: 400 }, canvas = fitCanvas(stage);
  const pins = [{ id: 'a', x: .3, y: .5 }, { id: 'b', x: .48, y: .51 }, { id: 'c', x: .4, y: .52 }, { id: 'd', x: .27, y: .3 }, { id: 'e', x: .49, y: .7 }];
  const labels = externalCallouts(pins, 'a', null, canvas, stage, viewport);
  assert.ok(labels.length >= 3);
  const cross = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
    const a = labels[i], b = labels[j];
    const startA = { x: a.x + a.width, y: a.y + a.height / 2 };
    const startB = { x: b.x + b.width, y: b.y + b.height / 2 };
    assert.ok(cross(startA, a.anchor, startB) * cross(startA, a.anchor, b.anchor) >= 0 || cross(startB, b.anchor, startA) * cross(startB, b.anchor, a.anchor) >= 0);
  }
});


test('wide-stage rails shorten leaders while staying outside the central anchor group', () => {
  const stage = { width: 1800, height: 400 }, canvas = fitCanvas(stage);
  const pins = [{ id: 'left', x: .4, y: .5 }, { id: 'right', x: .6, y: .5 }];
  const labels = externalCallouts(pins, 'left', null, canvas, stage, viewport);
  assert.equal(labels.length, 2);
  const minX = Math.min(...pins.map(pin => screenAnchor(pin, canvas, stage, viewport).x));
  const maxX = Math.max(...pins.map(pin => screenAnchor(pin, canvas, stage, viewport).x));
  for (const label of labels) {
    const endX = label.side === 'left' ? label.x + label.width : label.x;
    const endY = label.y + label.height / 2;
    const length = Math.hypot(endX - label.anchor.x, endY - label.anchor.y);
    const edgeEndX = label.side === 'left' ? 8 + label.width : stage.width - 8 - label.width;
    const previousLength = Math.hypot(edgeEndX - label.anchor.x, endY - label.anchor.y);
    assert.ok(length < 60);
    assert.ok(length < previousLength / 5);
    if (label.side === 'left') assert.ok(label.x + label.width <= minX - 28);
    else assert.ok(label.x >= maxX + 28);
  }
});
test('adaptive rails stay in the viewport and preserve original anchors after pan and zoom', () => {
  const stage = { width: 1400, height: 500 }, canvas = fitCanvas(stage);
  const pins = [{ id: 'left', x: .2, y: .5 }, { id: 'center', x: .5, y: .5 }, { id: 'right', x: .8, y: .5 }];
  for (const view of [{ zoom: 1, x: 0, y: 0 }, { zoom: 3, x: 280, y: 70 }, { zoom: 3, x: -280, y: -70 }]) {
    const labels = externalCallouts(pins, 'center', null, canvas, stage, view);
    assert.ok(labels.length > 0);
    for (const label of labels) {
      assert.ok(label.x >= 8 && label.x + label.width <= stage.width - 8);
      assert.ok(label.y >= 8 && label.y + label.height <= stage.height - 8);
      assert.deepEqual(label.anchor, screenAnchor(pins.find(pin => pin.id === label.id)!, canvas, stage, view));
      if (label.side === 'left') assert.ok(label.x + label.width <= stage.width / 2 - 28);
      else assert.ok(label.x >= stage.width / 2 + 28);
      for (const pin of pins) {
        const anchor = screenAnchor(pin, canvas, stage, view);
        if (anchor.x < 0 || anchor.x > stage.width || anchor.y < 0 || anchor.y > stage.height) continue;
        assert.ok(anchor.x < label.x - 6 || anchor.x > label.x + label.width + 6 || anchor.y < label.y - 6 || anchor.y > label.y + label.height + 6);
      }
    }
  }
});

const plateStage = { width: 1200, height: 600 };
const plateBox = { x: .3, y: .1, width: .55, height: .8 };
const plateOverlap = (a: { y: number; height: number }, b: { y: number; height: number }) => a.y < b.y + b.height && b.y < a.y + a.height;
test('plate rails sit outside the transformed content box without overlap or crossings', () => {
  const canvas = fitCanvas(plateStage);
  const pins = Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, x: .35 + (i % 4) * .12, y: .15 + i * .08 }));
  for (const view of [viewport, { zoom: 1.5, x: 40, y: -20 }]) {
    const box = screenContentBox(plateBox, canvas, plateStage, view);
    const labels = plateCallouts(pins, 'p3', canvas, plateStage, view, { contentBox: plateBox });
    assert.ok(labels.length >= 4);
    for (const label of labels) {
      assert.equal(label.height, 24);
      assert.deepEqual(label.anchor, screenAnchor(pins.find(pin => pin.id === label.id)!, canvas, plateStage, view));
      if (label.side === 'left') assert.ok(label.x + label.width <= box.left - 16 + .001); else assert.ok(label.x >= box.right + 16 - .001);
      assert.ok(label.x >= 0 && label.x + label.width <= plateStage.width && label.y >= 0 && label.y + label.height <= plateStage.height);
    }
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
      if (labels[i].side !== labels[j].side) continue;
      assert.ok(!plateOverlap(labels[i], labels[j]));
      const end = (l: typeof labels[0]) => ({ x: l.side === 'left' ? l.x + l.width : l.x, y: l.y + l.height / 2 });
      const cr = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      const [a, b] = [labels[i], labels[j]], sa = end(a), sb = end(b);
      assert.ok(!(cr(sa, a.anchor, sb) * cr(sa, a.anchor, b.anchor) < 0 && cr(sb, b.anchor, sa) * cr(sb, b.anchor, a.anchor) < 0));
    }
  }
});
test('plate callouts exclude hidden ids, keep the selected label, and fall back without a content box', () => {
  const canvas = fitCanvas(plateStage);
  const pins = [{ id: 'a', x: .4, y: .4 }, { id: 'hide', x: .5, y: .5 }, { id: 'c', x: .7, y: .6 }];
  const labels = plateCallouts(pins, 'c', canvas, plateStage, viewport, { hidden: ['hide'], contentBox: plateBox });
  assert.deepEqual(labels.map(l => l.id).sort(), ['a', 'c']);
  const fallback = plateCallouts(pins, 'c', canvas, plateStage, viewport, { hidden: ['hide'] });
  assert.deepEqual(fallback.map(l => l.id).sort(), ['a', 'c']);
  const tight = plateCallouts(pins, 'c', canvas, plateStage, viewport, { contentBox: { x: 0, y: 0, width: 1, height: 1 } });
  assert.ok(tight.length > 0);
});
test('plate rows overflowing a short stage drop the lowest priority labels, never overlap', () => {
  const stage = { width: 1200, height: 130 }, canvas = fitCanvas(stage);
  const pins = Array.from({ length: 8 }, (_, i) => ({ id: `${i}`, x: .3, y: .3 + i * .02 }));
  const labels = plateCallouts(pins, '6', canvas, stage, viewport);
  assert.ok(labels.some(l => l.id === '6'));
  assert.ok(labels.length < 8);
  const sorted = [...labels].sort((a, b) => a.y - b.y);
  sorted.slice(1).forEach((l, i) => assert.ok(l.y >= sorted[i].y + sorted[i].height));
});
test('plate narrow stage shows only the selected label', () => {
  const stage = { width: 360, height: 400 }, canvas = fitCanvas(stage);
  const pins = [{ id: 'a', x: .4, y: .4 }, { id: 'b', x: .6, y: .6 }];
  assert.deepEqual(plateCallouts(pins, 'b', canvas, stage, viewport, { contentBox: plateBox }).map(l => l.id), ['b']);
  assert.deepEqual(plateCallouts(pins, null, canvas, stage, viewport), []);
});
test('plate callouts scale row height and width for large text without overlap, crossings or box intrusion', () => {
  const canvas = fitCanvas(plateStage);
  const pins = Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, x: .35 + (i % 4) * .12, y: .15 + i * .08 }));
  const base = plateCallouts(pins, 'p3', canvas, plateStage, viewport, { contentBox: plateBox });
  const labels = plateCallouts(pins, 'p3', canvas, plateStage, viewport, { contentBox: plateBox, rowHeight: 36, widthScale: 1.5 });
  const box = screenContentBox(plateBox, canvas, plateStage, viewport);
  assert.ok(labels.length >= 3 && labels.length <= base.length);
  assert.ok(Math.max(...labels.map(l => l.width)) > Math.max(...base.map(l => l.width)));
  for (const label of labels) {
    assert.equal(label.height, 36);
    if (label.side === 'left') assert.ok(label.x + label.width <= box.left - 16 + .001); else assert.ok(label.x >= box.right + 16 - .001);
    assert.ok(label.x >= 0 && label.x + label.width <= plateStage.width && label.y >= 0 && label.y + label.height <= plateStage.height);
  }
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) if (labels[i].side === labels[j].side) assert.ok(!plateOverlap(labels[i], labels[j]));
  // No anchor sits under a label.
  for (const label of labels) for (const pin of pins) {
    const a = screenAnchor(pin, canvas, plateStage, viewport);
    assert.ok(a.x < label.x - 6 || a.x > label.x + label.width + 6 || a.y < label.y - 6 || a.y > label.y + label.height + 6);
  }
});
test('plate large-text fallback rails widen but stay inside the stage', () => {
  const canvas = fitCanvas(plateStage);
  const pins = [{ id: 'a', x: .4, y: .4 }, { id: 'c', x: .7, y: .6 }];
  const labels = plateCallouts(pins, 'c', canvas, plateStage, viewport, { rowHeight: 36, widthScale: 1.5 });
  assert.ok(labels.length > 0);
  for (const l of labels) assert.ok(l.x >= 0 && l.x + l.width <= plateStage.width && l.width <= 148 * 1.5 + .001);
});
test('plate labels wrap before truncating, keep clear of avoided boxes, and honor a forced side', () => {
  const stage = { width: 460, height: 400 }, canvas = fitCanvas(stage);
  const pins = [{ id: 'a', x: .5, y: .3 }, { id: 'b', x: .5, y: .9 }];
  const contentBox = { x: .35, y: .1, width: .3, height: .85 };
  const texts = { a: 'Short', b: 'A rather long label that cannot fit a narrow rail' };
  const avoid = [{ left: 300, top: 350, right: 452, bottom: 392 }];
  const labels = plateCallouts(pins, null, canvas, stage, viewport, { contentBox, texts, avoid, side: 'right', multi: true });
  assert.equal(labels.length, 2);
  assert.ok(labels.every(label => label.side === 'right' && label.x >= stage.width / 2));
  const a = labels.find(l => l.id === 'a')!, b = labels.find(l => l.id === 'b')!;
  assert.equal(a.height, 24);
  assert.ok(b.height > 24);
  assert.ok(b.y + b.height <= 350 - 4 + 1e-6);
  assert.ok(a.y + a.height <= b.y || b.y + b.height <= a.y);
});
