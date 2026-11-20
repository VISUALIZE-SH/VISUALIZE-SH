import index from '../../data/illustrations/device-thumbnail-index.json'
import therapyIndex from '../../data/illustrations/therapy-thumbnail-index.json'

/** Artwork approval is separate from clinical evidence and product authorization. */
export interface DeviceIllustration {
  assetPath: string
  alt: string
}
export type SketchViewPaths = Record<'oblique' | 'front' | 'top', string>
export interface IllustrationSource {
  title: string
  url: string
  locator: string
}
interface VersionIllustration extends DeviceIllustration {
  views?: SketchViewPaths
  notes?: { configuration: string; limitations: string[]; sources: IllustrationSource[] }
}

const illustrations = new Map<string, VersionIllustration>(
  index.map(({ versionId, ...illustration }) => [versionId, illustration]),
)

export function schematicAssetUrl(path: string): string {
  const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
  return `${base}${path.replace(/^\/+/, '')}`
}

/** Exact-version lookup only: held and newly added versions have no substitute. */
export function deviceIllustrationFor(versionId: string): VersionIllustration | undefined {
  return illustrations.get(versionId)
}

/** Pictured graph-level concepts never substitute for exact-version artwork. */
export function therapyIllustrationFor(entityId: string) {
  return therapyIndex.find(item => item.entityId === entityId)
}
