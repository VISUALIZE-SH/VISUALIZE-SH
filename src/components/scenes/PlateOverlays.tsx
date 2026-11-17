import { useEffect, useRef, useState } from 'react';
import type { FigureKey as FigureKeyId, FocusEntry, ImageLocator, SceneImage, SceneView } from './types';
import { GHOST_ALPHA, KEY_TEXT, hiddenMask, keyItems, locatorCaption, maskGhost, veilMask } from './plateFocus';
import type { PartMap } from './plateFocus';

const PART_MAP_CACHE = 6;
const partMapCache = new Map<string, Promise<PartMap | null>>();
/** Lazy, cached per URL (the few most recent). Resolves null if the map cannot be loaded or
 * decoded; failures are not cached, so a later selection retries. */
export function loadPartMap(url: string): Promise<PartMap | null> {
  const cached = partMapCache.get(url);
  if (cached) {
    partMapCache.delete(url);
    partMapCache.set(url, cached);  // most recently used last
    return cached;
  }
  const loading = new Promise<PartMap | null>(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve({ width: canvas.width, height: canvas.height, data: ctx.getImageData(0, 0, canvas.width, canvas.height).data });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
  partMapCache.set(url, loading);
  loading.then(map => { if (!map && partMapCache.get(url) === loading) partMapCache.delete(url); });
  while (partMapCache.size > PART_MAP_CACHE) partMapCache.delete(partMapCache.keys().next().value!);
  return loading;
}


export function usePartMap(url: string | undefined): PartMap | null {
  const [state, setState] = useState<{ url: string; map: PartMap | null }>({ url: '', map: null });
  useEffect(() => {
    if (!url) return;
    let live = true;
    loadPartMap(url).then(map => { if (live) setState({ url, map }); });
    return () => { live = false; };
  }, [url]);
  return url && state.url === url ? state.map : null;
}

/** Plate field colour as RGB, read from the figure so light and dark themes both match. */
function fieldRgb(el: HTMLElement): [number, number, number] {
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) return [255, 255, 255];
  probe.fillStyle = getComputedStyle(el).getPropertyValue('--plate-field').trim() || '#fff';
  probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

const ghostCache = new Map<string, Promise<HTMLImageElement | null>>();
const loadGhost = (src: string) => {
  let p = ghostCache.get(src);
  if (!p) { p = new Promise(resolve => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src; }); ghostCache.set(src, p); }
  return p;
};

/** Veil (and optional ghost) drawn in image space; lives inside .scene-canvas so it shares the zoom/pan transform. */
export function FocusLayer({ partMap, focus }: { partMap: PartMap | null; focus: FocusEntry | null }) {
  const veilRef = useRef<HTMLCanvasElement>(null);
  const ghostRef = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState<FocusEntry | null>(null);
  useEffect(() => {
    const veil = veilRef.current, ghost = ghostRef.current;
    if (!focus || !partMap || !veil || !ghost) return;
    let live = true;
    const { width: w, height: h } = partMap;
    veil.width = ghost.width = w; veil.height = ghost.height = h;
    const [r, g, b] = fieldRgb(veil.closest<HTMLElement>('.scene-plate-figure') ?? veil);
    const alpha = veilMask(partMap, focus.parts), image = new ImageData(w, h);
    for (let p = 0; p < alpha.length; p++) { image.data[p * 4] = r; image.data[p * 4 + 1] = g; image.data[p * 4 + 2] = b; image.data[p * 4 + 3] = alpha[p]; }
    veil.getContext('2d')?.putImageData(image, 0, 0);
    const gctx = ghost.getContext('2d');
    gctx?.clearRect(0, 0, w, h);
    const entry = focus;
    if (entry.ghost && gctx) {
      const box = entry.ghost;
      loadGhost(box.src).then(img => {
        if (!live || !img) return;
        const scratch = document.createElement('canvas'); scratch.width = w; scratch.height = h;
        const sctx = scratch.getContext('2d', { willReadFrequently: true });
        if (!sctx) return;
        sctx.drawImage(img, box.x * w, box.y * h, box.width * w, box.height * h);
        const px = sctx.getImageData(0, 0, w, h);
        maskGhost(px.data, hiddenMask(partMap, focus.parts[0]), GHOST_ALPHA);
        gctx.putImageData(px, 0, 0);
      });
    }
    setDrawn(entry);
    return () => { live = false; };
  }, [partMap, focus]);
  const on = !!focus && !!partMap && drawn === focus;
  return <>
    <canvas ref={veilRef} className={`scene-focus-layer scene-focus-veil ${on ? 'is-on' : ''}`} aria-hidden="true" />
    <canvas ref={ghostRef} className={`scene-focus-layer scene-focus-ghost ${on ? 'is-on' : ''}`} aria-hidden="true" />
  </>;
}

export function FigureKey({ image, second, colors }: { image: Pick<SceneImage, 'keys'>; second?: boolean; colors?: Partial<Record<FigureKeyId, string>> }) {
  const items = keyItems(image);
  if (!items.length) return null;
  return <ul className={`scene-plate-key-box ${second ? 'is-second' : ''}`} aria-label="Figure key">
    {items.map(item => <li key={item}><i className={`scene-key-swatch is-${item}`} style={item === 'cut' && colors?.cut ? { background: colors.cut } : undefined} aria-hidden="true" />{KEY_TEXT[item]}</li>)}
  </ul>;
}

/** Thumbnail of the regional view with a ring at the cut location; opens that view. */
export function LocatorCard({ locator, presentation, onOpen }: { locator: ImageLocator; presentation: SceneView['presentation']; onOpen: () => void }) {
  const caption = locatorCaption(presentation);
  return <button type="button" className="scene-plate-locator has-ring" onClick={onOpen} aria-label={`Show regional view${caption ? `: ${caption}` : ''}`} title={caption || 'Show regional view'}>
    <span className="scene-locator-thumb"><img src={locator.src} alt="" /><i className="scene-locator-ring" style={{ left: `${locator.x * 100}%`, top: `${locator.y * 100}%`, width: `${locator.r * 200}%` }} /></span>
    {caption && <span className="scene-locator-caption">{caption}</span>}
  </button>;
}

export function ReferenceLine({ y, x1, x2, label, outer }: { y: number; x1?: number; x2?: number; label?: string; outer: 'left' | 'right' }) {
  const span = x1 !== undefined && x2 !== undefined ? { left: x1, width: Math.max(0, x2 - x1), right: 'auto' } : {};
  return <div className="scene-plate-reference" aria-hidden="true" style={{ top: y, ...span }}>{label && <span className={`is-${outer}`}>{label}</span>}</div>;
}
