import type { ScenePin } from './types';
import type { Size, Viewport } from './viewport';

/** Same center-origin transform as .scene-canvas, expressed in stage pixels. */
export function screenAnchor(pin: ScenePin, canvas: Size, stage: Size, viewport: Viewport) {
  return { x: stage.width / 2 + viewport.x + (pin.x - .5) * canvas.width * viewport.zoom,
    y: stage.height / 2 + viewport.y + (pin.y - .5) * canvas.height * viewport.zoom };
}
export interface ExternalCallout { id: string; anchor: { x: number; y: number }; x: number; y: number; width: number; height: number; side: 'left' | 'right' }
type Point = { x: number; y: number };
const labelEnd = (label: ExternalCallout): Point => ({ x: label.side === 'left' ? label.x + label.width : label.x, y: label.y + label.height / 2 });
const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function leadersCross(a: ExternalCallout, b: ExternalCallout): boolean {
  const startA = labelEnd(a), startB = labelEnd(b);
  // Shared endpoints may represent coincident authored anchors. Reject proper
  // intersections, including those caused by different anchor x positions.
  return cross(startA, a.anchor, startB) * cross(startA, a.anchor, b.anchor) < 0 &&
    cross(startB, b.anchor, startA) * cross(startB, b.anchor, a.anchor) < 0;
}

/** Selected first; fixed pixel rows never collide. Offscreen anchors are omitted,
 * never clamped to a different anatomical location. Full list stays available. */
export function externalCallouts(pins: ScenePin[], selectedId: string | null, fallbackId: string | null, canvas: Size, stage: Size, viewport: Viewport): ExternalCallout[] {
  const narrow = stage.width < 640;
  const height = 44, gap = 6, inset = 8;
  if (stage.width < 80 || stage.height < height + inset * 2) return [];
  const width = narrow ? Math.min(148, stage.width * .4) : Math.min(148, stage.width * .22);
  const capacity = Math.max(0, Math.floor((stage.height - inset * 2 + gap) / (height + gap)));
  const chosen = selectedId ?? fallbackId;
  const candidates = narrow ? pins.filter(pin => pin.id === chosen) : [...pins].sort((a, b) => Number(b.id === chosen) - Number(a.id === chosen));
  const visible = pins.map(pin => ({ ...pin, anchor: screenAnchor(pin, canvas, stage, viewport) }))
    .filter(({ anchor }) => anchor.x >= 0 && anchor.x <= stage.width && anchor.y >= 0 && anchor.y <= stage.height);
  // Keep desktop rails close to the visible group rather than the stage edge.
  // Reserve a gap around both the group and stage center; after strong pan/zoom
  // an edge rail can still be used only where the point-clearance test permits.
  const railGap = 28;
  const minAnchorX = Math.min(...visible.map(item => item.anchor.x));
  const maxAnchorX = Math.max(...visible.map(item => item.anchor.x));
  const leftLimit = Math.max(inset, stage.width / 2 - railGap - width);
  const rightLimit = Math.min(stage.width - width - inset, stage.width / 2 + railGap);
  const railX = {
    left: narrow ? inset : Math.min(leftLimit, Math.max(inset, minAnchorX - railGap - width)),
    right: narrow ? stage.width - width - inset : Math.max(rightLimit, Math.min(stage.width - width - inset, maxAnchorX + railGap)),
  };
  const anchorMargin = 6;
  const slots: Record<'left' | 'right', number[]> = { left: [], right: [] };
  const result: ExternalCallout[] = [];
  for (const pin of candidates) {
    const anchor = screenAnchor(pin, canvas, stage, viewport);
    if (anchor.x < 0 || anchor.x > stage.width || anchor.y < 0 || anchor.y > stage.height) continue;
    const side = anchor.x <= stage.width / 2 ? 'left' : 'right';
    const available = Array.from({ length: capacity }, (_, i) => i).filter(i => !slots[side].includes(i));
    if (!available.length) continue;
    const proposed = available.map(slot => ({ slot, label: { id: pin.id, anchor,
      x: railX[side],
      y: inset + slot * (height + gap), width, height, side } as ExternalCallout }))
      .filter(({ label }) => !visible.some(item => item.anchor.x >= label.x - anchorMargin && item.anchor.x <= label.x + width + anchorMargin && item.anchor.y >= label.y - anchorMargin && item.anchor.y <= label.y + height + anchorMargin))
      .filter(({ label }) => result.every(other => {
        if (other.side !== side) return true;
        // Keep anchor and label vertical order consistent even when a selected
        // item claimed its row first. Omit excess labels rather than cross them.
        if ((anchor.y - other.anchor.y) * (label.y - other.y) < 0) return false;
        return !leadersCross(label, other);
      }));
    proposed.sort((a, b) => Math.abs(a.label.y + height / 2 - anchor.y) - Math.abs(b.label.y + height / 2 - anchor.y));
    if (!proposed.length) continue;
    slots[side].push(proposed[0].slot);
    result.push(proposed[0].label);
  }
  return result;
}

