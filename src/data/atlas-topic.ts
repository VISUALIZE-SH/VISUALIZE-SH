import type { GraphNodeData } from '../types/entities'

const TOPIC_ALIASES: Record<string, string[]> = {
  tavr: ['tavi', 'transcatheter aortic valve replacement', 'transcatheter aortic valve implantation'],
  tmvr: ['transcatheter mitral valve replacement'],
  ttvr: ['transcatheter tricuspid valve replacement'],
  laao: ['laac', 'laa closure', 'laa occlusion', 'left atrial appendage closure', 'left atrial appendage occlusion'],
  teer: ['transcatheter edge to edge repair', 'mitral teer', 'tricuspid teer'],
  't teer': ['tricuspid teer', 'transcatheter tricuspid edge to edge repair'],
  hcm: ['hypertrophic cardiomyopathy'],
  'attr cm': ['transthyretin amyloid cardiomyopathy', 'amyloid cardiomyopathy'],
  pfa: ['pulsed field ablation'],
  'asd closure': ['atrial septal defect', 'septal occluder'],
  'clinical trial': ['trial'],
}

export function normalizeAtlasTopic(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function searchableNodeText(node: GraphNodeData): string {
  const entity = node.entity
  const common = [node.label, node.group, node.category]

  if (entity.type === 'condition') {
    return [...common, entity.name, entity.abbreviation, entity.category, ...(entity.anatomy ?? []), entity.description].filter(Boolean).join(' ')
  }
  if (entity.type === 'therapy') {
    return [
      ...common,
      entity.name,
      entity.therapyType,
      entity.subtype,
      entity.regulatoryStatus,
      entity.regulatoryDetail,
      entity.mechanism,
      entity.description,
      entity.timeline?.event,
      ...(entity.materials ?? []).flatMap((material) => [material.name, material.role, material.category, material.note]),
    ].filter(Boolean).join(' ')
  }
  if (entity.type === 'company') {
    return [...common, entity.name, entity.ticker, entity.hq, entity.description].filter(Boolean).join(' ')
  }
  return [
    ...common,
    entity.name,
    entity.nctId,
    entity.phase,
    entity.status,
    entity.primaryEndpoint,
    entity.outcomeSummary,
    entity.resultStatus,
    entity.timeline?.event,
  ].filter(Boolean).join(' ')
}

export function atlasTopicNodeIds(nodes: GraphNodeData[], topic: string): Set<string> {
  const normalizedTopic = normalizeAtlasTopic(topic)
  if (!normalizedTopic) return new Set()
  const terms = [normalizedTopic, ...(TOPIC_ALIASES[normalizedTopic] ?? []).map(normalizeAtlasTopic)]

  return new Set(nodes.filter((node) => {
    const searchable = ` ${normalizeAtlasTopic(searchableNodeText(node))} `
    return terms.some((term) => searchable.includes(` ${term} `))
  }).map((node) => node.id))
}
