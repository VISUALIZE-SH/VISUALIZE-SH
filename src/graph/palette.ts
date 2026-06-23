// Single source of truth for node visual encoding (color + shape per group) and
// relationship labels. Used by both the Cytoscape stylesheet and the Legend so
// they never drift.
import type { NodeGroup, EdgeRelationship } from '../types/entities'

export interface GroupMeta {
  label: string
  color: string
  /** Cytoscape node shape name. */
  shape: string
}

// Categorical node palette — seven distinct, readable hues drawn from the brand
// palette (deep purple, lime, gold) plus the complements needed to tell seven
// groups apart. The two largest groups carry the signature accents: clinical
// trials are gold and devices are lime, so the graph reads purple + green + gold
// rather than monochrome. Saturated versions of the soft brand swatches are used
// so node fills stay legible on white. See DESIGN.md.
export const GROUP_META: Record<NodeGroup, GroupMeta> = {
  condition: { label: 'Condition / anatomy', color: '#7c1fb0', shape: 'ellipse' },
  device: { label: 'Device', color: '#5ba32b', shape: 'hexagon' },
  pharmaceutical: { label: 'Pharmaceutical', color: '#2f6fed', shape: 'round-rectangle' },
  procedure: { label: 'Procedure', color: '#ec7211', shape: 'round-triangle' },
  digital: { label: 'Digital therapy', color: '#d6249f', shape: 'diamond' },
  trial: { label: 'Clinical trial', color: '#eab308', shape: 'star' },
  company: { label: 'Company', color: '#64748b', shape: 'rectangle' },
}

/** Display order for legend + filter chips. */
export const GROUP_ORDER: NodeGroup[] = [
  'condition',
  'device',
  'pharmaceutical',
  'procedure',
  'digital',
  'trial',
  'company',
]

export const RELATIONSHIP_LABEL: Record<EdgeRelationship, string> = {
  treats: 'treats',
  made_by: 'made by',
  evaluates: 'evaluates',
  studies: 'studies',
}
