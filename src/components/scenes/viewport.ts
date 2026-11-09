export interface Viewport { zoom: number; x: number; y: number }
export interface Size { width: number; height: number }
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;
export const INITIAL_VIEWPORT: Viewport = { zoom: 1, x: 0, y: 0 };
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Fit the clean render canvas without cropping or changing its aspect ratio. */
export function fitCanvas(stage: Size, aspect = 4 / 3): Size {
  const width = Math.max(0, Math.min(stage.width, stage.height * aspect));
  return { width, height: width / aspect };
}

/** Keep the image within the stage, allowing movement only where it exceeds it. */
export function constrainViewport(view: Viewport, canvas: Size, stage: Size): Viewport {
  const zoom = clamp(view.zoom, MIN_ZOOM, MAX_ZOOM);
  const maxX = Math.max(0, (canvas.width * zoom - stage.width) / 2);
  const maxY = Math.max(0, (canvas.height * zoom - stage.height) / 2);
  return { zoom, x: maxX === 0 ? 0 : clamp(view.x, -maxX, maxX), y: maxY === 0 ? 0 : clamp(view.y, -maxY, maxY) };
}

/** Anchor the same image point under a pointer measured from the stage center. */
export function zoomAt(view: Viewport, nextZoom: number, point: { x: number; y: number }, canvas: Size, stage: Size): Viewport {
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  const ratio = zoom / view.zoom;
  return constrainViewport({ zoom, x: point.x - (point.x - view.x) * ratio, y: point.y - (point.y - view.y) * ratio }, canvas, stage);
}

/** Permit HTTPS citations and same-origin absolute paths, never executable schemes. */
export function safeSourceURL(value: string): string | undefined {
  if (/[\u0000-\u0020\u007f]/.test(value)) return undefined;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) {
    try {
      const decoded = decodeURIComponent(value.split(/[?#]/)[0]);
      if (!decoded.split('/').includes('..') && !decoded.includes('\\')) return value;
    } catch { return undefined; }
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) return parsed.href;
  } catch { return undefined; }
  return undefined;
}
