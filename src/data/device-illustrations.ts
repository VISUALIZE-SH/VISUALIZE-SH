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
type ProfileViewPaths = Partial<Record<'side' | 'top' | 'distal' | 'reference', string>>
export interface ProfileIllustration extends DeviceIllustration {
  views?: SketchViewPaths
  profileViews?: ProfileViewPaths
}
export interface IllustrationNotes {
  configuration?: string
  limitations: string[]
  sources: IllustrationSource[]
}
interface VersionIllustration extends ProfileIllustration {
  notes?: IllustrationNotes
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
