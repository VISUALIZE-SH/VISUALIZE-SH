import type { Entity } from '../types/entities'

/** Graph flags for lifecycle states that should be visually prominent in Atlas. */
export function atlasLifecycleFlags(entity: Entity): { isHalted: boolean; isRetired: boolean } {
  if (entity.type === 'trial') {
    return {
      isHalted: entity.lifecycleStatus === 'halted' || entity.status === 'terminated' || entity.status === 'suspended',
      isRetired: false,
    }
  }
  if (entity.type === 'therapy') {
    return {
      isHalted: entity.lifecycleStatus === 'halted',
      isRetired: entity.lifecycleStatus === 'retired' || entity.lifecycleStatus === 'recalled',
    }
  }
  return { isHalted: false, isRetired: false }
}

export function lifecycleLabel(entity: Entity): string | undefined {
  if (entity.type === 'therapy' || entity.type === 'trial') {
    if (entity.lifecycleStatus) return entity.lifecycleStatus
    if (entity.type === 'trial' && (entity.status === 'terminated' || entity.status === 'suspended')) return 'halted'
  }
  return undefined
}
