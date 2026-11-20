import { readFileSync, writeFileSync } from 'node:fs'

const directory = new URL('../data/illustrations/', import.meta.url)
type Source = { title: string; url: string; locator: string }
type RegisteredView = { view: string; assetPath: string }
type Entry = {
  assetPath: string
  alt: string
  configuration?: string
  limitations: string[]
  sources: Source[]
  views?: RegisteredView[]
  profileViews?: RegisteredView[]
}
function displayViews(views?: RegisteredView[]) {
  return views && Object.fromEntries(views.map(({ view, assetPath }) => [view, assetPath]))
}
function displaySources(sources: Source[]) {
  return sources.map(({ title, url, locator }) => ({ title, url, locator }))
}

const registry = JSON.parse(readFileSync(new URL('device-schematics.json', directory), 'utf8')) as {
  illustrations: Array<Entry & { versionId: string }>
}
// Keep artwork checksums and source access metadata out of the UI bundle.
const index = registry.illustrations.map(({ versionId, assetPath, alt, views, profileViews, configuration, limitations, sources }) => ({
  versionId, assetPath, alt, profileViews: displayViews(profileViews),
  views: displayViews(views),
  notes: {
    configuration,
    limitations: configuration ? limitations : ['Illustrative and not to scale. Proportions and small features are representative.'],
    sources: displaySources(sources),
  },
}))
writeFileSync(new URL('device-thumbnail-index.json', directory), `${JSON.stringify(index, null, 2)}\n`)

const therapies = JSON.parse(readFileSync(new URL('therapy-schematics.json', directory), 'utf8')) as {
  illustrations: Array<Entry & { entityId: string }>
}
writeFileSync(new URL('therapy-thumbnail-index.json', directory), `${JSON.stringify(therapies.illustrations.map(
  ({ entityId, assetPath, alt, configuration, limitations, sources, views, profileViews }) =>
    ({ entityId, assetPath, alt, configuration, limitations, sources, views: displayViews(views), profileViews: displayViews(profileViews) }),
), null, 2)}\n`)
