import type { IntelligenceData, ProductVersion } from '../types/intelligence'

/**
 * List the authored profiles for a graph node, preferring exact generation
 * mappings before offering all versions associated with a shared family node.
 */
export function versionsForGraphEntity(data: IntelligenceData, entityId: string): ProductVersion[] {
  const exact = data.versions.filter(version => version.graphEntityId === entityId)
  if (exact.length) return exact

  const familyIds = new Set(data.families.filter(family => family.entityIds.includes(entityId)).map(family => family.id))
  return data.versions.filter(version => familyIds.has(version.familyId))
}

/** Resolve a graph node only when its product generation is unambiguous. */
export function versionForGraphEntity(data: IntelligenceData, entityId: string): ProductVersion | undefined {
  const versions = versionsForGraphEntity(data, entityId)
  return versions.length === 1 ? versions[0] : undefined
}

/** Resolve a news item only when all relevant graph nodes identify one version. */
export function versionForGraphEntities(data: IntelligenceData, entityIds: string[]): ProductVersion | undefined {
  const matches = new Map<string, ProductVersion>()
  for (const entityId of entityIds) {
    const exact = data.versions.filter(version => version.graphEntityId === entityId)
    if (exact.length > 1) return undefined
    if (exact.length === 1) {
      matches.set(exact[0].id, exact[0])
      continue
    }

    const familyIds = new Set(data.families.filter(family => family.entityIds.includes(entityId)).map(family => family.id))
    if (!familyIds.size) continue // Conditions, companies, and other non-family IDs carry no version context.
    const familyVersions = data.versions.filter(version => familyIds.has(version.familyId))
    if (familyVersions.length > 1) return undefined
    if (familyVersions.length === 1) matches.set(familyVersions[0].id, familyVersions[0])
  }
  return matches.size === 1 ? [...matches.values()][0] : undefined
}
