export interface Vector2 { x: number; y: number }

export interface SceneAnnotation {
  landmarkId?: string;
  label: string;
  body: string;
  color: string;
  layer: 'device' | 'anatomy';
  fidelity: 'source-derived' | 'authored-schematic' | 'parametric';
}

export interface ScenePin { id: string; x: number; y: number }

export interface SceneImage {
  src: string;
  thumb: string;
  alt: string;
  /** Positions are normalized to the full 4:3 image and come from world anchors. */
  pins: ScenePin[];
  /** Magnified crop of this same still, normalized to its full 4:3 frame. */
  inset?: { x: number; y: number; width: number; height: number };
  /** Bounding box of non-transparent pixels, normalized to the full 4:3 image. */
  contentBox?: { x: number; y: number; width: number; height: number };
  /** Fingerprint of camera placement and cuts; paired designs must share it. */
  camera?: string;
  /** 1200x900 WebP of the same still for phones and small figures; `src` is the 2400w source. */
  mid?: string;
  /** Lossless 1200x900 PNG, same framing. Alpha 255 pixel = part index R + 256*G; alpha 0 = background. */
  partMap?: string;
  /** Per-label focus: parts[0] is the pointed-at part, the rest touching partners. */
  focus?: Record<string, FocusEntry>;
  /** Figure-key items for this still. */
  keys?: FigureKey[];
  /** Regional-view thumbnail with a ring at normalized (x, y), radius r as a fraction of its width. */
  locator?: ImageLocator;
  /** Horizontal reference level (normalized y) for design comparison. */
  reference?: { y: number; label?: string };
}
export type FigureKey = 'cut' | 'contact';
export interface NormalizedBox { x: number; y: number; width: number; height: number }
export interface FocusEntry { parts: number[]; ghost?: NormalizedBox & { src: string } }
export interface ImageLocator { src: string; x: number; y: number; r: number; view: string }

export interface SceneDesign { id: string; label: string; summary: string }
export interface DesignPair { designs: [string, string]; views: string[]; states: string[]; summary: string; /** Annotation ids shown in both panes. */ sharedLabels?: string[] }
export interface SceneState { id: string; label: string; note?: string }

export interface SceneView {
  presentation?: { directionCaption: string; representation: 'representative-section' | 'representative-view'; regionLabel: string };
  id: string;
  label: string;
  title: string;
  lesson: string;
  states: string[];
  orientation: { superior: Vector2; patientRight: Vector2 };
}

export interface VisualizationManifest {
  presentation?: {
    annotationMode: 'external';
    layout?: 'plate';
    labels?: Record<string, string>;
    hiddenLabels?: string[];
    stateLabels?: Record<string, string>;
    stateGroups?: { label: string; states: string[] }[];
    designComparison?: { pairs: DesignPair[] };
    /** Swatch colours for the figure key (the class's cut-wall tone). */
    keyColors?: Partial<Record<FigureKey, string>>;
  };
  classId: string;
  conditionId: string;
  title: string;
  linkLabel: string;
  status: string;
  scope: string;
  stageLabel: string;
  attribution: string;
  sources: { title: string; url: string; locator?: string }[];
  legend: { label: string; color: string }[];
  designs: SceneDesign[];
  states: SceneState[];
  views: SceneView[];
  annotations: Record<string, SceneAnnotation>;
  images: Record<string, SceneImage>;
}

export const imageKey = (design: string, view: string, state: string) => `${design}/${view}/${state}`;
