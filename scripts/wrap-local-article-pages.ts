import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { wrapLocalArticlePage } from './local-article-shell'

/**
 * After article renderers run, replace each authored local article's route shell
 * with the app shell and retain its standalone HTML as iframe content.
 * Supported author routes: editorials/:slug, insights/:date, articles/:slug.
 */
export function wrapRenderedLocalArticles(outputDir = 'dist'): string[] {
  const appShellPath = join(outputDir, 'index.html')
  if (!existsSync(appShellPath)) throw new Error(`Missing app shell: ${appShellPath}`)
  const wrapped: string[] = []
  for (const routeRoot of ['editorials', 'insights', 'articles']) {
    const root = join(outputDir, routeRoot)
    if (!existsSync(root)) continue
    for (const name of readdirSync(root)) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) continue
      const articleDirectory = join(root, name)
      if (wrapLocalArticlePage(articleDirectory, appShellPath)) wrapped.push(`${routeRoot}/${name}`)
    }
  }
  return wrapped
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const routes = wrapRenderedLocalArticles()
    console.log(`Wrapped ${routes.length} local article routes in the VISUALIZE-SH app shell.`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
