import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { imageKey } from './types';
import { annotationIdentity, resolveAnnotation, comparisonState, designPairFor, locatorImage, stateLabel } from './selection';
import { externalCallouts, plateCallouts } from './externalAnnotations';
import type { ExternalCallout } from './externalAnnotations';
import { imageSources, keyItems, KEY_TEXT, paneLabelIds, referencePlacement } from './plateFocus';
import { FigureKey, FocusLayer, LocatorCard, ReferenceLine, usePartMap } from './PlateOverlays';
import type { VisualizationManifest } from './types';
import { constrainViewport, fitCanvas, INITIAL_VIEWPORT, MAX_ZOOM, MIN_ZOOM, safeSourceURL, zoomAt } from './viewport';
import type { Size, Viewport } from './viewport';
import { withAssetBase } from './assets';
import './viewer.css';

export type { VisualizationManifest } from './types';

interface Props { reviewControls?: ReactNode; manifest: VisualizationManifest; onClose: () => void; returnLabel: string; returnFocusElement?: HTMLElement | null }
interface Point { x: number; y: number }
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
/** Sentence-style capitals for label fallbacks; short all-caps words (acronyms) are kept. */
const sentenceCase = (label: string) => label.split(/\s+/).map((word, i) => /^[A-Z0-9]{2,}$/.test(word) ? word : (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase())).join(' ');
const LARGE_TEXT_ROW = 36, LARGE_TEXT_WIDTH = 1.5;
/** Follows the host app's Accessibility toggle, which adds a class to the .app element. */
function useLargeText() {
  const [large, setLarge] = useState(() => !!document.querySelector('.app.accessibility-mode'));
  useEffect(() => {
    const app = document.querySelector('.app');
    const update = () => setLarge(!!document.querySelector('.app.accessibility-mode'));
    update();
    if (!app || typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(update);
    observer.observe(app, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return large;
}
const NARROW_QUERY = '(max-width: 899px)';
/** Phone label keys are letters so they never read as the numbered pose steps. */
const keyLetter = (index: number) => String.fromCharCode(65 + index);
const FIDELITY: Record<string, string> = { 'source-derived': 'Adapted from source anatomy', 'authored-schematic': 'Representative schematic', parametric: 'Representative shape' };

function Icon({ name }: { name: 'close' | 'back' | 'plus' | 'minus' | 'reset' | 'info' | 'left' | 'right' | 'tag' }) {
  const paths = { close: 'm6 6 12 12M18 6 6 18', back: 'm14 5-7 7 7 7M7 12h14', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', reset: 'M4 10a8 8 0 1 1 1 8M4 4v6h6', info: 'M12 11v6M12 7h.01', left: 'm15 5-7 7 7 7', right: 'm9 5 7 7-7 7', tag: 'M3.5 12.4V4.5a1 1 0 0 1 1-1h7.9a1 1 0 0 1 .7.3l7.5 7.5a1 1 0 0 1 0 1.4l-7.9 7.9a1 1 0 0 1-1.4 0l-7.5-7.5a1 1 0 0 1-.3-.7Z' };
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name === 'info' && <circle cx="12" cy="12" r="9" />}{name === 'tag' && <circle cx="8" cy="8" r="1.3" />}<path d={paths[name]} /></svg>;
}

export default function VisualizationViewer({ manifest: published, onClose, returnLabel, returnFocusElement, reviewControls }: Props) {
  const manifest = useMemo(() => withAssetBase(published, import.meta.env.BASE_URL), [published]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLHeadingElement>(null);
  const infoRef = useRef<HTMLHeadingElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const lastPinRef = useRef<HTMLButtonElement | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesturePane = useRef(0);
  const pinch = useRef<{ center: Point; distance: number; view: Viewport } | null>(null);
  const titleId = useId();
  const stageDescriptionId = useId();
  const [index, setIndex] = useState(0);
  const [designId, setDesignId] = useState(manifest.designs[0].id);
  const [stateId, setStateId] = useState(manifest.views[0].states[0]);
  const [selected, setSelected] = useState<string | null>(null);
  const [info, setInfo] = useState(false);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [designMode, setDesignMode] = useState(false);
  const [narrowDesignId, setNarrowDesignId] = useState<string | null>(null);
  const [showPins, setShowPins] = useState(true);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT);
  const [size, setSize] = useState<Size>({ width: 1, height: 1 });
  const [retry, setRetry] = useState(0);
  const [imageState, setImageState] = useState<{ key: string; state: 'loading' | 'loaded' | 'error' }>({ key: '', state: 'loading' });
  const view = manifest.views[index] ?? manifest.views[0];
  const baseDesign = manifest.designs.find(item => item.id === designId) ?? manifest.designs[0];
  const largeText = useLargeText();
  const [narrowLayout, setNarrowLayout] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia(NARROW_QUERY).matches);
  const external = manifest.presentation?.annotationMode === 'external';
  const plate = external && manifest.presentation?.layout === 'plate';
  const pairInfo = plate ? designPairFor(manifest, view.id) : null;
  const pair = pairInfo?.pair ?? null;
  const designActive = designMode && !!pair;
  // A view offers only some states. Keep the reader's state where it exists.
  const requestedState = view.states.includes(stateId) ? stateId : view.states[0];
  const activeState = designActive && pair && !pair.states.includes(requestedState) ? pair.states[0] : requestedState;
  const designById = (id: string) => manifest.designs.find(item => item.id === id) ?? manifest.designs[0];
  const toggledDesignId = pair && narrowDesignId && pair.designs.includes(narrowDesignId) ? narrowDesignId : pair?.designs[0];
  const design = designActive && pair ? designById(narrowLayout ? toggledDesignId! : pair.designs[0]) : baseDesign;
  const state = manifest.states.find(item => item.id === activeState);
  const image = manifest.images[imageKey(design.id, view.id, activeState)];
  const url = image?.src ?? '';
  const loadKey = `${url}:${retry}`;
  const activeLoadKey = useRef(loadKey);
  activeLoadKey.current = loadKey;
  const imageStatus = imageState.key === loadKey ? imageState.state : 'loading';
  const poseCompareImage = compareId ? manifest.images[imageKey(design.id, view.id, compareId)] : undefined;
  const designSplit = designActive && !!pair && !narrowLayout;
  const secondDesign = designSplit && pair ? designById(pair.designs[1]) : undefined;
  const compareImage = poseCompareImage ?? (secondDesign ? manifest.images[imageKey(secondDesign.id, view.id, activeState)] : undefined);
  const split = !!compareImage;
  const dragStart = useRef<Point | null>(null);
  const dragMoved = useRef(false);
  const comparison = manifest.states.find(item => item.id === compareId);
  const panelSize = compareImage ? { ...size, width: size.width / 2 } : size;
  const canvas = fitCanvas(panelSize);
  const locator = view.id !== 'heart' ? locatorImage(manifest, design.id) : undefined;
  const regional = plate && !compareImage ? image?.locator : undefined;
  const annotations = (image?.pins ?? []).map(pin => ({ ...manifest.annotations[pin.id], ...pin }));
  const hiddenLabels = manifest.presentation?.hiddenLabels ?? [];
  const labelFor = (id: string, fallback: string) => manifest.presentation?.labels?.[id] ?? sentenceCase(fallback);
  useEffect(() => {
    if (!plate || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(NARROW_QUERY);
    const update = () => setNarrowLayout(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [plate]);
  const selectedAnnotation = external ? resolveAnnotation(annotations, selected) : annotations.find(annotation => annotation.id === selected);
  const selectedId = selectedAnnotation?.id ?? null;
  const selectedDefinition = external && selected ? Object.entries(manifest.annotations).find(([id, annotation]) => annotationIdentity({ ...annotation, id }) === selected)?.[1] : undefined;
  const plateAnnotations = plate ? annotations.filter(annotation => !hiddenLabels.includes(annotation.id)) : annotations;
  const labelTexts = (img: NonNullable<typeof image>) => Object.fromEntries(img.pins.map(pin => [pin.id, labelFor(pin.id, manifest.annotations[pin.id].label)]));
  /** Stage-pixel boxes of figure furniture that label rows must stay clear of. */
  const avoidRects = (img: NonNullable<typeof image>, sz: Size, tools: boolean, second: boolean) => {
    const rects: { left: number; top: number; right: number; bottom: number }[] = [];
    const box = (left: number, w: number, h: number, bottom: number) => rects.push({ left, top: sz.height - bottom - h, right: left + w, bottom: sz.height - bottom });
    if (!second) box(10, 38, 38, 10);
    if (tools && !narrowLayout) { const b = largeText ? 44 : 32; box(sz.width - 10 - (b * 4 + 12), b * 4 + 12, b, 10); }
    const keys = keyItems(img);
    if (keys.length) { const text = Math.max(...keys.map(k => KEY_TEXT[k].length)); box(second ? 8 : 56, text * (largeText ? 9 : 6.3) + (largeText ? 60 : 44) + 16, keys.length * (largeText ? 25 : 17) + 10, 10); }
    return rects;
  };
  const callouts = plate
    ? plateCallouts(narrowLayout ? [] : plateAnnotations, selectedId, canvas, panelSize, viewport, { hidden: hiddenLabels, contentBox: image?.contentBox, ...(image ? { texts: labelTexts(image), avoid: avoidRects(image, panelSize, true, false) } : {}), ...(largeText ? { rowHeight: LARGE_TEXT_ROW, widthScale: LARGE_TEXT_WIDTH } : {}) })
    : externalCallouts(annotations, selectedId, selected ? null : annotations.find(annotation => annotation.layer === 'anatomy')?.id ?? annotations[0]?.id ?? null, canvas, panelSize, viewport);
  const annotations2 = (compareImage?.pins ?? []).map(pin => ({ ...manifest.annotations[pin.id], ...pin }));
  const selectedAnnotation2 = plate ? resolveAnnotation(annotations2, selected) : undefined;
  const focus1 = plate && selectedId ? image?.focus?.[selectedId] ?? null : null;
  const focus2 = plate && selectedAnnotation2 ? compareImage?.focus?.[selectedAnnotation2.id] ?? null : null;
  // Part maps are fetched only once a label with a focus entry is selected.
  const partMap1 = usePartMap(focus1 ? image?.partMap : undefined);
  const partMap2 = usePartMap(focus2 ? compareImage?.partMap : undefined);
  const sharedIds = pair?.sharedLabels ?? [];
  const largeOptions = largeText ? { rowHeight: LARGE_TEXT_ROW, widthScale: LARGE_TEXT_WIDTH } : {};
  /** Labels for one design pane: the selected label and shared labels, laid out within that pane. */
  const paneCallouts = (img: NonNullable<typeof image>, selId: string | null, second: boolean): ExternalCallout[] => {
    const ids = paneLabelIds(img.pins, selId, sharedIds, hiddenLabels);
    return plateCallouts(img.pins.filter(pin => ids.includes(pin.id)), selId, canvas, panelSize, viewport, { hidden: hiddenLabels, contentBox: img.contentBox, multi: true, side: second ? 'right' : 'left', texts: labelTexts(img), avoid: avoidRects(img, panelSize, second, second), ...largeOptions });
  };
  const narrowMarkerIds = plate && narrowLayout && !compareImage ? (designActive ? paneLabelIds(image?.pins ?? [], selectedId, sharedIds, hiddenLabels) : selectedId ? [selectedId] : []) : [];
  const chooseAnnotation = (id: string, list: typeof annotations = annotations) => {
    const annotation = list.find(item => item.id === id);
    const identity = external && annotation ? annotationIdentity(annotation) : id;
    if (plate && identity === selected) { setSelected(null); return; }
    setSelected(identity);
    setInfo(false);
  };
  const safeClose = useRef(onClose);
  safeClose.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    // No dialog means the manifest has no image for the opening view: close, don't lock the page.
    if (!dialog) { safeClose.current(); return; }
    const previousFocus = returnFocusElement ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (dialog && !dialog.open) dialog.showModal();
    closeRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = oldOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      const nextSize = { width: entry.contentRect.width, height: entry.contentRect.height };
      setSize(nextSize);
      setViewport(current => constrainViewport(current, fitCanvas(split ? { ...nextSize, width: nextSize.width / 2 } : nextSize), split ? { ...nextSize, width: nextSize.width / 2 } : nextSize));
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [split, plate]);

  const closeDetail = useCallback(() => {
    setSelected(null);
    const target = lastPinRef.current?.isConnected ? lastPinRef.current : stageRef.current;
    target?.focus({ preventScroll: true });
  }, []);
  const closeInfo = useCallback(() => {
    setInfo(false);
    infoButtonRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => { if (selected) detailRef.current?.focus({ preventScroll: true }); }, [selected]);
  useEffect(() => {
    if (!selectedAnnotation) return;
    setViewport(current => {
      if (current.zoom === 1) return current;
      return constrainViewport({ ...current, x: -(selectedAnnotation.x - .5) * canvas.width * current.zoom, y: -(selectedAnnotation.y - .5) * canvas.height * current.zoom }, canvas, panelSize);
    });
  }, [selectedAnnotation?.id, size.width, size.height]);
  // A pin may not exist in the new image; never leave a detail open for it.
  useEffect(() => { if (!external && selected && !annotations.some(annotation => annotation.id === selected)) setSelected(null); }, [loadKey]);

  useEffect(() => { if (info) infoRef.current?.focus({ preventScroll: true }); }, [info]);

  useEffect(() => {
    setCompareId(null);
    if (!designPairFor(manifest, view.id)) setDesignMode(false);
    if (!external) setSelected(null);
    setViewport(INITIAL_VIEWPORT);
    pointers.current.clear();
    pinch.current = null;
  }, [view.id, baseDesign.id]);

  const changeView = (next: number, focusTab = false) => {
    const value = (next + manifest.views.length) % manifest.views.length;
    setIndex(value);
    if (!external) setSelected(null);
    setViewport(INITIAL_VIEWPORT);
    pointers.current.clear();
    pinch.current = null;
    if (focusTab) requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>(`[data-view-index="${value}"]`)?.focus());
  };

  const applyZoom = (factor: number, point: Point = { x: 0, y: 0 }) => {
    setViewport(current => zoomAt(current, current.zoom * factor, point, canvas, panelSize));
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const wheel = (event: WheelEvent) => {
      if ((event.target as HTMLElement).closest('button')) return;
      event.preventDefault();
      const rect = stage.getBoundingClientRect();
      const point = { x: (compareImage ? (event.clientX - rect.left) % (rect.width / 2) - rect.width / 4 : event.clientX - rect.left - rect.width / 2), y: event.clientY - rect.top - rect.height / 2 };
      setViewport(current => zoomAt(current, current.zoom * Math.exp(-event.deltaY * .002), point, canvas, panelSize));
    };
    stage.addEventListener('wheel', wheel, { passive: false });
    return () => stage.removeEventListener('wheel', wheel);
  }, [size, split, plate]);

  const stagePoint = (event: PointerEvent<HTMLDivElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (compareImage ? event.clientX - rect.left - gesturePane.current * rect.width / 2 - rect.width / 4 : event.clientX - rect.left - rect.width / 2), y: event.clientY - rect.top - rect.height / 2 };
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    if (!pointers.current.size && compareImage) {
      const rect = event.currentTarget.getBoundingClientRect();
      gesturePane.current = event.clientX - rect.left >= rect.width / 2 ? 1 : 0;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!pointers.current.size) { dragMoved.current = false; dragStart.current = stagePoint(event); }
    pointers.current.set(event.pointerId, stagePoint(event));
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { center: midpoint(a, b), distance: distance(a, b), view: viewport };
    }
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const point = stagePoint(event);
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size > 1 || (dragStart.current && distance(point, dragStart.current) > 4)) dragMoved.current = true;
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const origin = pinch.current;
      const center = midpoint(a, b);
      const scaled = zoomAt(origin.view, origin.view.zoom * distance(a, b) / Math.max(1, origin.distance), origin.center, canvas, panelSize);
      setViewport(constrainViewport({ ...scaled, x: scaled.x + center.x - origin.center.x, y: scaled.y + center.y - origin.center.y }, canvas, panelSize));
    } else if (pointers.current.size === 1) {
      setViewport(current => constrainViewport({ ...current, x: current.x + point.x - previous.x, y: current.y + point.y - previous.y }, canvas, panelSize));
    }
  };
  const pointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    pinch.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (info) closeInfo(); else if (selected) closeDetail(); else safeClose.current();
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('a, input, textarea, select') || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === '+' || event.key === '=') { event.preventDefault(); applyZoom(1.25); }
    if (event.key === '-') { event.preventDefault(); applyZoom(.8); }
    if (event.key === '0') { event.preventDefault(); setViewport(INITIAL_VIEWPORT); }
    const onTabs = !!target.closest('[role="tablist"]');
    const onStage = target === stageRef.current;
    if (onTabs && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      changeView(event.key === 'Home' ? 0 : event.key === 'End' ? manifest.views.length - 1 : index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1), true);
    } else if (onStage && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      if (viewport.zoom === 1 && ['ArrowLeft', 'ArrowRight'].includes(event.key)) changeView(index + (event.key === 'ArrowRight' ? 1 : -1));
      else setViewport(current => constrainViewport({ ...current, x: current.x + (event.key === 'ArrowLeft' ? 48 : event.key === 'ArrowRight' ? -48 : 0), y: current.y + (event.key === 'ArrowUp' ? 48 : event.key === 'ArrowDown' ? -48 : 0) }, canvas, panelSize));
    }
  };

  if (!image) return null;
  const availableStates = manifest.states.filter(item => view.states.includes(item.id));


  const chooseState = (id: string) => { setStateId(id); if (compareId === id) setCompareId(activeState); };
  const enterDesigns = () => {
    if (!pair) return;
    setCompareId(null);
    setDesignMode(true);
    setNarrowDesignId(pair.designs.includes(baseDesign.id) ? baseDesign.id : pair.designs[0]);
    if (!pair.states.includes(activeState)) setStateId(pair.states[0]);
    setViewport(INITIAL_VIEWPORT);
  };
  const exitDesigns = () => { setDesignMode(false); setViewport(INITIAL_VIEWPORT); };
  const detailCard = selectedAnnotation && !info ? <div className="scene-plate-detail" role="group" aria-label="Label detail"><div className="scene-plate-detail-head"><h3 ref={detailRef} tabIndex={-1}>{labelFor(selectedAnnotation.id, selectedAnnotation.label)}</h3><button type="button" className="scene-plate-close" aria-label="Close label detail" onClick={closeDetail}><Icon name="close" /></button></div><span className="scene-fidelity" data-fidelity={selectedAnnotation.fidelity}>{FIDELITY[selectedAnnotation.fidelity]}</span><p>{selectedAnnotation.body}</p></div> : null;
  let stepNumber = 0;
  const grouped = plate ? (() => {
    const configured = (manifest.presentation?.stateGroups ?? []).map(group => ({ label: group.label, items: group.states.map(id => availableStates.find(item => item.id === id)).filter((item): item is NonNullable<typeof item> => !!item) })).filter(group => group.items.length);
    const used = new Set(configured.flatMap(group => group.items.map(item => item.id)));
    const rest = availableStates.filter(item => !used.has(item.id));
    return rest.length ? [...configured, { label: configured.length ? 'Other' : '', items: rest }] : configured;
  })() : [];
  const stepLabel = (item: { id: string; label: string }) => manifest.presentation?.stateLabels?.[item.id] ?? stateLabel(item, availableStates);
  const stepper = availableStates.length > 1 ? <div className="scene-plate-steps" role="group" aria-label="Pose">{grouped.map((group, groupIndex) => <div className="scene-plate-step-group" key={`${group.label}-${groupIndex}`}>{group.label && <div className="scene-plate-step-group-label">{group.label}</div>}<ol>{group.items.map(item => { stepNumber += 1; return <li key={item.id}><button type="button" className={item.id === activeState ? 'is-active' : ''} aria-pressed={item.id === activeState} disabled={designActive && !!pair && !pair.states.includes(item.id)} title={designActive && pair && !pair.states.includes(item.id) ? 'Not compared in this view' : item.note} aria-description={item.note} onClick={() => chooseState(item.id)}><span className="scene-plate-step-num">{stepNumber}</span><span className="scene-plate-step-text">{stepLabel(item)}</span></button></li>; })}</ol></div>)}</div> : null;
  const paneLists = designSplit ? [paneCallouts(image, selectedId, false), compareImage ? paneCallouts(compareImage, selectedAnnotation2?.id ?? null, true) : []] : null;
  // On wide screens the label row lists only labels the figure does not show (labels that did
  // not fit, and all labels while comparing poses), so every label stays reachable.
  const onFigure = narrowLayout ? null : new Set(compareImage ? (paneLists?.[0] ?? []).map(callout => callout.id) : showPins ? callouts.map(callout => callout.id) : plateAnnotations.map(annotation => annotation.id));
  const rowAnnotations = onFigure ? plateAnnotations.filter(annotation => !onFigure.has(annotation.id)) : plateAnnotations;
  const labelRow = rowAnnotations.length ? <div className={`scene-plate-labelrow ${onFigure ? 'is-wide' : ''}`} role="group" aria-label={onFigure ? 'More labels' : 'Labels'}>{rowAnnotations.map(annotation => <button type="button" key={annotation.id} className={selectedId === annotation.id ? 'is-selected' : ''} aria-pressed={selectedId === annotation.id} onClick={event => { lastPinRef.current = event.currentTarget; chooseAnnotation(annotation.id); }}>{!onFigure && <span className="scene-plate-key" aria-hidden="true">{keyLetter(plateAnnotations.indexOf(annotation))}</span>}{labelFor(annotation.id, annotation.label)}</button>)}</div> : null;
  const labelLayer = (list: ExternalCallout[], anns: typeof annotations, selId: string | null, focusOn: boolean, sz: Size) => <div className={`scene-plate-labels ${focusOn ? 'has-focus' : ''}`}>
    <svg className="scene-plate-leaders" width={sz.width} height={sz.height} aria-hidden="true">{list.map(callout => <g key={callout.id} className={selId === callout.id ? 'is-selected' : undefined}><line x1={callout.side === 'left' ? callout.x + callout.width : callout.x} y1={callout.y + callout.height / 2} x2={callout.anchor.x} y2={callout.anchor.y} /><circle cx={callout.anchor.x} cy={callout.anchor.y} r={selId === callout.id ? 3 : 2.5} /></g>)}</svg>
    {list.map(callout => { const annotation = anns.find(item => item.id === callout.id)!; return <button type="button" key={callout.id} className={`scene-plate-label is-${callout.side} ${callout.height > (largeText ? LARGE_TEXT_ROW : 24) + 1 ? 'is-wrap' : ''} ${selId === callout.id ? 'is-selected' : ''}`} style={{ left: callout.x, top: callout.y, width: callout.width, height: callout.height }} aria-pressed={selId === callout.id} onClick={event => { lastPinRef.current = event.currentTarget; chooseAnnotation(callout.id, anns); }}>{labelFor(annotation.id, annotation.label)}</button>; })}
  </div>;
  /** Per-pane figure furniture: design-comparison reference level and labels, and the figure key. */
  const paneOverlay = (img: NonNullable<typeof image>, anns: typeof annotations, selId: string | null, focusOn: boolean, second: boolean) => <>
    {designActive && img.reference && <ReferenceLine {...(({ y, x1, x2 }) => ({ y, x1, x2 }))(referencePlacement(img.reference.y, canvas, panelSize, viewport, img.contentBox))} label={img.reference.label} outer={(designSplit ? second : design.id === pair?.designs[1]) ? 'right' : 'left'} />}
    {paneLists && imageStatus === 'loaded' && labelLayer(paneLists[second ? 1 : 0], anns, selId, focusOn, panelSize)}
    <FigureKey image={img} second={second} colors={manifest.presentation?.keyColors} />
  </>;
  const plateWorkspace = plate ? <div className="scene-plate-grid">
    <section className="scene-plate-figure-col" role="tabpanel" id={`${titleId}-panel`} aria-labelledby={`${titleId}-tab-${index}`}>
      {designActive && pair && narrowLayout && <div className="scene-plate-design-toggle" role="group" aria-label="Design shown">{pair.designs.map(id => <button type="button" key={id} className={id === design.id ? 'is-active' : ''} aria-pressed={id === design.id} onClick={() => setNarrowDesignId(id)}>{designById(id).label}</button>)}</div>}
      <div className={`scene-plate-figure ${compareImage ? 'is-comparing' : ''}`}>
        <div ref={stageRef} className={`scene-stage scene-plate-stage ${viewport.zoom > 1 ? 'is-zoomed' : ''}`} tabIndex={0} role="group" aria-label={`${view.label}, ${design.label}: illustration`} aria-describedby={stageDescriptionId} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onClick={event => { if (!selected || dragMoved.current || (event.target as HTMLElement).closest('button')) return; setSelected(null); }} onDoubleClick={event => { if ((event.target as HTMLElement).closest('button')) return; const rect = event.currentTarget.getBoundingClientRect(); const point = { x: (compareImage ? (event.clientX - rect.left) % (rect.width / 2) - rect.width / 4 : event.clientX - rect.left - rect.width / 2), y: event.clientY - rect.top - rect.height / 2 }; if (viewport.zoom > 1) setViewport(INITIAL_VIEWPORT); else applyZoom(2, point); }}>
          <div className="scene-primary-pane" {...(designSplit ? { role: 'group', 'aria-label': `${design.label} design` } : {})}>{compareImage && <span className="scene-pair-label">{designSplit ? design.label : state && stateLabel(state, availableStates)}</span>}<div className="scene-canvas" style={{ width: canvas.width, height: canvas.height, transform: `translate(-50%, -50%) translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}>
            <img key={loadKey} className={`scene-render ${imageStatus === 'loaded' ? 'is-loaded' : ''}`} {...imageSources(image, canvas.width, viewport.zoom)} alt={image.alt} draggable={false} onLoad={() => { if (activeLoadKey.current === loadKey) setImageState({ key: loadKey, state: 'loaded' }); }} onError={() => { if (activeLoadKey.current === loadKey) setImageState({ key: loadKey, state: 'error' }); }} />
            <FocusLayer partMap={partMap1} focus={focus1} />
            {narrowLayout && !compareImage && showPins && imageStatus === 'loaded' && plateAnnotations.map((annotation, i) => narrowMarkerIds.includes(annotation.id) && <button type="button" key={annotation.id} className={`scene-plate-marker ${selectedId === annotation.id ? 'is-selected' : ''}`} style={{ left: `${annotation.x * 100}%`, top: `${annotation.y * 100}%`, transform: `translate(-50%, -50%) scale(${1 / viewport.zoom})` }} aria-label={`${keyLetter(i)}. ${labelFor(annotation.id, annotation.label)}`} aria-pressed={selectedId === annotation.id} onClick={event => { lastPinRef.current = event.currentTarget; chooseAnnotation(annotation.id); }}><span>{keyLetter(i)}</span></button>)}
          </div>{paneOverlay(image, annotations, selectedId, !!focus1, false)}</div>
          {!narrowLayout && !compareImage && showPins && imageStatus === 'loaded' && labelLayer(callouts, annotations, selectedId, !!focus1, size)}
          {compareImage && <div className="scene-comparison-pane" {...(secondDesign ? { role: 'group', 'aria-label': `${secondDesign.label} design` } : {})}><span className="scene-pair-label">{secondDesign ? secondDesign.label : comparison && stateLabel(comparison, availableStates)}</span><div className="scene-canvas" style={{ width: canvas.width, height: canvas.height, transform: `translate(-50%, -50%) translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}><img className="scene-render is-loaded" {...imageSources(compareImage, canvas.width, viewport.zoom)} alt={compareImage.alt} draggable={false} onError={() => setComparisonError(compareImage.src)} /><FocusLayer partMap={partMap2} focus={focus2} /></div>{paneOverlay(compareImage, annotations2, selectedAnnotation2?.id ?? null, !!focus2, true)}{comparisonError === compareImage.src && <div className="scene-image-error" role="alert"><strong>The comparison image could not load.</strong><button onClick={() => { setComparisonError(null); setCompareId(null); if (designSplit) exitDesigns(); }}>Return to one image</button></div>}</div>}
          {imageStatus === 'loading' && <div className="scene-loading" role="status"><span className="scene-loader" />Loading view…</div>}
          {imageStatus === 'error' && <div className="scene-image-error" role="alert"><strong>This view could not load.</strong><p>Retry to load the local image.</p><button onClick={() => { setRetry(current => current + 1); }}>Retry image</button></div>}
        </div>
        <div className="scene-compass" role="img" aria-label="Orientation: S indicates superior; R indicates patient right."><svg viewBox="-30 -30 60 60" aria-hidden="true"><circle cx="0" cy="0" r="2" />{([{ key: 'S', vector: view.orientation.superior }, { key: 'R', vector: view.orientation.patientRight }]).map(({ key, vector }) => <g key={key}><line x1="0" y1="0" x2={vector.x * 18} y2={vector.y * 18} /><text x={vector.x * 25} y={vector.y * 25 + 3}>{key}</text></g>)}</svg></div>
        {regional && image.locator ? <LocatorCard locator={image.locator} presentation={view.presentation} onOpen={() => { const target = manifest.views.findIndex(item => item.id === image.locator!.view); if (target >= 0) changeView(target); }} /> : locator && !compareImage && <button type="button" className="scene-plate-locator" onClick={() => changeView(manifest.views.findIndex(item => item.id === 'heart'))} aria-label="Show in the whole heart" title="Show in the whole heart"><img src={locator.thumb} alt="" /></button>}
        <p className="scene-sr-only" id={stageDescriptionId}>Scroll to zoom, drag to move, select a label for detail. Use plus and minus to zoom, zero to reset, and arrow keys to pan. At fit, left and right change views.</p>
        <p className="scene-sr-only" role="status">{selectedAnnotation ? `${labelFor(selectedAnnotation.id, selectedAnnotation.label)} selected` : ''}</p>
      </div>
      <div className="scene-plate-tools" role="group" aria-label="Image controls">
          <button type="button" aria-label="Show labels" title="Labels" aria-pressed={showPins} disabled={!!compareImage} onClick={() => setShowPins(!showPins)}><Icon name="tag" /></button>
          <button type="button" aria-label="Zoom out" title="Zoom out" disabled={viewport.zoom <= MIN_ZOOM} onClick={() => applyZoom(.8)}><Icon name="minus" /></button>
          <button type="button" aria-label="Zoom in" title="Zoom in" disabled={viewport.zoom >= MAX_ZOOM} onClick={() => applyZoom(1.25)}><Icon name="plus" /></button>
          <button type="button" aria-label="Reset zoom and position" title="Reset" onClick={() => setViewport(INITIAL_VIEWPORT)}><Icon name="reset" /></button>
          <output className="scene-sr-only" aria-label="Zoom level">{Math.round(viewport.zoom * 100)}%</output>
        </div>
      {designActive && pair && narrowLayout && <p className="scene-plate-caption scene-plate-design-summary" aria-live="polite">{pair.summary}</p>}
      {labelRow}
    </section>
    <div className="scene-plate-rail">
      <h2 className="scene-plate-title">{view.title}</h2>
      <p className="scene-plate-lesson" key={view.id} aria-live="polite">{view.lesson}</p>
      {stepper}
      {designActive && pair && !narrowLayout ? <p className="scene-plate-caption" aria-live="polite">{pair.summary}</p> : !designActive && state?.note && <p className="scene-plate-caption" aria-live="polite">{state.note}</p>}
      {external && selected && !selectedAnnotation && <p className="scene-selection-unavailable" role="status">{selectedDefinition ? labelFor(Object.keys(manifest.annotations).find(id => manifest.annotations[id] === selectedDefinition) ?? '', selectedDefinition.label) : 'Selected landmark'} is unavailable in this view or state. Your selection is retained.</p>}
      {detailCard}
      {(availableStates.length > 1 || pair) && <div className="scene-plate-compare">{availableStates.length > 1 && <button type="button" className={`scene-plate-link ${compareId ? 'is-active' : ''}`} aria-pressed={!!compareId} onClick={() => { setDesignMode(false); setCompareId(compareId ? null : comparisonState(view.states, activeState)); setViewport(INITIAL_VIEWPORT); }}>Compare poses</button>}{pair && <button type="button" className={`scene-plate-link ${designActive ? 'is-active' : ''}`} aria-pressed={designActive} onClick={designActive ? exitDesigns : enterDesigns}>Compare designs</button>}{compareId && <label className="scene-compare-select">With <select value={compareId} onChange={event => setCompareId(event.target.value)}>{availableStates.filter(item => item.id !== activeState).map(item => <option key={item.id} value={item.id}>{stepLabel(item)}</option>)}</select></label>}</div>}
    </div>
    {info && <aside className="scene-panel scene-model-info" aria-label="About these illustrations"><div className="scene-panel-head"><h2 ref={infoRef} tabIndex={-1}>About these illustrations</h2><button type="button" className="scene-icon-btn" aria-label="Close notes" onClick={closeInfo}><Icon name="close" /></button></div><p>{manifest.scope}</p><h3>Anatomy and image context</h3><p>Sources below describe the anatomy used for these illustrations. Anatomy details, device shapes and positions are representative schematics. They are not measured on a specific patient or population, and they do not establish product performance or clinical fit.</p><p>{manifest.attribution}</p><ol className="scene-sources">{manifest.sources.map(source => <li key={source.url}><a href={safeSourceURL(source.url)} target="_blank" rel="noreferrer">{source.title}<span aria-hidden="true"> ↗</span><span className="scene-sr-only"> (opens in a new tab)</span></a>{source.locator && <p>{source.locator}</p>}</li>)}</ol><h3>Keyboard and touch</h3><p>Use + and − to zoom and 0 to reset. Arrow keys move a zoomed view. At fit, left and right change views. Pinch to zoom on touch screens. Escape closes a detail, then the viewer.</p></aside>}
  </div> : null;

  return createPortal(<dialog ref={dialogRef} className={`scene-viewer ${plate ? 'scene-plate-mode' : external ? 'scene-external-mode' : ''}${largeText ? ' scene-large-text' : ''}`} aria-labelledby={titleId} onKeyDown={onKeyDown} onCancel={event => { event.preventDefault(); if (info) closeInfo(); else if (selected) closeDetail(); else onClose(); }}>
    <div className="scene-shell">
      <header className="scene-header">
        <div className="scene-header-start"><span className="scene-wordmark" aria-hidden="true">VISUALIZE<span>·SH</span></span><span className="scene-header-sub">Structural heart intelligence</span></div>
        <div className="scene-header-tools">{reviewControls}
          <button ref={infoButtonRef} type="button" className={`scene-text-btn ${info ? 'is-active' : ''}`} onClick={() => info ? closeInfo() : setInfo(true)} aria-expanded={info} aria-label="About these illustrations"><Icon name="info" /><span>About these illustrations</span></button>
          <button ref={closeRef} type="button" className="scene-text-btn scene-back" onClick={onClose} aria-label={`Close visualization and return to ${returnLabel}`}><Icon name="back" /><span>Back to Data</span></button>
        </div>
      </header>
      <div className="scene-body">
        <div className="scene-page-head">
          <div className="scene-title"><h1 id={titleId}>{manifest.title}</h1><span className="scene-badge">{manifest.status}</span></div>
          {manifest.designs.length > 1 && !designActive && <div className="scene-pill-switch" role="group" aria-label="Device design">{manifest.designs.map(item => <button type="button" key={item.id} aria-pressed={item.id === design.id} className={item.id === design.id ? 'is-active' : ''} onClick={() => { setDesignId(item.id); if (!external) setSelected(null); }}>{item.label}</button>)}</div>}
        </div>
        <div className="scene-tabbar">
          <div className="scene-tabs" role="tablist" aria-label="Choose a view" aria-orientation="horizontal">
            {manifest.views.map((item, itemIndex) => <button type="button" key={item.id} role="tab" id={`${titleId}-tab-${itemIndex}`} aria-selected={index === itemIndex} aria-controls={`${titleId}-panel`} tabIndex={index === itemIndex ? 0 : -1} data-view-index={itemIndex} className={`scene-view-tab ${index === itemIndex ? 'is-active' : ''}`} onClick={() => changeView(itemIndex)}>{item.label}</button>)}
          </div>
          <div className="scene-step-buttons"><span className="scene-step-count" aria-hidden="true">{index + 1} / {manifest.views.length}</span><button type="button" className="scene-icon-btn" aria-label="Previous view" onClick={() => changeView(index - 1)}><Icon name="left" /></button><button type="button" className="scene-icon-btn" aria-label="Next view" onClick={() => changeView(index + 1)}><Icon name="right" /></button></div>
        </div>
        {plate ? plateWorkspace : <div className={`scene-workspace ${(selectedAnnotation && !info) || info ? 'has-aside' : ''}`}>
          <section className="scene-main" role="tabpanel" id={`${titleId}-panel`} aria-labelledby={`${titleId}-tab-${index}`}>
            <div className="scene-view-heading"><h2>{view.title}</h2></div>
            <p className="scene-lesson" key={view.id} aria-live="polite">{view.lesson}</p>
            {external && view.presentation && <div className="scene-context-row">{locator && <button className="scene-context-link" onClick={() => changeView(manifest.views.findIndex(item => item.id === 'heart'))} aria-label="Locate this view in the whole heart"><img src={locator.thumb} alt="" /><span>Whole-heart context ↗</span></button>}<p className="scene-view-caption"><strong>{view.presentation.regionLabel}</strong> · {view.presentation.representation === 'representative-section' ? 'Representative section' : 'Representative view'} · {view.presentation.directionCaption}</p></div>}
            {external && selected && !selectedAnnotation && <p className="scene-selection-unavailable" role="status">{selectedDefinition?.label ?? 'Selected landmark'} is unavailable in this view or state. Your selection is retained.</p>}
            {external && <details className="scene-mobile-explanation"><summary>About this view and pose</summary><p>{view.lesson}</p>{state?.note && <p>{state.note}</p>}</details>}
            <p className="scene-design-summary">{manifest.designs.length > 1 && <strong>{design.label}. </strong>}{design.summary}</p>
            {availableStates.length > 1 && <div className="scene-state-bar">{external && <label className="scene-mobile-state">Pose <select aria-label="Valve and clip pose" value={activeState} aria-description={state?.note} onChange={event => { setStateId(event.target.value); if (compareId === event.target.value) setCompareId(activeState); }}>{availableStates.map(item => <option key={item.id} value={item.id}>{stateLabel(item, availableStates)}</option>)}</select></label>}<div className="scene-seg" role="group" aria-label="What to show">{availableStates.map(item => <button type="button" key={item.id} aria-pressed={item.id === activeState} className={item.id === activeState ? 'is-active' : ''} title={item.note} aria-description={item.note} onClick={() => { setStateId(item.id); if (!external) setSelected(null); if (compareId === item.id) setCompareId(activeState); }}>{stateLabel(item, availableStates)}</button>)}</div><button type="button" className={`scene-mode-toggle ${compareId ? 'is-active' : ''}`} aria-pressed={!!compareId} onClick={() => { setCompareId(compareId ? null : comparisonState(view.states, activeState)); setViewport(INITIAL_VIEWPORT); if (!external) setSelected(null); }}>Compare states</button>{compareId && <label className="scene-compare-select">Compare with <select value={compareId} onChange={event => setCompareId(event.target.value)}>{availableStates.filter(item => item.id !== activeState).map(item => <option key={item.id} value={item.id}>{stateLabel(item, availableStates)}</option>)}</select><span className="scene-comparison-note">Shared camera, zoom and position</span></label>}</div>}
            {state?.note && <p className="scene-state-note" aria-live="polite">{state.note}</p>}
            <div className={`scene-stage-wrap ${external ? 'has-external-annotations' : ''} ${compareImage ? 'is-comparing' : ''}`}>
              <div ref={stageRef} className={`scene-stage ${viewport.zoom > 1 ? 'is-zoomed' : ''}`} tabIndex={0} role="group" aria-label={`${view.label}, ${design.label}: illustration`} aria-describedby={stageDescriptionId} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onDoubleClick={event => { if ((event.target as HTMLElement).closest('button')) return; const rect = event.currentTarget.getBoundingClientRect(); const point = { x: (compareImage ? (event.clientX - rect.left) % (rect.width / 2) - rect.width / 4 : event.clientX - rect.left - rect.width / 2), y: event.clientY - rect.top - rect.height / 2 }; if (viewport.zoom > 1) setViewport(INITIAL_VIEWPORT); else applyZoom(2, point); }}>
                <div className="scene-primary-pane">{compareImage && <span className="scene-pair-label">{state && stateLabel(state, availableStates)}</span>}<div className="scene-canvas" style={{ width: canvas.width, height: canvas.height, transform: `translate(-50%, -50%) translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}>
                  <img key={loadKey} className={`scene-render ${imageStatus === 'loaded' ? 'is-loaded' : ''}`} src={url} alt={image.alt} draggable={false} onLoad={() => { if (activeLoadKey.current === loadKey) setImageState({ key: loadKey, state: 'loaded' }); }} onError={() => { if (activeLoadKey.current === loadKey) setImageState({ key: loadKey, state: 'error' }); }} />
                  {external && image.inset && !compareImage && <svg className="scene-inset-source" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x={image.inset.x*100} y={image.inset.y*100} width={image.inset.width*100} height={image.inset.height*100} /><text x={image.inset.x*100+1} y={image.inset.y*100+5}>A</text></svg>}
                  {!external && !compareImage && showPins && imageStatus === 'loaded' && annotations.map((annotation, annotationIndex) => <button key={annotation.id} className={`scene-pin ${selectedId === annotation.id ? 'is-selected' : ''}`} style={{ left: `${annotation.x * 100}%`, top: `${annotation.y * 100}%`, '--pin-color': annotation.color, transform: `translate(-50%, -50%) scale(${1 / viewport.zoom})` } as CSSProperties} aria-label={`${annotationIndex + 1}. ${annotation.label}`} aria-pressed={selectedId === annotation.id} onClick={event => { lastPinRef.current = event.currentTarget; chooseAnnotation(annotation.id); }}><span>{annotationIndex + 1}</span></button>)}
                </div>
                </div>
                {external && !compareImage && showPins && imageStatus === 'loaded' && <div className="scene-external-annotations">
                  <svg className="scene-external-leaders" width={size.width} height={size.height} aria-hidden="true">{callouts.map(callout => { const annotation = annotations.find(item => item.id === callout.id)!; return <g key={callout.id} className={selectedId === callout.id ? 'is-selected' : undefined} style={{ color: annotation.color }}><line x1={callout.side === 'left' ? callout.x + callout.width : callout.x} y1={callout.y + callout.height / 2} x2={callout.anchor.x} y2={callout.anchor.y} /><circle cx={callout.anchor.x} cy={callout.anchor.y} r={selectedId === callout.id ? 4 : 3} /></g>; })}</svg>
                  {callouts.map(callout => { const annotation = annotations.find(item => item.id === callout.id)!; return <button type="button" key={callout.id} className={`scene-external-label ${selectedId === callout.id ? 'is-selected' : ''}`} style={{ left: callout.x, top: callout.y, width: callout.width, height: callout.height }} aria-pressed={selectedId === callout.id} title={annotation.label} onClick={event => { lastPinRef.current = event.currentTarget; chooseAnnotation(callout.id); }}>{annotation.label}</button>; })}
                </div>}
                {compareImage && <div className="scene-comparison-pane"><span className="scene-pair-label">{comparison && stateLabel(comparison, availableStates)}</span><div className="scene-canvas" style={{ width: canvas.width, height: canvas.height, transform: `translate(-50%, -50%) translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}><img className="scene-render is-loaded" src={compareImage.src} alt={compareImage.alt} draggable={false} onError={() => setComparisonError(compareImage.src)} /></div>{comparisonError === compareImage.src && <div className="scene-image-error" role="alert"><strong>The comparison image could not load.</strong><button onClick={() => { setComparisonError(null); setCompareId(null); }}>Return to one image</button></div>}</div>}
                {imageStatus === 'loading' && <div className="scene-loading" role="status"><span className="scene-loader" />Loading view…</div>}
                {imageStatus === 'error' && <div className="scene-image-error" role="alert"><strong>This view could not load.</strong><p>Retry to load the local image.</p><button onClick={() => { setRetry(current => current + 1); }}>Retry image</button></div>}
              </div>
              {external && image.inset && !compareImage && <figure className="scene-interface-inset" aria-label="Magnified leaflet and clip region from the same view and pose"><figcaption>A · Interface detail</figcaption><svg viewBox={`${image.inset.x*2400} ${image.inset.y*1800} ${image.inset.width*2400} ${image.inset.height*1800}`} role="img" aria-label={`Magnified region: ${image.alt}`}><image href={url} width="2400" height="1800" /></svg><span>Same view and pose · magnified</span></figure>}
              <div className="scene-stage-top"><span className="scene-render-label">{manifest.stageLabel}</span></div>
              <div className="scene-compass" role="img" aria-label="Orientation: S indicates superior; R indicates patient right."><svg viewBox="-30 -30 60 60" aria-hidden="true"><circle cx="0" cy="0" r="2" />{([{ key: 'S', vector: view.orientation.superior }, { key: 'R', vector: view.orientation.patientRight }]).map(({ key, vector }) => <g key={key}><line x1="0" y1="0" x2={vector.x * 18} y2={vector.y * 18} /><text x={vector.x * 25} y={vector.y * 25 + 3}>{key}</text></g>)}</svg></div>
              {locator && !compareImage && <button className="scene-locator" onClick={() => changeView(manifest.views.findIndex(item => item.id === 'heart'))} aria-label="Locate this view in the whole heart"><img src={locator.thumb} alt="" /><span>Whole-heart context ↗</span></button>}
              <div className="scene-tools" aria-label="Image controls"><button aria-pressed={showPins} disabled={!!compareImage} onClick={() => setShowPins(!showPins)} className="scene-marker-toggle">Markers</button><button aria-label="Zoom out" disabled={viewport.zoom <= MIN_ZOOM} onClick={() => applyZoom(.8)}><Icon name="minus" /></button><output aria-label="Zoom level">{Math.round(viewport.zoom * 100)}%</output><button aria-label="Zoom in" disabled={viewport.zoom >= MAX_ZOOM} onClick={() => applyZoom(1.25)}><Icon name="plus" /></button><span className="scene-tool-divider" /><button className="scene-reset" onClick={() => setViewport(INITIAL_VIEWPORT)} aria-label="Reset zoom and position"><Icon name="reset" /><span>Reset</span></button></div>
              <p className="scene-stage-hint" id={stageDescriptionId}>Scroll to zoom · drag to move · select a marker<span className="scene-sr-only">. Use plus and minus to zoom, zero to reset, and arrow keys to pan. At fit, left and right change views.</span></p>
            </div>
            {annotations.length > 0 && <div className="scene-annotations"><div className="scene-chips" aria-label="Annotations">{annotations.map((annotation, annotationIndex) => <button type="button" key={annotation.id} aria-pressed={selectedId === annotation.id} className={`scene-chip-btn ${selectedId === annotation.id ? 'is-selected' : ''}`} onClick={event => { lastPinRef.current = event.currentTarget; chooseAnnotation(annotation.id); }}><span style={{ background: annotation.color }}>{annotationIndex + 1}</span>{annotation.label}</button>)}</div></div>}
            <div className="scene-legend" aria-label="Color key">{manifest.legend.map((item, i) => <span className="scene-legend-item" key={`${item.label}-${i}`}><i style={{ background: item.color }} />{item.label}</span>)}</div>
          </section>
          {selectedAnnotation && !info && <aside className="scene-panel" aria-label="Annotation detail"><div className="scene-panel-head"><span className="scene-detail-dot" style={{ background: selectedAnnotation.color }} /><h2 ref={detailRef} tabIndex={-1}>{selectedAnnotation.label}</h2><button type="button" className="scene-icon-btn" aria-label="Close annotation detail" onClick={closeDetail}><Icon name="close" /></button></div><span className="scene-fidelity" data-fidelity={selectedAnnotation.fidelity}>{FIDELITY[selectedAnnotation.fidelity]}</span><p>{selectedAnnotation.body}</p><p className="scene-panel-note">Select another marker to keep exploring.</p></aside>}
          {info && <aside className="scene-panel scene-model-info" aria-label="About these illustrations"><div className="scene-panel-head"><h2 ref={infoRef} tabIndex={-1}>About these illustrations</h2><button type="button" className="scene-icon-btn" aria-label="Close notes" onClick={closeInfo}><Icon name="close" /></button></div><p>{manifest.scope}</p><h3>Anatomy and image context</h3><p>Sources below describe the anatomy used for these illustrations. Anatomy details, device shapes and positions are representative schematics. They are not measured on a specific patient or population, and they do not establish product performance or clinical fit.</p><p>{manifest.attribution}</p><ol className="scene-sources">{manifest.sources.map(source => <li key={source.url}><a href={safeSourceURL(source.url)} target="_blank" rel="noreferrer">{source.title}<span aria-hidden="true"> ↗</span><span className="scene-sr-only"> (opens in a new tab)</span></a>{source.locator && <p>{source.locator}</p>}</li>)}</ol><h3>Keyboard and touch</h3><p>Use + and − to zoom and 0 to reset. Arrow keys move a zoomed view. At fit, left and right change views. Pinch to zoom on touch screens. Escape closes a detail, then the viewer.</p></aside>}
        </div>}
        <footer className="scene-footer">{plate ? <span>Schematic, representative illustration. Not to scale. No size, fit, sealing or safety claim.</span> : <><span>Schematic, representative illustrations. Not to scale.</span><span>No size, fit, sealing or safety claim.</span></>}</footer>
      </div>
    </div>
  </dialog>, document.body);
}
