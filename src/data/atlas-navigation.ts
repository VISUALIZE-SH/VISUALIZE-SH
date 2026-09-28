import type { IntelligenceData, ProductVersion } from '../types/intelligence'

/**
 * Resolve a graph therapy node only when its exact catalog version is known.
 * A family node with several generations stays on the graph unless authors
 * provide an explicit graphEntityId mapping for the selected generation.
 */
export function versionForGraphEntity(data: IntelligenceData, entityId: string): ProductVersion | undefined {
  const exact = data.versions.filter(version => version.graphEntityId === entityId)
  if (exact.length === 1) return exact[0]
  if (exact.length > 1) return undefined

  const familyIds = new Set(data.families.filter(family => family.entityIds.includes(entityId)).map(family => family.id))
  const familyVersions = data.versions.filter(version => familyIds.has(version.familyId))
  return familyVersions.length === 1 ? familyVersions[0] : undefined
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
