import { useState } from 'react'
import { schematicAssetUrl, type DeviceIllustration } from '../../data/device-illustrations'

/** A missing or failed device illustration gets the same explicit placeholder. */
export default function ProductThumbnail({ illustration, name }: {
  illustration?: DeviceIllustration
  name: string
}) {
  const [failed, setFailed] = useState(false)
  if (illustration && !failed) return <img className="intel-thumb" src={schematicAssetUrl(illustration.assetPath)}
    alt={illustration.alt} title={illustration.alt} loading="lazy" width={64} height={64} onError={() => setFailed(true)} />
  return <svg className="intel-thumb intel-thumb-placeholder" viewBox="0 0 64 64" role="img"
    aria-label={`Illustration unavailable for ${name}`}>
    <title>Illustration unavailable</title>
    <circle cx="32" cy="32" r="25" />
    <circle cx="32" cy="32" r="19" />
    <text x="32" y="41" textAnchor="middle">?</text>
  </svg>
}
