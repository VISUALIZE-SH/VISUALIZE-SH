import type { GraphEdgeData, GraphNodeData } from '../types/entities'

/** Spell out condition hubs; the familiar heart-failure phenotypes stay compact. */
export function islandConditionLabel(node: GraphNodeData): string {
  if (node.entity.type === 'condition' && ['HFpEF', 'HFrEF'].includes(node.entity.abbreviation ?? '')) {
    return node.entity.abbreviation!
  }
  return node.label
}

/** Exact recorded memberships, never a traversal through trials or manufacturers. */
export function atlasTargetLabels(node: GraphNodeData, nodesById: Map<string, GraphNodeData>, edges: GraphEdgeData[]) {
  if (node.entity.type !== 'therapy') return { label: node.label, shared: false }
  const memberships = new Map<string, string>()
  for (const edge of edges) {
    if (edge.source !== node.id || !['treats', 'investigated_for'].includes(edge.relationship)) continue
    const target = nodesById.get(edge.target)
    if (target?.entity.type !== 'condition') continue
    const name = target.entity.abbreviation || target.label
    const suffix = edge.relationship === 'investigated_for' ? ' (study)' : edge.evidence ? '*' : ''
    // Prefer an existing treatment relationship when both types are recorded.
    if (!memberships.has(target.id) || edge.relationship === 'treats') memberships.set(target.id, name + suffix)
  }
  const labels = [...memberships.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, label]) => label)
  const shared = labels.length > 1
  return { label: shared || labels.some(label => label.includes('(study)') || label.endsWith('*')) ? `${node.label}\n${labels.join(' · ')}` : node.label, shared }
}