export interface ContentBox { x: number; y: number; width: number; height: number }
export interface PlateOptions { hidden?: readonly string[]; contentBox?: ContentBox | null; rowHeight?: number; rowGap?: number; railGap?: number; widthScale?: number; /** Label text per id: labels wider than their rail wrap to two lines before truncating. */ texts?: Record<string, string>; /** Force every label onto one side (comparison panes). */ side?: 'left' | 'right'; /** Stage-pixel rectangles (toolbar, key box, compass) that label rows must stay clear of. */ avoid?: { left: number; top: number; right: number; bottom: number }[]; /** Half-width comparison panes: place several labels instead of only the selected one. */ multi?: boolean }

/** Content box in stage pixels, using the same transform as screenAnchor. */
export function screenContentBox(box: ContentBox, canvas: Size, stage: Size, viewport: Viewport) {
  const left = stage.width / 2 + viewport.x + (box.x - .5) * canvas.width * viewport.zoom;
  const top = stage.height / 2 + viewport.y + (box.y - .5) * canvas.height * viewport.zoom;
  return { left, top, right: left + box.width * canvas.width * viewport.zoom, bottom: top + box.height * canvas.height * viewport.zoom };
}

/** Plain-text plate labels: rails sit just outside the artwork's content box, rows are
 * 24px, anchors are never moved, and labels that cannot be placed without overlap or
 * crossing leaders are omitted. Narrow stages show only the selected label. */
