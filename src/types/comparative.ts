/** Authored configuration observations; shape is validated by the comparative schema. */
export interface ComparativeConfiguration {
  configuration_id: string
  product_version_id: string
  device_family_id: string
  generation: string
  configuration_label: string
  therapy_class: string
  target_structure: string
  mechanism: string
  delivery?: {
    route: string
    component?: 'delivery_capsule' | 'sheath' | 'introducer' | 'guide_catheter' | 'other'
    profile_fr?: number
    profile_definition?: string
    minimum_vessel_diameter_mm?: number
  }
  design?: Record<string, string | boolean>
  labeled_anatomy_fit?: string[]
}

export interface ComparativeMetric {
  metric_id: string
  display_name: string
  module: string
  value_kind: 'numeric' | 'ordinal' | 'categorical' | 'boolean' | 'text'
  canonical_unit?: string
  applicable_to: string[]
  required_context: string[]
  default_comparability: 'direct' | 'conditional' | 'within_family_only' | 'not_comparable'
  definition_note?: string
}

export type ComparativeStatus = 'reported' | 'tested_not_publicly_disclosed' | 'not_reported' | 'not_extracted' | 'not_applicable' | 'conflicting_sources'
export type Comparability = 'direct' | 'conditional' | 'within_family_only' | 'not_comparable'
export interface ComparativeObservation {
  observation_id: string
  configuration_id: string
  metric_id: string
  module: string
  measurement_status: ComparativeStatus
  value?: string | number | boolean
  unit?: string
  statistic?: string
  comparability: Comparability
  comparability_rationale: string
  method: { modality: string; protocol_or_grading_standard: string; conditions_summary: string; conditions?: Record<string, string | number | boolean | null> }
  timepoint: { label: string; phase: string }
  context: { setting: string; target_structure: string; anatomy_or_model: string; cohort_or_sample: string; configuration_context?: string }
  provenance: { source_type: string; url: string; locator: string; extracted_on: string; review_status: 'unreviewed' | 'verified' | 'published' | 'needs_resolution' }
}

export interface ComparativeDataset {
  schema_version: 1
  device_configurations: ComparativeConfiguration[]
  metric_definitions: ComparativeMetric[]
  observations: ComparativeObservation[]
}
