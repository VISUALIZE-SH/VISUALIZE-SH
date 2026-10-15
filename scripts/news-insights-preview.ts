/** Serve only an ignored review copy; never change authored/public review states. */
import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync, createReadStream } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import yaml from 'js-yaml'
import type { GraphData, NewsItem } from '../src/types/entities'
import { reviewStyles } from './render-news-insights'
import type { RunManifest } from './news-insights-run'
import { renderPreviews } from './newsletter-local'

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)

// A reading view for this repository's text-only prompt, not a general Markdown engine.
function templateReadingView(markdown: string): string {
  const inline = (value: string) => escape(value).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  return markdown.replace(/^# [^\n]+\n/, '').trim().split(/\n\s*\n/).map(block => {
    if (block.startsWith('```')) return `<pre><code>${escape(block.replace(/^```[^\n]*\n/, '').replace(/\n```$/, ''))}</code></pre>`
    const heading = block.match(/^(#{2,3}) (.+)$/)
    if (heading) return `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`
    const lines = block.split('\n')
    if (/^(?:- |\d+\. )/.test(lines[0])) {
      const items: string[] = []
      for (const line of lines) {
        if (/^(?:- |\d+\. )/.test(line)) items.push(line.replace(/^(?:- |\d+\. )/, ''))
        else if (items.length) items[items.length - 1] += ' ' + line.trim()
      }
      const tag = lines[0].startsWith('- ') ? 'ul' : 'ol'
      return `<${tag}>${items.map(item => `<li>${inline(item)}</li>`).join('')}</${tag}>`
    }
    return `<p>${inline(lines.map(line => line.trim()).join(' '))}</p>`
  }).join('\n')
}

export function prepareReviewSite(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid run date')
  const runRoot = join('artifacts/news-insights', date)
  const run = JSON.parse(readFileSync(join(runRoot, 'run.json'), 'utf8')) as RunManifest
  if (!existsSync('dist/index.html')) throw new Error('Build the current app at VITE_BASE=/ first')
  if (!existsSync(join(runRoot, 'preview/index.html'))) throw new Error('Render the draft before making the review site')
  const site = join(runRoot, 'site-preview')
  mkdirSync(site, { recursive: true })
  cpSync('dist', site, { recursive: true })
  cpSync(join(runRoot, 'preview'), join(site, 'insights', date), { recursive: true })
  const graph = JSON.parse(readFileSync(join(site, 'graph.json'), 'utf8')) as GraphData
  const articleItem = JSON.parse(readFileSync(join(runRoot, 'news-item.json'), 'utf8')) as NewsItem
  const news = yaml.load(readFileSync('data/news.yaml', 'utf8'), { schema: yaml.CORE_SCHEMA }) as NewsItem[]
  const editorialDir = join(site, 'previews/newsletter')
  renderPreviews({ outputDir: editorialDir, basePath: '/', generatedAt: date })
  const spec = (yaml.load(readFileSync('data/editorial-issues.yaml', 'utf8')) as { slug: string; title: string; dek: string }[])[0]
  const editorialDemo: NewsItem = {
    id: `news-${date}-editorial-preview`, publishedAt: date, contentType: 'editorial', reviewStatus: 'draft',
    title: `${spec.title} · local editorial preview`, summary: `${spec.dek} This existing specialty preview demonstrates the Editorial label; its review date is not a publication date.`,
    sourceName: 'VISUALIZE-SH · preview', sourceUrl: `/previews/newsletter/${spec.slug}/index.html`,
    topicTags: ['Editorial preview'], relevantNodeIds: ['dev-sapien-3'],
  }
  graph.news = [
    { ...articleItem, sourceUrl: `/insights/${date}/` }, editorialDemo,
    ...news.filter(item => item.id !== articleItem.id).map(item => ({ ...item, title: item.reviewStatus === 'draft' ? `[DRAFT] ${item.title}` : item.title })),
  ]
  graph.meta.newsCount = graph.news.length
  graph.meta.latestNewsDate = date
  writeFileSync(join(site, 'graph.json'), JSON.stringify(graph, null, 2) + '\n')
  const banner = `<div id="local-insights-review">LOCAL DRAFT REVIEW · News Insights and an Editorial preview · <a href="/review.html">Review hub</a></div>`
  const bannerStyle = '<style>#local-insights-review{box-sizing:border-box;padding:10px 18px;background:#3b0b55;color:#fff;font:14px/20px Arial,sans-serif;min-height:40px;position:relative;z-index:9999}#local-insights-review a{color:#fff;font-weight:700;margin-left:12px}.app{height:calc(100dvh - 40px)!important}</style>'
  writeFileSync(join(site, 'index.html'), readFileSync(join(site, 'index.html'), 'utf8').replace('</head>', bannerStyle + '</head>').replace('<body>', '<body>' + banner))
  const prompt = readFileSync('prompts/news-insights.md', 'utf8')
  const starter = readFileSync('templates/news-insights/article.yaml', 'utf8')
  writeFileSync(join(site, 'template.md'), prompt)
  writeFileSync(join(site, 'article.yaml'), readFileSync(`data/news-insights/${date}.yaml`))
  writeFileSync(join(site, 'template.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Manual News Insights template</title><style>${reviewStyles}</style></head><body><main><nav><a href="/review.html">Review hub</a><a href="/insights/${date}/">Draft edition</a><a href="/template.md">Markdown source</a></nav><span class="badge">News Insights</span><h1>Manual generation template</h1><p class="dek">Format A shell · credible Format B connections · Format C close</p><p>Previous completed run through today. Usually two weeks; longer when the owner waits through a quiet period. No schedule.</p>${templateReadingView(prompt)}<h2>Structured article starter</h2><pre>${escape(starter)}</pre></main></body></html>`)
  const newsHref = `/?mode=news&newsFrom=${run.windowFrom}&newsTo=${run.windowTo}`
  writeFileSync(join(site, 'review.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>News Insights · Local review</title><style>${reviewStyles}</style></head><body><main><span class="badge">News Insights</span><span class="review-state">LOCAL REVIEW · No publication</span><h1>A repeatable feature, one completed draft</h1><p class="dek">${run.windowFrom}–${run.windowTo} · Manually generated ${date}</p><div class="review-links"><a href="/template.html">1. Review the reusable template<span>Window rules, model workflow, article shell, visual/evidence checks.</span></a><a href="/insights/${date}/">2. Read the first draft<span>Concise analysis with internal Data links and a highlighted Atlas figure.</span></a><a href="${escape(newsHref)}">Inspect News cards<span>Single purple-and-white News Insights and Editorial keywords in their metadata rows.</span></a><a href="/article.yaml">Inspect authored copy<span>Structured draft with exact citation locators and review limits.</span></a></div><p class="scope">Draft content is included only in this ignored review-site copy. The Editorial card links an existing local specialty preview; its displayed date is a review date. No author review state, public payload, issue, schedule, or send is changed by this preview.</p></main></body></html>`)
  if (existsSync(join(runRoot, 'review.md'))) cpSync(join(runRoot, 'review.md'), join(site, 'review.md'))
  console.log(`Prepared ignored review site: ${site}`)
  return site
}

export function serveReviewSite(date: string, port: number): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid date or local port')
  const root = resolve('artifacts/news-insights', date, 'site-preview')
  if (!existsSync(join(root, 'review.html'))) throw new Error('Prepare the review site first')
  const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.md': 'text/plain; charset=utf-8', '.yaml': 'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.ico': 'image/x-icon' }
  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      let file = resolve(root, '.' + decodeURIComponent(url.pathname))
      if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return }
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
      if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end('Not found'); return }
      res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
      createReadStream(file).pipe(res)
    } catch { res.writeHead(400).end('Bad request') }
  })
  server.on('error', error => { console.error(`Local preview server could not start: ${error.message}. Choose an unused port and allow local listening if your environment requires it.`); process.exitCode = 1 })
  server.listen(port, '127.0.0.1', () => console.log(`Local News Insights review: http://127.0.0.1:${port}/review.html`))
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2), mode = args.shift()
    let date = '', port = 5175
    while (args.length) {
      const flag = args.shift(), value = args.shift()
      if (flag === '--date' && value) date = value
      else if (flag === '--port' && value && /^\d+$/.test(value)) port = Number(value)
      else throw new Error('Usage: prepare|serve --date YYYY-MM-DD [--port 5175]')
    }
    if (mode === 'prepare') prepareReviewSite(date)
    else if (mode === 'serve') serveReviewSite(date, port)
    else throw new Error('Usage: prepare|serve --date YYYY-MM-DD [--port 5175]')
  } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 }
}
