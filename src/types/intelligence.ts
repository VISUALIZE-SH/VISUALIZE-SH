/** Source-linked evidence layer. Legacy graph IDs remain the navigation crosswalk. */
import type { ComparativeDataset } from './comparative'
export type ReviewStatus = 'draft' | 'reviewed'
export type Availability = 'reported' | 'not_publicly_disclosed' | 'not_yet_reviewed' | 'not_applicable' | 'conflicting'
export type EvidenceBasis = 'directly_reported' | 'derived' | 'analyst_interpretation'
export type ClinicalRole = 'treats' | 'manages' | 'detects' | 'plans' | 'monitors'
export interface EvidenceDate { value: string; precision: 'day' | 'month' | 'year' }
export interface SourceRef { sourceId: string; locator: string }
export interface Provenance { sourceRefs: SourceRef[]; reviewStatus: ReviewStatus }

export interface SourceDocument {
  id: string
  title: string
  url: string
  kind: 'regulatory' | 'registry' | 'publication' | 'manufacturer' | 'technical' | 'other'
  publisher: string
  publishedAt?: EvidenceDate
  retrievedAt: string
  access: 'public' | 'licensed'
  identifier?: string
  /** Locally cached public documents only; licensed full text is never shipped. */
  snapshotPath?: string
  sha256?: string
}

export interface ProductFamily {
  id: string
  name: string
  manufacturer: string
  entityIds: string[]
  conditionIds: string[]
  description: string
}

export interface ProductVersion extends Provenance {
  id: string
  familyId: string
  name: string
  kind: 'device' | 'digital' | 'pharmaceutical' | 'procedure'
  clinicalRole: ClinicalRole
  model?: string
  softwareVersion?: string
  digitalSubtype?: 'therapeutic' | 'care_delivery' | 'diagnostic' | 'planning' | 'monitoring'
  summary: string
}

export type ComparisonValueType = 'text' | 'number' | 'boolean'
export type ComparisonScope = 'version_wide' | 'configuration' | 'jurisdiction'
export interface ComparisonCategory {
  id: string
  label: string
  /** Display order in Data; lower first. */
  order?: number
  conditionId: string
  versionKind: ProductVersion['kind']
  therapyClass: string
  targetStructure: string
  mechanism: string
  versionIds: string[]
}
export interface StandardAttribute {
  id: string
  label: string
  section: string
  order: number
  valueType: ComparisonValueType
  scope: ComparisonScope
  categoryIds: string[]
}

export interface EvidenceClaim extends Provenance {
  id: string
  versionId: string
  category: 'design' | 'fit' | 'evidence' | 'evolution' | 'digital'
  key: string
  label: string
  value?: string | number | boolean
  unit?: string
  availability: Availability
  basis: EvidenceBasis
  /** Model/size, test conditions, tissue state, software configuration, etc. */
  context?: string
  limitation?: string
  observedAt: string
  comparisonAttributeId?: string
}

export interface RegulatoryDecision extends Provenance {
  id: string
  identifier: string
  rootIdentifier: string
  jurisdiction: string
  pathway: 'PMA' | '510(k)' | 'De Novo' | 'HDE' | 'NDA' | 'BLA' | 'other'
  date: EvidenceDate
  versionIds: string[]
  changeType: 'initial_authorization' | 'indication' | 'labeling' | 'design' | 'manufacturing' | 'software' | 'other'
  summary: string
}

export interface IndicationVersion extends Provenance {
  id: string
  decisionId: string
  versionIds: string[]
  jurisdiction: string
  effectiveDate: EvidenceDate
  /** Exact text must only be used when transcribed and source-located. */
  text: string
  textType: 'verbatim' | 'paraphrase'
  population: string
  anatomy?: string
  restrictions?: string
  supersedesId?: string
}

export interface EvidenceTrial extends Provenance {
  id: string
  name: string
  nctId?: string
  entityId?: string
  /** Family discovery does not attribute an outcome to a particular generation. */
  familyIds?: string[]
  design: string
  /** Empty when an exact generation has not been established. */
  versionIds: string[]
  versionMapping: 'exact' | 'mixed' | 'unclear'
  population: string
}

