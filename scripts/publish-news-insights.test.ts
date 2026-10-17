import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import yaml from 'js-yaml'
import type { GraphData } from '../src/types/entities'
import { publishNewsInsights } from './publish-news-insights'
import { renderEdition, type InsightsEdition } from './render-news-insights'

test('production publication needs approved matching News, excludes drafts and has no local artifact dependency', () => {
  const root = mkdtempSync(join(tmpdir(), 'insights-publication-'))
  try {
    const edition = yaml.load(readFileSync('data/news-insights/2026-10-16.yaml', 'utf8')) as InsightsEdition
    edition.reviewStatus = 'reviewed'
    const sourceDir = join(root, 'source'), outputDir = join(root, 'dist'), graphPath = join(root, 'graph.json')
    mkdirSync(sourceDir)
    const sourcePath = join(sourceDir, '2026-10-16.yaml')
    const graph = JSON.parse(readFileSync('public/graph.json', 'utf8')) as GraphData
    graph.news = graph.news.filter(item => item.id !== renderEdition(edition).newsItem.id)
    graph.news.push(renderEdition(edition).newsItem)
    const save = () => { writeFileSync(sourcePath, yaml.dump(edition)); writeFileSync(graphPath, JSON.stringify(graph)) }
    save()
    const build = () => publishNewsInsights({ sourceDir, outputDir, graphPath })
    assert.deepEqual(build(), ['2026-10-16'])
    const destination = join(outputDir, 'insights', '2026-10-16', 'index.html')
    assert.ok(!readFileSync(destination, 'utf8').includes('LOCAL DRAFT'))
    graph.news.at(-1)!.title = 'Stale feed title'
    save()
    assert.throws(build, /must match exactly one reviewed News/)
    edition.reviewStatus = 'draft'
    save()
    assert.deepEqual(build(), [])
    assert.equal(existsSync(destination), false)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
