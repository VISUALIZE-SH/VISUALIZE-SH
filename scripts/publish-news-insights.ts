/** Render explicitly reviewed editions during production builds, without a local run ledger. */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import yaml from 'js-yaml'
import type { GraphData, NewsItem } from '../src/types/entities'
import type { RunManifest } from './news-insights-run'
import { renderEdition, validateEdition, type InsightsEdition } from './render-news-insights'

export function publishNewsInsights({ sourceDir = 'data/news-insights', outputDir = 'dist',
  graphPath = 'public/graph.json', intelligencePath = 'public/intelligence.json' } = {}): string[] {
  const graph = JSON.parse(readFileSync(graphPath, 'utf8')) as GraphData
  const intelligence = JSON.parse(readFileSync(intelligencePath, 'utf8')) as { versions: { id: string }[] }
  const versions = new Set(intelligence.versions.map(version => version.id))
  const published: string[] = []
  for (const file of readdirSync(sourceDir).filter(file => /^\d{4}-\d{2}-\d{2}\.yaml$/.test(file)).sort()) {
    const edition = yaml.load(readFileSync(join(sourceDir, file), 'utf8'), { schema: yaml.CORE_SCHEMA }) as InsightsEdition
    const date = file.slice(0, -5)
    const destination = join(outputDir, 'insights', date)
    if (edition.reviewStatus === 'draft') {
      rmSync(destination, { recursive: true, force: true })
      continue
    }
    if (edition.runDate !== date) throw new Error(`Edition date must match filename: ${file}`)
    // The local renderer checks the frozen run. Builds check all selected IDs
    // against the authored collection without depending on ignored local state.
    const context = { runDate: date, windowFrom: edition.windowFrom, windowTo: edition.windowTo,
      candidateNewsIds: graph.news.filter(item => !item.contentType || item.contentType === 'news').map(item => item.id) } as RunManifest
    validateEdition(edition, context, graph, versions)
    const rendered = renderEdition(edition)
    const matches = graph.news.filter(item => item.id === rendered.newsItem.id)
    const fields: Array<keyof NewsItem> = ['contentType', 'reviewStatus', 'publishedAt', 'title', 'summary', 'sourceUrl', 'relevantNodeIds']
    if (matches.length !== 1 || fields.some(field => JSON.stringify(matches[0][field]) !== JSON.stringify(rendered.newsItem[field]))) {
      throw new Error(`Published edition must match exactly one reviewed News record: ${edition.id}`)
    }
    const snapshots = [...edition.sections, ...(edition.closing ? [edition.closing] : [])].flatMap(section => section.atlasSnapshot ? [section.atlasSnapshot] : [])
    for (const snapshot of snapshots) {
      if (!existsSync(join(sourceDir, 'figures', date, snapshot.file))) throw new Error(`Missing published Atlas figure: ${date}/${snapshot.file}`)
    }
    mkdirSync(destination, { recursive: true })
    writeFileSync(join(destination, 'index.html'), rendered.html)
    if (snapshots.length) mkdirSync(join(destination, 'figures'), { recursive: true })
    for (const snapshot of snapshots) copyFileSync(join(sourceDir, 'figures', date, snapshot.file), join(destination, 'figures', snapshot.file))
    published.push(date)
  }
  return published
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(`Published ${publishNewsInsights().length} reviewed News Insights editions.`) }
  catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 }
}
