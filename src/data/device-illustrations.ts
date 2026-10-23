import index from '../../data/illustrations/device-thumbnail-index.json'
import therapyIndex from '../../data/illustrations/therapy-thumbnail-index.json'

/** Artwork approval is separate from clinical evidence and product authorization. */
export interface DeviceIllustration {
  assetPath: string
  alt: string
}

const illustrations = new Map<string, DeviceIllustration>(
  index.map(item => [item.versionId, { assetPath: item.assetPath, alt: item.alt }]),
)

/** Exact-version lookup only: held and newly added versions have no substitute. */
export function deviceIllustrationFor(versionId: string): DeviceIllustration | undefined {
  return illustrations.get(versionId)
}

/** Pictured graph-level concepts never substitute for exact-version artwork. */
export function therapyIllustrationFor(entityId: string) {
  return therapyIndex.find(item => item.entityId === entityId)
}
