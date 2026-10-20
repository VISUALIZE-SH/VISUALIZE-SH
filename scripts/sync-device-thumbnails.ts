import { readFileSync, writeFileSync } from 'node:fs'

const directory = new URL('../data/illustrations/', import.meta.url)
const registry = JSON.parse(readFileSync(new URL('device-schematics.json', directory), 'utf8')) as {
  illustrations: Array<{ versionId: string; assetPath: string; alt: string }>
}
// Keep source-review metadata in the authored register, outside the UI bundle.
const index = registry.illustrations.map(({ versionId, assetPath, alt }) => ({ versionId, assetPath, alt }))
writeFileSync(new URL('device-thumbnail-index.json', directory), `${JSON.stringify(index, null, 2)}\n`)
