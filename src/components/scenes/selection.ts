import type { SceneState, VisualizationManifest } from './types';
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