export interface TrialSnapshot extends Provenance {
  id: string
  trialId: string
  observedAt: string
  registryUpdatedAt?: string
  status: string
  enrollment: { value: number; basis: 'estimated' | 'actual'; scope: string }
  note?: string
}

export interface TrialCohort extends Provenance {
  id: string
  trialId: string
  name: string
  population: string
  enrollment: { value: number; stage: 'target' | 'screened' | 'randomized' | 'treated' | 'analyzed'; note?: string }[]
  arms: { id: string; name: string; randomized?: number }[]
}

export interface EndpointDefinition extends Provenance {
  id: string
  name: string
  definition: string
  hierarchy: 'primary' | 'secondary' | 'exploratory' | 'component' | 'not_reported'
  measureType: 'binary' | 'continuous' | 'time_to_event' | 'rate' | 'hierarchical' | 'count'
  timeframe: string
  analysisPopulation: string
  standard?: string
}

export interface TrialReadout extends Provenance {
  id: string
  trialId: string
  cohortId: string
  title: string
  publishedAt: EvidenceDate
  followUp: string
  maturity: 'interim' | 'primary' | 'follow_up'
  versionIds: string[]
  limitation?: string
}

export interface OutcomeObservation extends Provenance {
  id: string
  readoutId: string
  endpointId: string
  arms: { armId: string; value: number; unit: string; denominator?: number }[]
  effect?: { measure: string; value: number; unit?: string; ci?: { lower?: number; upper?: number; level?: number; sidedness: 'one_sided' | 'two_sided' } }
  pValue?: number
  pValueQualifier?: '=' | '<' | '>'
  interpretation: string
  limitation?: string
}

export type LineageRelationship = 'succeeds' | 'derived_from' | 'uses_component' | 'compatible_with' | 'predicate_for' | 'evidence_bridged_to'
export interface LineageEdge extends Provenance {
  id: string
  fromVersionId: string
  toVersionId: string
  relationship: LineageRelationship
  explanation: string
}

export interface IntelligenceEvent extends Provenance {
  id: string
  title: string
  eventDate: EvidenceDate
  publishedAt: EvidenceDate
  discoveredAt: string
  kind: 'design' | 'indication' | 'labeling' | 'manufacturing' | 'software' | 'evidence'
  versionIds: string[]
  decisionIds: string[]
  readoutIds: string[]
  before: string
  after: string
  whyItMatters: string
  uncertainty: string
}

/** A reviewed, locally served rendition of a cited public-document page or figure. */
export type EvidenceMediaPanel = 'design' | 'fit' | 'function' | 'action' | 'workflow'

export interface EvidenceMedia extends Provenance {
  id: string
  /** A figure may be relevant to more than one explicitly named configuration. */
  versionIds: string[]
  panel: EvidenceMediaPanel
  title: string
  caption: string
  /** Text alternative describes the visual itself, not only its source document. */
  alt: string
  /** Root-relative, locally served image path (for example /evidence/fda/foo-page-4.png). */
  assetPath: string
  /** Original document page when the rendition came from a paginated source. */
  page?: number
  /** Source-authored figure/table label, if present. */
  figure?: string
  /** Optional normalized coordinates of the extraction within the source page. */
  crop?: { x: number; y: number; width: number; height: number }
}

export interface IntelligenceData {
  schemaVersion: 1
  updatedAt: string
  coverage: { title: string; description: string }
  sources: SourceDocument[]
  families: ProductFamily[]
  versions: ProductVersion[]
  comparisonCategories?: ComparisonCategory[]
  standardAttributes?: StandardAttribute[]
  comparative?: ComparativeDataset
  claims: EvidenceClaim[]
  decisions: RegulatoryDecision[]
  indications: IndicationVersion[]
  trials: EvidenceTrial[]
  trialSnapshots: TrialSnapshot[]
  cohorts: TrialCohort[]
  endpoints: EndpointDefinition[]
  readouts: TrialReadout[]
  outcomes: OutcomeObservation[]
  lineage: LineageEdge[]
  events: IntelligenceEvent[]
  /** Optional during the media-pipeline migration; consumers treat absence as an empty collection. */
  media?: EvidenceMedia[]
}

export type AppMode = 'news' | 'atlas' | 'data'
