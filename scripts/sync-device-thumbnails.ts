import { readFileSync, writeFileSync } from 'node:fs'

const directory = new URL('../data/illustrations/', import.meta.url)
const registry = JSON.parse(readFileSync(new URL('device-schematics.json', directory), 'utf8')) as {
  illustrations: Array<{ versionId: string; assetPath: string; alt: string }>
}
// Keep source-review metadata in the authored register, outside the UI bundle.
const index = registry.illustrations.map(({ versionId, assetPath, alt }) => ({ versionId, assetPath, alt }))
writeFileSync(new URL('device-thumbnail-index.json', directory), `${JSON.stringify(index, null, 2)}\n`)

const therapies = JSON.parse(readFileSync(new URL('therapy-schematics.json', directory), 'utf8')) as {
  illustrations: Array<{ entityId: string; assetPath: string; alt: string; configuration: string; limitations: string[]; sources: Array<{ title: string; url: string; locator: string }> }>
}
writeFileSync(new URL('therapy-thumbnail-index.json', directory), `${JSON.stringify(therapies.illustrations.map(({ entityId, assetPath, alt, configuration, limitations, sources }) => ({ entityId, assetPath, alt, configuration, limitations, sources })), null, 2)}\n`)
