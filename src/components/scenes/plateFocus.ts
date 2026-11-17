import type { FigureKey, SceneImage, SceneView, ScenePin } from './types';
import type { Size, Viewport } from './viewport';

/** Decoded part map: RGBA bytes, alpha 255 = part (index R + 256*G), alpha 0 = background. */
export interface PartMap { width: number; height: number; data: Uint8ClampedArray }

export const FOCUS_VEIL_ALPHA = .6;
export const GHOST_ALPHA = .5;
/** Above this zoom the 2400w source replaces the 1200w mid image. */
export const MID_MAX_ZOOM = 1.5;

export const partIndexAt = (map: PartMap, x: number, y: number): number => {
  const i = (y * map.width + x) * 4;
  return map.data[i + 3] === 255 ? map.data[i] + 256 * map.data[i + 1] : 0;
};

/** Per-pixel veil alpha: every non-empty pixel whose part is not kept; background stays clear. */
export function veilMask(map: PartMap, keep: readonly number[], alpha = FOCUS_VEIL_ALPHA): Uint8ClampedArray {
  const kept = new Set(keep), out = new Uint8ClampedArray(map.width * map.height), value = Math.round(alpha * 255);
  for (let p = 0; p < out.length; p++) {
    const i = p * 4;
    if (map.data[i + 3] !== 255) continue;
    if (!kept.has(map.data[i] + 256 * map.data[i + 1])) out[p] = value;
  }
  return out;
}

/** 1 where the target part is hidden by another part (non-empty, index differs); 0 elsewhere. */
export function hiddenMask(map: PartMap, target: number): Uint8Array {
  const out = new Uint8Array(map.width * map.height);
  for (let p = 0; p < out.length; p++) {
    const i = p * 4;
    if (map.data[i + 3] === 255 && map.data[i] + 256 * map.data[i + 1] !== target) out[p] = 1;
  }
  return out;
}

/** Keep the ghost's alpha only where the mask is set, scaled by `alpha`. Mutates and returns `rgba`. */
export function maskGhost(rgba: Uint8ClampedArray, mask: Uint8Array, alpha = GHOST_ALPHA): Uint8ClampedArray {
  for (let p = 0; p < mask.length; p++) rgba[p * 4 + 3] = mask[p] ? Math.round(rgba[p * 4 + 3] * alpha) : 0;
  return rgba;
}

/** Reference level in stage pixels, same centre-origin transform as the image. */
export function referencePlacement(y: number, canvas: Size, stage: Size, viewport: Viewport, contentBox?: { x: number; width: number }) {
  const x = (u: number) => stage.width / 2 + viewport.x + (u - .5) * canvas.width * viewport.zoom;
  // Span the figure (plus a small margin), not the whole pane, so outside labels stay clear.
  const x1 = contentBox ? Math.max(0, x(contentBox.x) - 12) : 0;
  const x2 = contentBox ? Math.min(stage.width, x(contentBox.x + contentBox.width) + 12) : stage.width;
  return { y: stage.height / 2 + viewport.y + (y - .5) * canvas.height * viewport.zoom, x1, x2 };
}

/** Labels shown in one pane: the selected one first, then shared ones, only if pinned there. */
export function paneLabelIds(pins: readonly ScenePin[], selectedId: string | null, shared: readonly string[] = [], hidden: readonly string[] = []): string[] {
  const pinned = new Set(pins.map(pin => pin.id));
  const out: string[] = [];
  for (const id of [selectedId, ...shared]) if (id && pinned.has(id) && !hidden.includes(id) && !out.includes(id)) out.push(id);
  return out;
}

export function locatorCaption(presentation: SceneView['presentation']): string {
  if (!presentation) return '';
  return presentation.representation === 'representative-section' ? `Representative section · ${presentation.directionCaption}` : presentation.directionCaption;
}

export const KEY_TEXT: Record<FigureKey, string> = { cut: 'Cut wall · representative thickness', contact: 'Illustrative contact region' };
export const keyItems = (image: Pick<SceneImage, 'keys'>): FigureKey[] => [...new Set(image.keys ?? [])];

/** `mid` for small figures; the full source when zoomed in beyond 1.5x or when there is no mid. */
export function imageSources(image: Pick<SceneImage, 'src' | 'mid'>, canvasWidth: number, zoom: number): { src: string; srcSet?: string; sizes?: string } {
  if (!image.mid || zoom > MID_MAX_ZOOM) return { src: image.src };
  return { src: image.src, srcSet: `${image.mid} 1200w, ${image.src} 2400w`, sizes: `${Math.max(1, Math.round(canvasWidth * zoom))}px` };
}
