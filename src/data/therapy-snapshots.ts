import type { GraphNodeData, Therapy } from '../types/entities'
import type { IntelligenceData } from '../types/intelligence'
import { versionsForGraphEntity } from './atlas-navigation'
import { therapyIllustrationFor } from './device-illustrations'

/** Graph-only snapshots retain their authored scope; they are never synthetic versions. */
export function therapySnapshots(data: IntelligenceData, nodes: GraphNodeData[], query = '', nodesById = new Map(nodes.map(node => [node.id, node]))) {
  const needle = query.trim().toLowerCase()
  return nodes.flatMap(node => {
    if (node.entity.type !== 'therapy' || versionsForGraphEntity(data, node.id).length) return []
    const therapy: Therapy = node.entity
    const illustration = therapyIllustrationFor(node.id)
    const maker = therapy.company ? nodesById.get(therapy.company)?.label ?? '' : ''
    const text = [therapy.name, maker, therapy.therapyType, therapy.subtype, illustration?.configuration].join(' ').toLowerCase()
    return needle && !text.includes(needle) ? [] : [{ therapy, illustration, maker }]
  }).sort((a, b) => a.therapy.name.localeCompare(b.therapy.name))
}
