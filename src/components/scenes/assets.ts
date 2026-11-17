import type { VisualizationManifest } from './types'

/** Scene assets live under public/scenes; resolve a root-relative path against the deployed base path. */
export const assetPath = (base: string, path?: string) => (path ? `${base.replace(/\/?$/, '/')}${path.replace(/^\//, '')}` : '')

/** A copy of the manifest whose image paths (stills, phone stills, part maps, outlines,
 *  locator thumbnails) resolve against the base path (import.meta.env.BASE_URL in the app). */
export function withAssetBase(manifest: VisualizationManifest, base: string): VisualizationManifest {
  const asset = (path?: string) => assetPath(base, path)
  const images = Object.fromEntries(Object.entries(manifest.images).map(([key, image]) => [key, {
    ...image,
    src: asset(image.src),
    thumb: asset(image.thumb),
    ...(image.mid ? { mid: asset(image.mid) } : {}),
    ...(image.partMap ? { partMap: asset(image.partMap) } : {}),
    ...(image.locator ? { locator: { ...image.locator, src: asset(image.locator.src) } } : {}),
    ...(image.focus ? { focus: Object.fromEntries(Object.entries(image.focus).map(([id, entry]) => [id, entry.ghost ? { ...entry, ghost: { ...entry.ghost, src: asset(entry.ghost.src) } } : entry])) } : {}),
  }]))
  return { ...manifest, images }
}
