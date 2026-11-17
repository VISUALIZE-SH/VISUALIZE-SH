import type { DesignPair, SceneState, VisualizationManifest } from './types';
export function stateLabel(state: SceneState, states: SceneState[]): string {
  const plain = (label: string) => label.replace(/^\d+\.\s*/, '').toLowerCase();
  if (states.filter(item => plain(item.label) === plain(state.label)).length < 2) return state.label;
  return `${state.label} — ${state.note?.split('. ')[0] || state.id.replace(/_/g, ' ')}`;
}
export function comparisonState(states: string[], active: string): string | null {
  return states.find(id => id !== active) ?? null;
}
export function locatorImage(manifest: VisualizationManifest, designId: string) {
  const view = manifest.views.find(item => item.id === 'heart');
  return view ? manifest.images[`${designId}/${view.id}/${view.states[0]}`] : undefined;
}

/** Identity is explicit: similarly named annotations never imply a shared landmark. */
export function annotationIdentity(annotation: { id: string; landmarkId?: string }): string {
  return annotation.landmarkId ? `landmark:${annotation.landmarkId}` : `annotation:${annotation.id}`;
}
export function resolveAnnotation<T extends { id: string; landmarkId?: string }>(annotations: T[], identity: string | null): T | undefined {
  return identity ? annotations.find(annotation => annotationIdentity(annotation) === identity) : undefined;
}

export interface DesignPairResult { pair: DesignPair; statePaired: boolean; other: (designId: string) => string | null }
/** The design pair covering a view, or null. `statePaired` says whether stateId is compared. */
export function designPairFor(manifest: VisualizationManifest, viewId: string, stateId?: string): DesignPairResult | null {
  const pair = manifest.presentation?.designComparison?.pairs.find(item => item.views.includes(viewId));
  if (!pair) return null;
  return { pair, statePaired: stateId !== undefined && pair.states.includes(stateId), other: id => id === pair.designs[0] ? pair.designs[1] : id === pair.designs[1] ? pair.designs[0] : null };
}
