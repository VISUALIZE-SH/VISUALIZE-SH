// TypeScript types mirroring the YAML data schema (schema/*.schema.json) and the
// compiled graph (public/graph.json). Keep these in sync with the JSON Schemas —
// the JSON Schemas are the runtime guardrail; these are the compile-time contract.

export type EntityType = 'condition' | 'therapy' | 'company' | 'trial'

export type TherapyType = 'pharmaceutical' | 'device' | 'digital' | 'procedure'

export type RegulatoryStatus = 'approved' | 'investigational' | 'discontinued'

export type TrialStatus =
  | 'recruiting'
  | 'active'
  | 'completed'
  | 'terminated'
  | 'unknown'

export type ResultStatus =
  | 'positive'
  | 'mixed'
  | 'negative'
  | 'ongoing'
  | 'terminated'

export type CurationStatus = 'draft' | 'curated'

export interface Curation {
  status: CurationStatus
  lastUpdated: string
  sources?: string[]
  notes?: string
}

/** A labeled external link shown in the detail panel. */
export interface InfoLink {
  label: string
  url: string
}

export type TimelineDateBasis =
  | 'fda-approval'
  | 'ce-mark'
  | 'availability-announcement'
  | 'trial-start'

export type TimelinePrecision = 'day' | 'month' | 'year'

export interface TimelineEntry {
  /** ISO date used for timeline placement. See `precision` for display. */
  date: string
  /** Human-readable event shown in details and update reviews. */
  event: string
  /** Why this date belongs on the timeline. */
  dateBasis: TimelineDateBasis
  /** Whether day/month components are verified or placeholders for placement. */
  precision: TimelinePrecision
  /** Optional source URL for the date. */
  source?: string
  /** Optional notes for uncertain or availability-announcement dates. */
  notes?: string
}

export interface Condition {
  id: string
  type: 'condition'
  name: string
  abbreviation?: string
  category: string
  anatomy?: string[]
  description?: string
  /** Newsworthiness 0-10 (10 = most coverage). Drives label font size. */
  pulse?: number
  curation: Curation
}

export interface Therapy {
  id: string
  type: 'therapy'
  therapyType: TherapyType
  subtype?: string
  name: string
  company?: string
  treats: string[]
  regulatoryStatus: RegulatoryStatus
  regulatoryDetail?: string
  mechanism?: string
  description?: string
  /** External info links (product page / third-party clinical source). */
  links?: InfoLink[]
  /** Timeline placement date for product approval or availability. */
  timeline?: TimelineEntry
  /** Newsworthiness 0-10 (10 = most coverage). Drives label font size. */
  pulse?: number
  curation: Curation
}

export interface Company {
  id: string
  type: 'company'
  name: string
  ticker?: string
  hq?: string
  website?: string
  description?: string
  /** Newsworthiness 0-10 (10 = most coverage). Drives label font size. */
  pulse?: number
  curation: Curation
}

export interface Trial {
  id: string
  type: 'trial'
  name: string
  nctId?: string
  phase?: string
  status?: TrialStatus
  conditions: string[]
  therapies: string[]
  enrollment?: number
  year?: number
  primaryEndpoint?: string
  outcomeSummary?: string
  resultStatus: ResultStatus
  references?: string[]
  /** External outcome-summary links (non-ClinicalTrials.gov). */
  links?: InfoLink[]
  /** Timeline placement date for the trial start. */
  timeline?: TimelineEntry
  /** Newsworthiness 0-10 (10 = most coverage). Drives label font size. */
  pulse?: number
  curation: Curation
}

export type Entity = Condition | Therapy | Company | Trial

// ---------------------------------------------------------------------------
// Compiled graph (output of scripts/build-data.ts, consumed by the app)
// ---------------------------------------------------------------------------

/** Visual grouping that drives node color/shape. Merges type + therapyType. */
export type NodeGroup =
  | 'condition'
  | 'pharmaceutical'
  | 'device'
  | 'digital'
  | 'procedure'
  | 'company'
  | 'trial'

export type EdgeRelationship = 'treats' | 'made_by' | 'evaluates' | 'studies'

export interface GraphNodeData {
  id: string
  label: string
  group: NodeGroup
  /** Original entity category (conditions) or therapy subtype — used for filters. */
  category?: string
  isDraft: boolean
  degree: number
  /** Newsworthiness 0-10 (0 = unscored). Drives label font size in the graph. */
  pulse: number
  /** ISO date used by the timeline layout; absent for companies/undated entities. */
  timelineDate?: string
  entity: Entity
}

export interface GraphEdgeData {
  id: string
  source: string
  target: string
  relationship: EdgeRelationship
}

export interface GraphMeta {
  generatedAt: string
  /** Most recent curation.lastUpdated across all entities. */
  lastUpdated: string
  counts: Record<NodeGroup, number>
  draftCount: number
  total: number
}

export interface GraphData {
  meta: GraphMeta
  elements: {
    nodes: { data: GraphNodeData }[]
    edges: { data: GraphEdgeData }[]
  }
}
