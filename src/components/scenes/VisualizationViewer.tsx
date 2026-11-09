import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { imageKey } from './types';
import { comparisonState, locatorImage, stateLabel } from './selection';
import type { VisualizationManifest } from './types';
import { constrainViewport, fitCanvas, INITIAL_VIEWPORT, MAX_ZOOM, MIN_ZOOM, safeSourceURL, zoomAt } from './viewport';
import type { Size, Viewport } from './viewport';
import './viewer.css';

/** Scene assets live under public/scenes; resolve them against the deployed base path. */
const asset = (path?: string) => (path ? `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}` : '');

export type { VisualizationManifest } from './types';

interface Props { manifest: VisualizationManifest; onClose: () => void; returnLabel: string; returnFocusElement?: HTMLElement | null }
interface Point { x: number; y: number }
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const FIDELITY: Record<string, string> = { 'source-derived': 'Adapted from source anatomy', 'authored-schematic': 'Representative schematic', parametric: 'Representative shape' };

function Icon({ name }: { name: 'close' | 'back' | 'plus' | 'minus' | 'reset' | 'info' | 'left' | 'right' }) {
  const paths = { close: 'm6 6 12 12M18 6 6 18', back: 'm14 5-7 7 7 7M7 12h14', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', reset: 'M4 10a8 8 0 1 1 1 8M4 4v6h6', info: 'M12 11v6M12 7h.01', left: 'm15 5-7 7 7 7', right: 'm9 5 7 7-7 7' };
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name === 'info' && <circle cx="12" cy="12" r="9" />}<path d={paths[name]} /></svg>;
}

