import index from '../../data/illustrations/device-thumbnail-index.json'

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
