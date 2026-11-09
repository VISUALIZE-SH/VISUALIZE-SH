export interface Vector2 { x: number; y: number }

export interface SceneAnnotation {
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
}

export interface SceneDesign { id: string; label: string; summary: string }
export interface SceneState { id: string; label: string; note?: string }

export interface SceneView {
  id: string;
  label: string;
  title: string;
  lesson: string;
  states: string[];
  orientation: { superior: Vector2; patientRight: Vector2 };
}

export interface VisualizationManifest {
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