export default function VisualizationViewer({ manifest, onClose, returnLabel, returnFocusElement }: Props) {
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
  const [showPins, setShowPins] = useState(true);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT);
  const [size, setSize] = useState<Size>({ width: 1, height: 1 });
  const [retry, setRetry] = useState(0);
  const [imageState, setImageState] = useState<{ key: string; state: 'loading' | 'loaded' | 'error' }>({ key: '', state: 'loading' });
  const view = manifest.views[index] ?? manifest.views[0];
  const design = manifest.designs.find(item => item.id === designId) ?? manifest.designs[0];
  // A view offers only some states. Keep the reader's state where it exists.
  const activeState = view.states.includes(stateId) ? stateId : view.states[0];
  const state = manifest.states.find(item => item.id === activeState);
  const image = manifest.images[imageKey(design.id, view.id, activeState)];
  const url = asset(image?.src);
  const loadKey = `${url}:${retry}`;
  const activeLoadKey = useRef(loadKey);
  activeLoadKey.current = loadKey;
  const imageStatus = imageState.key === loadKey ? imageState.state : 'loading';
  const compareImage = compareId ? manifest.images[imageKey(design.id, view.id, compareId)] : undefined;
  const comparison = manifest.states.find(item => item.id === compareId);
  const panelSize = compareImage ? { ...size, width: size.width / 2 } : size;
  const canvas = fitCanvas(panelSize);
  const locator = view.id !== 'heart' ? locatorImage(manifest, design.id) : undefined;
  const annotations = (image?.pins ?? []).map(pin => ({ ...manifest.annotations[pin.id], ...pin }));
  const selectedAnnotation = annotations.find(annotation => annotation.id === selected);
  const safeClose = useRef(onClose);
  safeClose.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = returnFocusElement ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (dialog && !dialog.open) dialog.showModal();
    closeRef.current?.focus();
    return () => {
      dialog?.close();
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
      setViewport(current => constrainViewport(current, fitCanvas(compareId ? { ...nextSize, width: nextSize.width / 2 } : nextSize), compareId ? { ...nextSize, width: nextSize.width / 2 } : nextSize));
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [compareId]);

  const closeDetail = useCallback(() => {
    setSelected(null);
    lastPinRef.current?.focus({ preventScroll: true });
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
  useEffect(() => { if (selected && !annotations.some(annotation => annotation.id === selected)) setSelected(null); }, [loadKey]);

  useEffect(() => { if (info) infoRef.current?.focus({ preventScroll: true }); }, [info]);

  useEffect(() => {
    setCompareId(null);
    setSelected(null);
    setViewport(INITIAL_VIEWPORT);
    pointers.current.clear();
    pinch.current = null;
  }, [view.id, design.id]);

  const changeView = (next: number, focusTab = false) => {
    const value = (next + manifest.views.length) % manifest.views.length;
    setIndex(value);
    setSelected(null);
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
  }, [size, compareId]);

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

  return createPortal(<dialog ref={dialogRef} className="scene-viewer" aria-labelledby={titleId} onKeyDown={onKeyDown} onCancel={event => { event.preventDefault(); if (info) closeInfo(); else if (selected) closeDetail(); else onClose(); }}>
    <div className="scene-shell">
      <header className="scene-header">
        <div className="scene-header-start"><span className="scene-wordmark" aria-hidden="true">VISUALIZE<span>·SH</span></span><span className="scene-header-sub">Structural heart intelligence</span></div>
        <div className="scene-header-tools">
          <button ref={infoButtonRef} type="button" className={`scene-text-btn ${info ? 'is-active' : ''}`} onClick={() => info ? closeInfo() : setInfo(true)} aria-expanded={info} aria-label="About these illustrations"><Icon name="info" /><span>About these illustrations</span></button>
          <button ref={closeRef} type="button" className="scene-text-btn scene-back" onClick={onClose} aria-label={`Close visualization and return to ${returnLabel}`}><Icon name="back" /><span>Back to Data</span></button>
        </div>
      </header>
      <div className="scene-body">
        <div className="scene-page-head">
          <div className="scene-title"><h1 id={titleId}>{manifest.title}</h1><span className="scene-badge">{manifest.status}</span></div>
          {manifest.designs.length > 1 && <div className="scene-pill-switch" role="group" aria-label="Device design">{manifest.designs.map(item => <button type="button" key={item.id} aria-pressed={item.id === design.id} className={item.id === design.id ? 'is-active' : ''} onClick={() => { setDesignId(item.id); setSelected(null); }}>{item.label}</button>)}</div>}
        </div>
        <div className="scene-tabbar">
          <div className="scene-tabs" role="tablist" aria-label="Choose a view" aria-orientation="horizontal">
            {manifest.views.map((item, itemIndex) => <button type="button" key={item.id} role="tab" id={`${titleId}-tab-${itemIndex}`} aria-selected={index === itemIndex} aria-controls={`${titleId}-panel`} tabIndex={index === itemIndex ? 0 : -1} data-view-index={itemIndex} className={`scene-view-tab ${index === itemIndex ? 'is-active' : ''}`} onClick={() => changeView(itemIndex)}>{item.label}</button>)}
          </div>
          <div className="scene-step-buttons"><span className="scene-step-count" aria-hidden="true">{index + 1} / {manifest.views.length}</span><button type="button" className="scene-icon-btn" aria-label="Previous view" onClick={() => changeView(index - 1)}><Icon name="left" /></button><button type="button" className="scene-icon-btn" aria-label="Next view" onClick={() => changeView(index + 1)}><Icon name="right" /></button></div>
        </div>
        <div className={`scene-workspace ${(selectedAnnotation && !info) || info ? 'has-aside' : ''}`}>
          <section className="scene-main" role="tabpanel" id={`${titleId}-panel`} aria-labelledby={`${titleId}-tab-${index}`}>
            <div className="scene-view-heading"><h2>{view.title}</h2></div>
            <p className="scene-lesson" key={view.id} aria-live="polite">{view.lesson}</p>
            <p className="scene-design-summary">{manifest.designs.length > 1 && <strong>{design.label}. </strong>}{design.summary}</p>
            {availableStates.length > 1 && <div className="scene-state-bar"><div className="scene-seg" role="group" aria-label="What to show">{availableStates.map(item => <button type="button" key={item.id} aria-pressed={item.id === activeState} className={item.id === activeState ? 'is-active' : ''} title={item.note} aria-description={item.note} onClick={() => { setStateId(item.id); setSelected(null); if (compareId === item.id) setCompareId(activeState); }}>{stateLabel(item, availableStates)}</button>)}</div><button type="button" className={`scene-mode-toggle ${compareId ? 'is-active' : ''}`} aria-pressed={!!compareId} onClick={() => { setCompareId(compareId ? null : comparisonState(view.states, activeState)); setViewport(INITIAL_VIEWPORT); setSelected(null); }}>Compare states</button>{compareId && <label className="scene-compare-select">Compare with <select value={compareId} onChange={event => setCompareId(event.target.value)}>{availableStates.filter(item => item.id !== activeState).map(item => <option key={item.id} value={item.id}>{stateLabel(item, availableStates)}</option>)}</select><span className="scene-comparison-note">Shared camera, zoom and position</span></label>}</div>}
            {state?.note && <p className="scene-state-note" aria-live="polite">{state.note}</p>}
            <div className={`scene-stage-wrap ${compareImage ? 'is-comparing' : ''}`}>
              <div ref={stageRef} className={`scene-stage ${viewport.zoom > 1 ? 'is-zoomed' : ''}`} tabIndex={0} role="group" aria-label={`${view.label}, ${design.label}: illustration`} aria-describedby={stageDescriptionId} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onDoubleClick={event => { if ((event.target as HTMLElement).closest('button')) return; const rect = event.currentTarget.getBoundingClientRect(); const point = { x: (compareImage ? (event.clientX - rect.left) % (rect.width / 2) - rect.width / 4 : event.clientX - rect.left - rect.width / 2), y: event.clientY - rect.top - rect.height / 2 }; if (viewport.zoom > 1) setViewport(INITIAL_VIEWPORT); else applyZoom(2, point); }}>
                <div className="scene-primary-pane">{compareImage && <span className="scene-pair-label">{state && stateLabel(state, availableStates)}</span>}<div className="scene-canvas" style={{ width: canvas.width, height: canvas.height, transform: `translate(-50%, -50%) translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}>
                  <img key={loadKey} className={`scene-render ${imageStatus === 'loaded' ? 'is-loaded' : ''}`} src={url} alt={image.alt} draggable={false} onLoad={() => { if (activeLoadKey.current === loadKey) setImageState({ key: loadKey, state: 'loaded' }); }} onError={() => { if (activeLoadKey.current === loadKey) setImageState({ key: loadKey, state: 'error' }); }} />
                  {!compareImage && showPins && imageStatus === 'loaded' && annotations.map((annotation, annotationIndex) => <button key={annotation.id} className={`scene-pin ${selected === annotation.id ? 'is-selected' : ''}`} style={{ left: `${annotation.x * 100}%`, top: `${annotation.y * 100}%`, '--pin-color': annotation.color, transform: `translate(-50%, -50%) scale(${1 / viewport.zoom})` } as CSSProperties} aria-label={`${annotationIndex + 1}. ${annotation.label}`} aria-pressed={selected === annotation.id} onClick={event => { lastPinRef.current = event.currentTarget; setSelected(annotation.id); setInfo(false); }}><span>{annotationIndex + 1}</span></button>)}
                </div>
                </div>
                {compareImage && <div className="scene-comparison-pane"><span className="scene-pair-label">{comparison && stateLabel(comparison, availableStates)}</span><div className="scene-canvas" style={{ width: canvas.width, height: canvas.height, transform: `translate(-50%, -50%) translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}><img className="scene-render is-loaded" src={asset(compareImage.src)} alt={compareImage.alt} draggable={false} onError={() => setComparisonError(compareImage.src)} /></div>{comparisonError === compareImage.src && <div className="scene-image-error" role="alert"><strong>The comparison image could not load.</strong><button onClick={() => { setComparisonError(null); setCompareId(null); }}>Return to one image</button></div>}</div>}
                {imageStatus === 'loading' && <div className="scene-loading" role="status"><span className="scene-loader" />Loading view…</div>}
                {imageStatus === 'error' && <div className="scene-image-error" role="alert"><strong>This view could not load.</strong><p>Retry to load the local image.</p><button onClick={() => { setRetry(current => current + 1); }}>Retry image</button></div>}
              </div>
              <div className="scene-stage-top"><span className="scene-render-label">{manifest.stageLabel}</span></div>
              <div className="scene-compass" role="img" aria-label="Orientation: S indicates superior; R indicates patient right."><svg viewBox="-30 -30 60 60" aria-hidden="true"><circle cx="0" cy="0" r="2" />{([{ key: 'S', vector: view.orientation.superior }, { key: 'R', vector: view.orientation.patientRight }]).map(({ key, vector }) => <g key={key}><line x1="0" y1="0" x2={vector.x * 18} y2={vector.y * 18} /><text x={vector.x * 25} y={vector.y * 25 + 3}>{key}</text></g>)}</svg></div>
              {locator && !compareImage && <button className="scene-locator" onClick={() => changeView(manifest.views.findIndex(item => item.id === 'heart'))} aria-label="Locate this view in the whole heart"><img src={asset(locator.thumb)} alt="" /><span>Whole-heart context ↗</span></button>}
              <div className="scene-tools" aria-label="Image controls"><button aria-pressed={showPins} disabled={!!compareImage} onClick={() => setShowPins(!showPins)} className="scene-marker-toggle">Markers</button><button aria-label="Zoom out" disabled={viewport.zoom <= MIN_ZOOM} onClick={() => applyZoom(.8)}><Icon name="minus" /></button><output aria-label="Zoom level">{Math.round(viewport.zoom * 100)}%</output><button aria-label="Zoom in" disabled={viewport.zoom >= MAX_ZOOM} onClick={() => applyZoom(1.25)}><Icon name="plus" /></button><span className="scene-tool-divider" /><button className="scene-reset" onClick={() => setViewport(INITIAL_VIEWPORT)} aria-label="Reset zoom and position"><Icon name="reset" /><span>Reset</span></button></div>
              <p className="scene-stage-hint" id={stageDescriptionId}>Scroll to zoom · drag to move · select a marker<span className="scene-sr-only">. Use plus and minus to zoom, zero to reset, and arrow keys to pan. At fit, left and right change views.</span></p>
            </div>
            {annotations.length > 0 && <div className="scene-annotations"><div className="scene-chips" aria-label="Annotations">{annotations.map((annotation, annotationIndex) => <button type="button" key={annotation.id} aria-pressed={selected === annotation.id} className={`scene-chip-btn ${selected === annotation.id ? 'is-selected' : ''}`} onClick={event => { lastPinRef.current = event.currentTarget; setSelected(annotation.id); setInfo(false); }}><span style={{ background: annotation.color }}>{annotationIndex + 1}</span>{annotation.label}</button>)}</div></div>}
            <div className="scene-legend" aria-label="Color key">{manifest.legend.map((item, i) => <span className="scene-legend-item" key={`${item.label}-${i}`}><i style={{ background: item.color }} />{item.label}</span>)}</div>
          </section>
          {selectedAnnotation && !info && <aside className="scene-panel" aria-label="Annotation detail"><div className="scene-panel-head"><span className="scene-detail-dot" style={{ background: selectedAnnotation.color }} /><h2 ref={detailRef} tabIndex={-1}>{selectedAnnotation.label}</h2><button type="button" className="scene-icon-btn" aria-label="Close annotation detail" onClick={closeDetail}><Icon name="close" /></button></div><span className="scene-fidelity" data-fidelity={selectedAnnotation.fidelity}>{FIDELITY[selectedAnnotation.fidelity]}</span><p>{selectedAnnotation.body}</p><p className="scene-panel-note">Select another marker to keep exploring.</p></aside>}
          {info && <aside className="scene-panel scene-model-info" aria-label="About these illustrations"><div className="scene-panel-head"><h2 ref={infoRef} tabIndex={-1}>About these illustrations</h2><button type="button" className="scene-icon-btn" aria-label="Close notes" onClick={closeInfo}><Icon name="close" /></button></div><p>{manifest.scope}</p><h3>Anatomy and image context</h3><p>Sources below describe the anatomy used for these illustrations. Anatomy details, device shapes and positions are representative schematics. They are not measured on a specific patient or population, and they do not establish product performance or clinical fit.</p><p>{manifest.attribution}</p><ol className="scene-sources">{manifest.sources.map(source => <li key={source.url}><a href={safeSourceURL(source.url)} target="_blank" rel="noreferrer">{source.title}<span aria-hidden="true"> ↗</span><span className="scene-sr-only"> (opens in a new tab)</span></a>{source.locator && <p>{source.locator}</p>}</li>)}</ol><h3>Keyboard and touch</h3><p>Use + and − to zoom and 0 to reset. Arrow keys move a zoomed view. At fit, left and right change views. Pinch to zoom on touch screens. Escape closes a detail, then the viewer.</p></aside>}
        </div>
        <footer className="scene-footer"><span>Schematic, representative illustrations. Not to scale.</span><span>No size, fit, sealing or safety claim.</span></footer>
      </div>
    </div>
  </dialog>, document.body);
}
