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

export const GROUP_META: Record<NodeGroup, GroupMeta> = {
  condition: { label: 'Condition / anatomy', color: '#e5484d', shape: 'ellipse' },
  device: { label: 'Device', color: '#12a594', shape: 'hexagon' },
  pharmaceutical: { label: 'Pharmaceutical', color: '#3e63dd', shape: 'round-rectangle' },
  procedure: { label: 'Procedure', color: '#f76b15', shape: 'round-triangle' },
  digital: { label: 'Digital therapy', color: '#8e4ec6', shape: 'diamond' },
  trial: { label: 'Clinical trial', color: '#f5a623', shape: 'star' },
  company: { label: 'Company', color: '#7c7f8a', shape: 'rectangle' },
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
