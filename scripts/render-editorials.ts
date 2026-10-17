import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import yaml from 'js-yaml'
import type { NewsItem } from '../src/types/entities'

interface EditorialEntry {
  newsId: string
  slug: string
  sourceFile: string
}

/** Copy authored reader HTML; review state controls eligibility, never promotion. */
export function renderEditorials({
  outputDir = 'dist', includeDrafts = false, indexPath = 'data/editorials/index.yaml',
  newsPath = 'data/news.yaml', sourceDir = 'data/editorials',
}: {
  outputDir?: string; includeDrafts?: boolean; indexPath?: string; newsPath?: string; sourceDir?: string
} = {}): { renderedNewsIds: string[]; skippedDraftNewsIds: string[] } {
  const index = yaml.load(readFileSync(indexPath, 'utf8'), { schema: yaml.JSON_SCHEMA })
  const news = yaml.load(readFileSync(newsPath, 'utf8'), { schema: yaml.JSON_SCHEMA })
  if (!Array.isArray(index)) throw new Error('Editorial index must contain an array')
  if (!Array.isArray(news)) throw new Error('News YAML must contain an array')
  const ids = new Set<string>()
  const slugs = new Set<string>()
  const editorialRoot = join(outputDir, 'editorials')
  const rejectSymlink = (path: string) => {
    if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error(`Editorial path must not be a symlink: ${path}`)
  }
  rejectSymlink(editorialRoot)

  // Validate the whole inventory before copying or removing any managed output.
  const entries = index.map((value: unknown) => {
    if (!value || typeof value !== 'object') throw new Error('Editorial entry must be an object')
    const entry = value as EditorialEntry
    if (typeof entry.newsId !== 'string' || !entry.newsId.trim()) throw new Error('Editorial entry needs newsId')
    if (typeof entry.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)) throw new Error(`Invalid editorial slug: ${entry.slug}`)
    if (typeof entry.sourceFile !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.html$/.test(entry.sourceFile)) throw new Error(`Invalid editorial source filename: ${entry.sourceFile}`)
    if (ids.has(entry.newsId)) throw new Error(`Duplicate editorial newsId: ${entry.newsId}`)
    if (slugs.has(entry.slug)) throw new Error(`Duplicate editorial slug: ${entry.slug}`)
    ids.add(entry.newsId)
    slugs.add(entry.slug)
    const matches = (news as NewsItem[]).filter((item) => item && item.id === entry.newsId)
    if (matches.length !== 1 || matches[0].contentType !== 'editorial') throw new Error(`Editorial must match exactly one Editorial News record: ${entry.newsId}`)
    const item = matches[0]
    if (item.reviewStatus !== 'draft' && item.reviewStatus !== 'reviewed') throw new Error(`Editorial News record needs explicit reviewStatus: ${entry.newsId}`)
    const sourcePath = join(sourceDir, entry.sourceFile)
    if (!existsSync(sourcePath) || !lstatSync(sourcePath).isFile()) throw new Error(`Missing editorial HTML file: ${sourcePath}`)
    const destination = join(editorialRoot, entry.slug)
    rejectSymlink(destination)
    if (existsSync(join(destination, 'index.html')) && lstatSync(join(destination, 'index.html')).isSymbolicLink()) throw new Error(`Editorial output must not be a symlink: ${destination}`)
    return { entry, sourcePath, destination, draft: item.reviewStatus === 'draft' }
  })

  const renderedNewsIds: string[] = []
  const skippedDraftNewsIds: string[] = []
  for (const { entry, sourcePath, destination, draft } of entries) {
    if (draft && !includeDrafts) {
      rmSync(destination, { recursive: true, force: true })
      skippedDraftNewsIds.push(entry.newsId)
      continue
    }
    mkdirSync(destination, { recursive: true })
    copyFileSync(sourcePath, join(destination, 'index.html'))
    renderedNewsIds.push(entry.newsId)
  }
  return { renderedNewsIds, skippedDraftNewsIds }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length > 2) throw new Error('Usage: render-editorials (draft previews use the renderEditorials API with includeDrafts)')
    const result = renderEditorials()
    console.log(`Rendered ${result.renderedNewsIds.length} Editorial readers; excluded ${result.skippedDraftNewsIds.length} drafts.`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
