import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonState, designPairFor, stateLabel } from '../src/components/scenes/selection';
import type { VisualizationManifest } from '../src/components/scenes/types';
test('comparison chooses a different state and refuses single states', () => {
  assert.equal(comparisonState(['open', 'closed'], 'open'), 'closed');
  assert.equal(comparisonState(['open', 'closed'], 'closed'), 'open');
  assert.equal(comparisonState(['open'], 'open'), null);
});
test('labels preserve commas and disambiguate repeated steps with authored notes', () => {
  const states = [{ id: 'closed', label: '4. Arms closed', note: 'Leaflets captured. Authored pose.' }, { id: 'open', label: '5. Arms closed', note: 'Leaflets open around the clip. Authored pose.' }];
  assert.equal(stateLabel(states[0], states), '4. Arms closed — Leaflets captured');
  assert.notEqual(stateLabel(states[0], states), stateLabel(states[1], states));
  const item = { id: 'x', label: 'Arms closed, valve open' };
  assert.equal(stateLabel(item, [item]), item.label);
});

test('explicit landmark identity survives annotation IDs across views and states', async () => {
  const { annotationIdentity, resolveAnnotation } = await import('../src/components/scenes/selection');
  const identity = annotationIdentity({ id: 'first', landmarkId: 'same' });
  assert.equal(resolveAnnotation([{ id: 'second', landmarkId: 'same' }], identity)?.id, 'second');
  assert.equal(resolveAnnotation([{ id: 'first', landmarkId: 'different' }], identity), undefined);
  assert.equal(resolveAnnotation([{ id: 'first' }], identity), undefined);
  assert.equal(resolveAnnotation([], identity), undefined);
  assert.equal(resolveAnnotation([{ id: 'later', landmarkId: 'same' }], identity)?.id, 'later');
  assert.equal(resolveAnnotation([{ id: 'a' }], annotationIdentity({ id: 'a' }))?.id, 'a');
});

test('design pairs resolve per view and report paired states', () => {
  const manifest = { presentation: { annotationMode: 'external', designComparison: { pairs: [{ designs: ['a', 'b'], views: ['section'], states: ['open'], summary: 'Text' }] } } } as unknown as VisualizationManifest;
  const found = designPairFor(manifest, 'section', 'open')!;
  assert.equal(found.statePaired, true);
  assert.equal(designPairFor(manifest, 'section', 'closed')!.statePaired, false);
  assert.equal(found.other('a'), 'b');
  assert.equal(found.other('b'), 'a');
  assert.equal(found.other('c'), null);
  assert.equal(designPairFor(manifest, 'face'), null);
  assert.equal(designPairFor({ designs: [] } as unknown as VisualizationManifest, 'section'), null);
});
