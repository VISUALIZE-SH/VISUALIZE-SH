import type { Entity, SourcedRelationship } from '../src/types/entities'

/** Typed endpoints prevent corporate context from becoming a treatment claim. */
export function relationshipEndpointIssues(record: SourcedRelationship, byId: Map<string, Entity>): string[] {
  const source = byId.get(record.source)
  const target = byId.get(record.target)
  const issues: string[] = []
  if (!source) issues.push(`unknown source ${record.source}`)
  if (!target) issues.push(`unknown target ${record.target}`)
  if (!source || !target) return issues
  if (source.id === target.id) issues.push('self relationships are not allowed')
  switch (record.relationship) {
    case 'treats':
    case 'investigated_for':
      if (source.type !== 'therapy' || target.type !== 'condition') issues.push('requires therapy → condition')
      break
    case 'used_in':
      if (source.type !== 'therapy' || source.therapyType === 'procedure' || target.type !== 'therapy' || target.therapyType !== 'procedure') issues.push('requires non-procedure therapy → procedure')
      break
    case 'option_to_acquire':
      if (source.type !== 'company' || !(target.type === 'company' || (target.type === 'therapy' && target.therapyType !== 'procedure'))) issues.push('requires company → company or product')
      break
    default:
      if (source.type !== 'company' || target.type !== 'company') issues.push('requires company → company')
  }
  return issues
}
