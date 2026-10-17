import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Put an authored full-page HTML article beneath the shared app shell. */
export function wrapLocalArticlePage(articleDirectory: string, appShellPath: string): boolean {
  const pagePath = join(articleDirectory, 'index.html')
  const contentPath = join(articleDirectory, 'content.html')
  if (!existsSync(pagePath) || !existsSync(appShellPath)) return false

  const html = readFileSync(pagePath, 'utf8')
  const articleContent = html.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/i, '')
  writeFileSync(contentPath, articleContent)
  copyFileSync(appShellPath, pagePath)
  return true
}
