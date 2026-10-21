// TypeScript types mirroring the YAML data schema (schema/*.schema.json) and the
// compiled graph (public/graph.json). Keep these in sync with the JSON Schemas —
// the JSON Schemas are the runtime guardrail; these are the compile-time contract.

export type EntityType = 'condition' | 'therapy' | 'company' | 'trial'

export type TherapyType = 'pharmaceutical' | 'device' | 'digital' | 'procedure'

export type RegulatoryStatus = 'approved' | 'investigational' | 'discontinued' | 'unknown'
export type LifecycleStatus = 'halted' | 'retired' | 'recalled'

/** The registry's overall status as the registry states it; not whether results are reported. */
export type TrialStatus =
  | 'not-yet-recruiting'
  | 'recruiting'
  | 'active'
  | 'completed'
  | 'suspended'
  | 'terminated'
  | 'unknown'

export type PrimaryAnalysisStatus = 'reported' | 'not-reported'

/** Whether the primary-endpoint analysis has been reported, independent of registry status. */
export interface PrimaryAnalysis {
  status: PrimaryAnalysisStatus
  /** ISO date of the report; first day of the period when `precision` is month or year. */
  date?: string
  /** Required with `date`. */
  precision?: TimelinePrecision
  /** Public HTTPS source; required when `status` is `reported`. */
  source?: string
}

export type EnrollmentBasis = 'estimated' | 'actual' | 'randomized' | 'analyzed' | 'treated'

export interface EnrollmentCount {
  count: number
  basis: EnrollmentBasis
  asOf?: string
  /** What the count covers or excludes, e.g. "excludes roll-in". */
  scope?: string
  source: string
}

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

export type DeviceMaterialCategory =
  | 'frame'
  | 'leaflet'
  | 'fabric'
  | 'coating'
  | 'sensor'
  | 'anchor'

/** A clinically meaningful implanted material, including a bioabsorbable implant.
 *  Delivery-system plastics, incidental sutures, trace constituents, and other incidental materials are
 *  intentionally excluded. */
export interface DeviceMaterial {
  name: string
  role: string
  category: DeviceMaterialCategory
  source: string
  note?: string
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
  lifecycleStatus?: LifecycleStatus
  lifecycleDetail?: string
  regulatoryDetail?: string
  mechanism?: string
  description?: string
  /** Key permanent-implant materials for device therapies, with evidence. */
  materials?: DeviceMaterial[]
  /** Reviewed composition gap; approval does not establish a material. */
  materialsStatus?: 'not_established'
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
  /** Registry overall status; see `primaryAnalysis` for whether results are reported. */
  status?: TrialStatus
  primaryAnalysis?: PrimaryAnalysis
  lifecycleStatus?: LifecycleStatus
  lifecycleDetail?: string
  conditions: string[]
  therapies: string[]
  /** Legacy headline count with unspecified basis; superseded by `enrollmentCounts` when present. */
  enrollment?: number
  enrollmentCounts?: EnrollmentCount[]
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
// News (authored in data/news.yaml and compiled into public/graph.json)
// ---------------------------------------------------------------------------

/** Authored presentation category, independent of review status. */
export type NewsContentType = 'news' | 'news-insights' | 'editorial'

/** A source-linked news item connected to one or more graph entities. */
export interface NewsItem {
  /** Stable, date-prefixed kebab-case id; never reuse an id for a different story. */
  id: string
  /** ISO publication date (YYYY-MM-DD), used to order the news feed. */
  publishedAt: string
  /** Source-supported date correction; previousPublishedAt is the former stored value. ID stays stable. */
  publicationDateCorrection?: { previousPublishedAt: string; reason: string; sourceUrl: string }
  title: string
  /** Concise, plain-language summary for the feed and detail panel. */
  summary: string
  sourceName: string
  sourceUrl: string
  /** Explicit presentation category. Omitted means ordinary, unbadged news. */
  contentType?: NewsContentType
  /** Draft items remain local and are omitted from public graph and digest output. */
  reviewStatus?: 'draft' | 'reviewed'
  lifecycleStatus?: LifecycleStatus
  /** Corroborating coverage for the same event; the primary source stays above. */
  additionalSources?: InfoLink[]
  /** Controlled loosely in authoring; suitable for feed filtering and display. */
  topicTags: string[]
  /** Existing graph entity ids to focus when this item is selected. */
  relevantNodeIds: string[]
}

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

export type EvidenceRelationship = 'treats' | 'used_in' | 'investigated_for' | 'invested_in' | 'acquired' | 'option_to_acquire' | 'portfolio_includes' | 'terminated_acquisition'
export type EdgeRelationship = 'treats' | 'made_by' | 'evaluates' | 'studies' | EvidenceRelationship

/** Additional edges retain their own review state and exact documentary scope. */
export interface SourcedRelationship {
  id: string
  source: string
  target: string
  relationship: EvidenceRelationship
  scope: string
  /** Precision is encoded by YYYY, YYYY-MM, or YYYY-MM-DD. Omit unknown dates. */
  eventDate?: string
  notes?: string
  curation: Curation
  sources: Array<{
    url: string
    title: string
    publisher: string
    publishedAt?: string
    retrievedAt: string
    access: 'public' | 'licensed'
    sourceType: 'regulator' | 'registry' | 'publication' | 'filing' | 'company' | 'investor' | 'patent-office'
    locator: string
  }>
}

export interface GraphNodeData {
  id: string
  label: string
  group: NodeGroup
  /** Original entity category (conditions) or therapy subtype — used for filters. */
  category?: string
  isDraft: boolean
  /** Clinical or product lifecycle flags used for Atlas safety/status styling. */
  isHalted?: boolean
  isRetired?: boolean
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
  isDraft?: boolean
  evidence?: SourcedRelationship
}

export interface GraphMeta {
  generatedAt: string
  /** Most recent curation.lastUpdated across all entities. */
  lastUpdated: string
  counts: Record<NodeGroup, number>
  draftCount: number
  total: number
  /** Number of validated news items included in this graph payload. */
  newsCount: number
  /** Most recent news publication date, or undefined when no news is present. */
  latestNewsDate?: string
}

export interface GraphData {
  meta: GraphMeta
  /** Reverse-chronological, validated news feed. */
  news: NewsItem[]
  elements: {
    nodes: { data: GraphNodeData }[]
    edges: { data: GraphEdgeData }[]
  }
}