export function plateCallouts(pins: ScenePin[], selectedId: string | null, canvas: Size, stage: Size, viewport: Viewport, options: PlateOptions = {}): ExternalCallout[] {
  const ws = Math.max(1, options.widthScale ?? 1);
  const height = options.rowHeight ?? 24, rowGap = options.rowGap ?? 4, gap = options.railGap ?? 16, inset = 8, maxWidth = 190 * ws, minWidth = 88 * ws;
  if (stage.width < 80 || stage.height < height + inset * 2) return [];
  const narrow = stage.width < 640 && !options.multi;
  const hidden = new Set(options.hidden ?? []);
  const shown = pins.filter(pin => !hidden.has(pin.id)).map(pin => ({ id: pin.id, anchor: screenAnchor(pin, canvas, stage, viewport) }))
    .filter(({ anchor }) => anchor.x >= 0 && anchor.x <= stage.width && anchor.y >= 0 && anchor.y <= stage.height);
  const candidates = narrow ? shown.filter(item => item.id === selectedId) : [...shown].sort((a, b) => Number(b.id === selectedId) - Number(a.id === selectedId));
  if (!candidates.length) return [];

  // Rails: outside the content box when both sides have room, else the adaptive fallback.
  const content = options.contentBox && !narrow ? screenContentBox(options.contentBox, canvas, stage, viewport) : null;
  let rails: Record<'left' | 'right', { x: number; width: number }>;
  const leftEdge = content ? content.left - gap : 0, rightStart = content ? content.right + gap : 0;
  const forced = options.side;
  if (content && forced && (forced === 'left' ? leftEdge - inset : stage.width - inset - rightStart) >= minWidth) {
    const lw = Math.min(maxWidth, leftEdge - inset), rw = Math.min(maxWidth, stage.width - inset - rightStart);
    rails = { left: { x: leftEdge - lw, width: lw }, right: { x: rightStart, width: rw } };
  } else if (content && !forced && leftEdge - inset >= minWidth && stage.width - inset - rightStart >= minWidth) {
    const lw = Math.min(maxWidth, leftEdge - inset), rw = Math.min(maxWidth, stage.width - inset - rightStart);
    rails = { left: { x: leftEdge - lw, width: lw }, right: { x: rightStart, width: rw } };
  } else {
    const width = narrow ? Math.min(148 * ws, stage.width * .4) : Math.min(148 * ws, stage.width * (options.multi ? .32 : .22));
    const railGap = 28;
    const xs = shown.map(item => item.anchor.x);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const leftLimit = Math.max(inset, stage.width / 2 - railGap - width), rightLimit = Math.min(stage.width - width - inset, stage.width / 2 + railGap);
    rails = {
      left: { x: narrow ? inset : Math.min(leftLimit, Math.max(inset, minX - railGap - width)), width },
      right: { x: narrow ? stage.width - width - inset : Math.max(rightLimit, Math.min(stage.width - width - inset, maxX + railGap)), width },
    };
    if (options.side) {
      // Outer edge of the pane, narrowed so no anchor sits inside the label.
      const rx = Math.max(stage.width - width - inset, maxX + 14), lx = Math.min(width + inset, minX - 14);
      rails = { left: { x: inset, width: Math.max(60, lx - inset) }, right: { x: rx, width: Math.max(60, stage.width - inset - rx) } };
    }
    else if (options.multi) {
      // Half-width panes: keep rails clear of every anchor by narrowing them to the free space.
      const rx = maxX + 14, lw = minX - 14 - inset;
      if (stage.width - inset - rx >= 92) rails.right = { x: rx, width: Math.min(width, stage.width - inset - rx) };
      if (lw >= 92) rails.left = { x: minX - 14 - Math.min(width, lw), width: Math.min(width, lw) };
    }
  }
  const sideOf = (anchor: Point): 'left' | 'right' => forced ? forced : anchor.x <= (content ? (content.left + content.right) / 2 : stage.width / 2) ? 'left' : 'right';
  const bottom = stage.height - inset;
  const margin = 6;

  const charWidth = 7.2 * ws, wrapHeight = Math.round(height * 1.6);
  const heightFor = (id: string, side: 'left' | 'right') => { const t = options.texts?.[id]; return t && t.length * charWidth + 14 * ws > rails[side].width ? wrapHeight : height; };
  const bottomFor = (side: 'left' | 'right') => (options.avoid ?? []).reduce((limit, r) => r.right > rails[side].x && r.left < rails[side].x + rails[side].width ? Math.min(limit, r.top - 4) : limit, bottom);
  const layout = (items: typeof candidates, side: 'left' | 'right'): ExternalCallout[] | null => {
    const sorted = [...items].sort((a, b) => a.anchor.y - b.anchor.y);
    const hs = sorted.map(item => heightFor(item.id, side)), limitBottom = bottomFor(side);
    const ys: number[] = [];
    sorted.forEach((item, i) => { const ideal = Math.max(inset, item.anchor.y - hs[i] / 2); ys.push(i ? Math.max(ideal, ys[i - 1] + hs[i - 1] + rowGap) : ideal); });
    const overflow = ys.length ? ys[ys.length - 1] + hs[hs.length - 1] - limitBottom : 0;
    if (overflow > 0) {
      for (let i = ys.length - 1; i >= 0; i--) { const limit = i === ys.length - 1 ? limitBottom - hs[i] : ys[i + 1] - hs[i] - rowGap; ys[i] = Math.min(ys[i], limit); }
      if (ys[0] < inset) return null;
    }
    return sorted.map((item, i) => ({ id: item.id, anchor: item.anchor, x: rails[side].x, y: ys[i], width: rails[side].width, height: hs[i], side }));
  };
  const clear = (label: ExternalCallout) => !shown.some(item => item.anchor.x >= label.x - margin && item.anchor.x <= label.x + label.width + margin && item.anchor.y >= label.y - margin && item.anchor.y <= label.y + label.height + margin);

  const result: ExternalCallout[] = [];
  if (narrow) {
    // One label: the nearest row (top, bottom or beside the anchor) that avoids every anchor.
    const [item] = candidates, side = sideOf(item.anchor);
    const rows = [Math.min(Math.max(inset, item.anchor.y - height / 2), bottom - height), inset, bottom - height, (stage.height - height) / 2];
    for (const y of rows) { const label: ExternalCallout = { id: item.id, anchor: item.anchor, x: rails[side].x, y, width: rails[side].width, height, side }; if (clear(label)) return [label]; }
    return [];
  }
  for (const side of ['left', 'right'] as const) {
    let items = candidates.filter(item => sideOf(item.anchor) === side);
    for (;;) {
      const placed = layout(items, side);
      if (!placed) { items = items.slice(0, -1); if (!items.length) break; continue; }
      const blocked = placed.find(label => !clear(label));
      const rank = (label: ExternalCallout) => items.findIndex(item => item.id === label.id);
      let drop: ExternalCallout | undefined = blocked;
      if (!drop) {
        for (let i = 0; i < placed.length && !drop; i++) for (let j = i + 1; j < placed.length && !drop; j++) {
          if (leadersCross(placed[i], placed[j])) drop = rank(placed[i]) > rank(placed[j]) ? placed[i] : placed[j];
        }
      }
      if (!drop) { result.push(...placed); break; }
      items = items.filter(item => item.id !== drop!.id);
      if (!items.length) break;
    }
  }
  return result;
}
