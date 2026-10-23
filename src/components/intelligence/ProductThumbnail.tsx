import { useState } from 'react'
import type { DeviceIllustration } from '../../data/device-illustrations'

function publicAssetPath(path: string): string {
  const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
  return `${base}${path.replace(/^\/+/, '')}`
}

/** A missing or failed device illustration gets the same explicit placeholder. */
export default function ProductThumbnail({ illustration, name }: {
  illustration?: DeviceIllustration
  name: string
}) {
  const [failed, setFailed] = useState(false)
  if (illustration && !failed) return <img className="intel-thumb" src={publicAssetPath(illustration.assetPath)}
    alt={illustration.alt} title={illustration.alt} loading="lazy" width={64} height={64} onError={() => setFailed(true)} />
  return <svg className="intel-thumb intel-thumb-placeholder" viewBox="0 0 64 64" role="img"
    aria-label={`Illustration unavailable for ${name}`}>
    <title>Illustration unavailable</title>
    <circle cx="32" cy="32" r="25" />
    <circle cx="32" cy="32" r="19" />
    <text x="32" y="41" textAnchor="middle">?</text>
  </svg>
}
