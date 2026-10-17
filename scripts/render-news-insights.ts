/** Local-only rendering. This command cannot promote, publish, schedule, or send. */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import yaml from 'js-yaml'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type { GraphData, NewsItem } from '../src/types/entities'
import type { RunManifest } from './news-insights-run'
import { completeRun } from './news-insights-run'

type ContextLink = { label: string; versionId: string; nodeId?: never } | { label: string; nodeId: string; versionId?: never }
interface Paragraph { text: string; sourceIds: string[]; interpretation?: boolean; contextLinks?: ContextLink[] }
interface Section {
  heading: string; role: 'insight' | 'connection' | 'next-question'; paragraphs: Paragraph[]
  links?: { label: string; versionId: string }[]
  table?: { caption: string; columns: string[]; rows: { cells: string[]; sourceIds: string[]; contextLinks?: ContextLink[] }[] }
  figure?: { caption: string; sourceIds: string[]; steps: { label: string; detail: string; basis: 'announced' | 'question' }[] }
  atlasSnapshot?: { file: string; nodeId: string; conditionId?: string; caption: string }
}
interface Source {
  id: string; title: string; publisher: string; url: string; sourceClass: string; access: string
  publishedAt?: string; retrievedAt: string; locator: string; scope: string; limits: string
}
export interface InsightsEdition {
  id: string; contentType: 'news-insights'; reviewStatus: 'draft' | 'reviewed'; runDate: string
  windowFrom: string; windowTo: string; title: string; dek: string; summary: string
  relevantNodeIds: string[]; selectedNewsIds: string[]; opening: Paragraph[]
  sections: Section[]; closing?: Section; sources: Source[]; scopeNote: string
}

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)
const validateSchema = ajv.compile(JSON.parse(readFileSync(new URL('../schema/news-insights.schema.json', import.meta.url), 'utf8')))
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)

export function validateEdition(value: unknown, run: RunManifest, graph: GraphData, versionIds: Set<string>): InsightsEdition {
  if (!validateSchema(value)) throw new Error(`Invalid News Insights draft: ${ajv.errorsText(validateSchema.errors, { separator: '; ' })}`)
  const edition = value as InsightsEdition
  if (edition.runDate !== run.runDate || edition.windowFrom !== run.windowFrom || edition.windowTo !== run.windowTo
    || edition.id !== `insights-${run.runDate}`) throw new Error('Draft identity/window must match the frozen manual run')
  if (edition.closing && edition.closing.role !== 'next-question') throw new Error('Close with a consequential next question')
  const sourceIds = new Set(edition.sources.map(source => source.id))
  if (sourceIds.size !== edition.sources.length) throw new Error('Duplicate source IDs')
  for (const source of edition.sources) {
    const url = new URL(source.url)
    if (url.username || url.password) throw new Error(`Embedded credentials in source ${source.id}`)
  }
  const nodes = new Set(graph.elements.nodes.map(node => node.data.id))
  for (const id of edition.relevantNodeIds) if (!nodes.has(id)) throw new Error(`Unknown graph node ${id}`)
  for (const id of edition.selectedNewsIds) if (!run.candidateNewsIds.includes(id)) throw new Error(`Selected news outside frozen candidates: ${id}`)
  const refs = (ids: string[]) => { for (const id of ids) if (!sourceIds.has(id)) throw new Error(`Unknown source ${id}`) }
  const contextLinks = (links: ContextLink[] = []) => {
    for (const link of links) {
      if (link.versionId && !versionIds.has(link.versionId)) throw new Error(`Unknown exact-version pointer ${link.versionId}`)
      if (link.nodeId && !nodes.has(link.nodeId)) throw new Error(`Unknown graph context ${link.nodeId}`)
    }
  }
  const paragraphs = (values: Paragraph[]) => {
    for (const paragraph of values) {
      refs(paragraph.sourceIds)
      contextLinks(paragraph.contextLinks)
      if (!paragraph.sourceIds.length && !paragraph.interpretation) throw new Error('Factual paragraphs need sources; mark original interpretation explicitly')
    }
  }
  paragraphs(edition.opening)
  for (const section of [...edition.sections, ...(edition.closing ? [edition.closing] : [])]) {
    paragraphs(section.paragraphs)
    for (const link of section.links ?? []) if (!versionIds.has(link.versionId)) throw new Error(`Unknown exact-version pointer ${link.versionId}`)
    for (const row of section.table?.rows ?? []) {
      if (row.cells.length !== section.table!.columns.length) throw new Error('Table row/column mismatch')
      refs(row.sourceIds)
      contextLinks(row.contextLinks)
    }
    if (section.figure) refs(section.figure.sourceIds)
    if (section.atlasSnapshot) {
      for (const id of [section.atlasSnapshot.nodeId, section.atlasSnapshot.conditionId].filter(Boolean)) {
        if (!nodes.has(id!)) throw new Error(`Unknown snapshot node ${id}`)
      }
    }
  }
  return edition
}

// Self-contained styles, no remote assets, original diagram, readable mobile tables.
export const reviewStyles = `
:root{color-scheme:light dark;--brand:#3b0b55;--on-brand:#fff;--bg:#f7f4f9;--surface:#fff;--text:#1a0426;--body:#47404c;--border:#dfd5e5;--link:#7d1ba8;--soft:#f0d5ff}
@media(prefers-color-scheme:dark){:root{--brand:#74268e;--bg:#17101c;--surface:#25182d;--text:#fbf7fd;--body:#e0d3e7;--border:#57415f;--link:#dda2f9;--soft:#3d234b}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--body);font:18px/1.65 'Source Sans 3','Source Sans Pro',Arial,sans-serif}a{color:var(--link);text-underline-offset:3px}a:focus-visible{outline:3px solid var(--link);outline-offset:3px}main{max-width:1080px;margin:40px auto;padding:44px 56px;background:var(--surface);border-top:5px solid var(--brand);border-radius:8px}nav{display:flex;flex-wrap:wrap;gap:20px;font-size:14px;margin-bottom:30px}h1,h2,h3{color:var(--text);font-family:'Open Sans',Arial,sans-serif;line-height:1.2}h1{font-size:38px;letter-spacing:-.025em;margin:18px 0}h2{font-size:27px;margin:46px 0 18px}h3{font-size:19px}p{max-width:76ch;margin:18px 0}.badge{display:inline-block;background:var(--brand);color:var(--on-brand);font-weight:700;padding:5px 12px;border-radius:5px;font-size:14px}.review-state{font-size:14px;margin-left:12px;color:var(--body)}.dek{font-size:23px;line-height:1.45;color:var(--text)}.dates,.source-detail,.scope{font-size:14px}.opening{font-size:20px;line-height:1.7;border-left:3px solid var(--brand);padding-left:24px;margin:32px 0}.citations{font-size:13px;white-space:nowrap;margin-left:5px}.table-wrap{max-width:100%;overflow:auto;border:1px solid var(--border);border-radius:6px;margin:26px 0}table{border-collapse:collapse;min-width:680px;width:100%;font-size:15px;line-height:1.5}caption{text-align:left;padding:18px;background:var(--soft);color:var(--text);font-size:15px}th,td{text-align:left;vertical-align:top;padding:16px;border-bottom:1px solid var(--border)}th{color:var(--text);background:var(--bg)}tbody tr:last-child td{border:0}figure{margin:28px 0;padding:24px;background:var(--bg);border-radius:6px}.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}.step{padding:15px 10px;background:var(--surface);border-top:3px solid var(--brand);min-width:0}.step.question{border-top-style:dashed}.step strong{display:block;color:var(--text);font-size:16px;line-height:1.35}.step span{display:block;font-size:13px;line-height:1.5;margin-top:8px}figcaption{font-size:14px;margin-top:18px}.context-links{display:block;font-size:13px;line-height:1.5;margin-top:8px}.atlas-snapshot{padding:0;overflow:hidden;border:1px solid var(--border)}.atlas-snapshot img{display:block;width:100%;height:auto}.atlas-snapshot figcaption{padding:16px;margin:0}.routes{display:flex;flex-wrap:wrap;gap:10px;font-size:14px;margin:24px 0}.routes a{border:1px solid var(--border);padding:8px 12px;border-radius:5px}.source-list{font-size:15px;padding-left:23px}.source-list li{margin:24px 0;padding-left:7px;scroll-margin-top:20px}.source-detail{margin:5px 0;overflow-wrap:anywhere}.scope{border-top:1px solid var(--border);padding-top:24px;margin-top:36px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:15px/1.65 ui-monospace,monospace;background:var(--bg);padding:25px}.review-links{display:grid;grid-template-columns:1fr 1fr;gap:20px}.review-links a{display:block;padding:25px;border:1px solid var(--border);border-radius:6px;font-weight:700}.review-links span{display:block;font-weight:400;font-size:15px;margin-top:10px}
.article-reader{max-width:780px;margin:0 auto;padding:36px 16px 96px;background:var(--surface);border-top:5px solid var(--brand);border-radius:8px}
@media(max-width:700px){body{font-size:17px}main{margin:0;padding:28px 20px;border-radius:0}.article-reader{padding:28px 20px;border-radius:0}h1{font-size:29px}h2{font-size:24px}.dek{font-size:20px}.opening{font-size:18px;padding-left:16px}.steps{grid-template-columns:1fr}.step{padding:12px 16px}.review-links{grid-template-columns:1fr}table{min-width:640px}figure{padding:16px}}
@media print{body{background:#fff;color:#111}main{margin:0;padding:0;max-width:none}nav,.review-state{display:none}a{color:inherit}.table-wrap{overflow:visible}table{min-width:0}h2,figure,table{break-inside:avoid}}
`

export function renderEdition(edition: InsightsEdition): { html: string; markdown: string; newsItem: NewsItem } {
  const draft = edition.reviewStatus === 'draft'
  const index = new Map(edition.sources.map((source, i) => [source.id, i + 1]))
  const sourceById = new Map(edition.sources.map(source => [source.id, source]))
  const cite = (ids: string[]) => ids.length ? `<span class="citations">${ids.map(id => `<a href="#source-${escape(id)}" aria-label="Source ${index.get(id)}">[${index.get(id)}]</a>`).join(' ')}</span>` : ''
  const mdCite = (ids: string[]) => ids.map(id => ` [${index.get(id)}](${sourceById.get(id)!.url})`).join('')
  const contextHref = (link: ContextLink) => link.versionId !== undefined
    ? `/?mode=data&version=${encodeURIComponent(link.versionId)}&jurisdiction=all`
    : `/?mode=atlas&node=${encodeURIComponent(link.nodeId)}&jurisdiction=all`
  const contextHtml = (links: ContextLink[] = []) => links.length ? `<span class="context-links">${links.map(link => `<a href="${escape(contextHref(link))}">${link.versionId ? 'Data' : 'Atlas'}: ${escape(link.label)}</a>`).join(' · ')}</span>` : ''
  const contextMd = (links: ContextLink[] = []) => links.length ? `\n\n${links.map(link => `[${link.versionId ? 'Data' : 'Atlas'}: ${link.label}](${contextHref(link)})`).join(' · ')}` : ''
  const para = (values: Paragraph[]) => values.map(p => `<p>${escape(p.text)}${cite(p.sourceIds)}${contextHtml(p.contextLinks)}</p>`).join('\n')
  const snapshotHref = (snapshot: NonNullable<Section['atlasSnapshot']>) => contextHref({ label: '', nodeId: snapshot.nodeId }) + (snapshot.conditionId ? `&condition=${encodeURIComponent(snapshot.conditionId)}` : '')
  const sectionHtml = (section: Section) => {
    const table = section.table
    const tableHtml = table ? `<div class="table-wrap" tabindex="0" role="region" aria-label="${escape(table.caption)}"><table><caption>${escape(table.caption)}</caption><thead><tr>${table.columns.map(c => `<th scope="col">${escape(c)}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row => `<tr>${row.cells.map((c, i) => `<td>${escape(c)}${i === 0 ? cite(row.sourceIds) + contextHtml(row.contextLinks) : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''
    const figure = section.figure
    const figureHtml = figure ? `<figure><div class="steps" role="list">${figure.steps.map(step => `<div class="step ${step.basis}" role="listitem"><strong>${escape(step.label)}</strong><span>${escape(step.detail)}</span><span>${step.basis === 'announced' ? 'Announced context' : 'To be evaluated'}</span></div>`).join('')}</div><figcaption>${escape(figure.caption)}${cite(figure.sourceIds)}</figcaption></figure>` : ''
    const snapshot = section.atlasSnapshot
    const snapshotHtml = snapshot ? `<figure class="atlas-snapshot"><a href="${escape(snapshotHref(snapshot))}"><img src="./figures/${escape(snapshot.file)}" alt="${escape(snapshot.caption)}" loading="lazy"></a><figcaption>${escape(snapshot.caption)} <a href="${escape(snapshotHref(snapshot))}">Explore this Atlas neighborhood</a></figcaption></figure>` : ''
    const links = (section.links ?? []).map(link => `<a href="/?mode=atlas&amp;atlas=profiles&amp;version=${encodeURIComponent(link.versionId)}&amp;jurisdiction=all">${escape(link.label)} · Atlas</a><a href="/?mode=data&amp;version=${encodeURIComponent(link.versionId)}&amp;jurisdiction=all">Inspect evidence · Data</a>`).join('')
    return `<section><h2>${escape(section.heading)}</h2>${para(section.paragraphs)}${tableHtml}${figureHtml}${snapshotHtml}${links ? `<div class="routes">${links}</div>` : ''}</section>`
  }
  const sourcesHtml = edition.sources.map(source => `<li id="source-${escape(source.id)}"><a href="${escape(source.url)}" target="_blank" rel="noreferrer">${escape(source.title)}</a><p class="source-detail">${escape(source.publisher)} · ${escape(source.sourceClass)} · ${escape(source.access)} · ${source.publishedAt ? `Document/version date ${source.publishedAt}` : 'Publication date not displayed'} · Inspected ${source.retrievedAt}</p><p class="source-detail"><strong>Locator:</strong> ${escape(source.locator)}</p><p class="source-detail"><strong>Scope:</strong> ${escape(source.scope)}</p><p class="source-detail"><strong>Limits:</strong> ${escape(source.limits)}</p></li>`).join('')
  const newsHref = `/?mode=news&amp;newsFrom=${edition.windowFrom}&amp;newsTo=${edition.windowTo}`
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${draft ? '<meta name="robots" content="noindex,nofollow">' : ''}<title>${escape(edition.title)}${draft ? ' · Local draft' : ''}</title><style>${reviewStyles}</style></head><body><main class="article-reader">${draft ? '<nav><a href="/review.html">Local review hub</a><a href="/template.html">Generation template</a></nav>' : `<nav><a href="${newsHref}">Full News window</a></nav>`}<header><span class="badge">News Insights</span>${draft ? '<span class="review-state">LOCAL DRAFT · Review pending</span>' : ''}<h1>${escape(edition.title)}</h1><p class="dek">${escape(edition.dek)}</p><p class="dates">Coverage ${edition.windowFrom}–${edition.windowTo} · Manual run ${edition.runDate}</p></header><div class="opening">${para(edition.opening)}</div>${edition.sections.map(sectionHtml).join('')}${edition.closing ? sectionHtml(edition.closing) : ''}<p class="scope">${escape(edition.scopeNote)}</p><section><h2>Sources and review boundaries</h2><ol class="source-list">${sourcesHtml}</ol></section></main></body></html>`
  const mdSections = [...edition.sections, ...(edition.closing ? [edition.closing] : [])].map(section => {
    let text = `## ${section.heading}\n\n${section.paragraphs.map(p => p.text + mdCite(p.sourceIds) + contextMd(p.contextLinks)).join('\n\n')}\n`
    if (section.table) {
      const table = section.table
      const cell = (text: string) => text.replaceAll('|', '\\|')
      text += `\n*${table.caption}*\n\n| ${table.columns.map(cell).join(' | ')} |\n| ${table.columns.map(() => '---').join(' | ')} |\n${table.rows.map(row => `| ${row.cells.map((c, i) => cell(c) + (i === 0 ? mdCite(row.sourceIds) + contextMd(row.contextLinks).replaceAll('\n', ' ') : '')).join(' | ')} |`).join('\n')}\n`
    }
    if (section.figure) text += `\n*${section.figure.caption}*${mdCite(section.figure.sourceIds)}\n\n${section.figure.steps.map(step => `- **${step.label}:** ${step.detail} (${step.basis === 'announced' ? 'announced context' : 'question for evaluation'}).`).join('\n')}\n`
    if (section.atlasSnapshot) text += `\n![${section.atlasSnapshot.caption}](./preview/figures/${section.atlasSnapshot.file})\n\n[Explore this Atlas neighborhood](${snapshotHref(section.atlasSnapshot)})\n`
    for (const link of section.links ?? []) text += `\n[Data: ${link.label}](${contextHref(link)}) · [Atlas profile](/?mode=atlas&atlas=profiles&version=${encodeURIComponent(link.versionId)}&jurisdiction=all)\n`
    return text
  }).join('\n')
  const markdown = `# ${edition.title}\n\n**${draft ? 'LOCAL DRAFT · ' : ''}News Insights · Manual run ${edition.runDate}**\n\n${edition.dek}\n\nCoverage: ${edition.windowFrom}–${edition.windowTo}.\n\n${edition.opening.map(p => p.text + mdCite(p.sourceIds) + contextMd(p.contextLinks)).join('\n\n')}\n\n${mdSections}\n${edition.scopeNote}\n\n## Sources and review boundaries\n\n${edition.sources.map((source, i) => `${i + 1}. [${source.title}](${source.url}) — ${source.publisher}. ${source.sourceClass}; ${source.access}; document/version date ${source.publishedAt ?? 'not displayed'}; inspected ${source.retrievedAt}. Locator: ${source.locator} Scope: ${source.scope} Limits: ${source.limits}`).join('\n\n')}\n`
  const newsItem: NewsItem = {
    id: `news-${edition.runDate}-news-insights`, publishedAt: edition.runDate,
    contentType: 'news-insights', reviewStatus: edition.reviewStatus, title: edition.title, summary: edition.summary,
    sourceName: 'VISUALIZE-SH', sourceUrl: `https://visualize-sh.com/insights/${edition.runDate}/`,
    topicTags: ['News Insights'], relevantNodeIds: edition.relevantNodeIds,
  }
  return { html, markdown, newsItem }
}

export function renderLocalRun(date: string, rootDir = 'artifacts/news-insights'): void {
  // No output option: all rendering stays under the ignored review directory.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Pass --date YYYY-MM-DD')
  const manifestPath = join(rootDir, date, 'run.json')
  if (!existsSync(manifestPath)) throw new Error('Prepare a manual run before rendering')
  const run = JSON.parse(readFileSync(manifestPath, 'utf8')) as RunManifest
  const graph = JSON.parse(readFileSync('public/graph.json', 'utf8')) as GraphData
  const intel = JSON.parse(readFileSync('public/intelligence.json', 'utf8')) as { versions: { id: string }[] }
  const value = yaml.load(readFileSync(`data/news-insights/${date}.yaml`, 'utf8'), { schema: yaml.CORE_SCHEMA })
  const edition = validateEdition(value, run, graph, new Set(intel.versions.map(version => version.id)))
  const out = join(rootDir, date)
  // Only explicitly named local JPEG captures; schema excludes traversal/remote URLs.
  const snapshots = [...edition.sections, ...(edition.closing ? [edition.closing] : [])].flatMap(section => section.atlasSnapshot ? [section.atlasSnapshot] : [])
  for (const snapshot of snapshots) {
    const capture = join(out, 'figures', snapshot.file)
    if (!existsSync(capture)) throw new Error(`Capture the declared local Atlas figure first: ${capture}`)
  }
  const rendered = renderEdition(edition)
  const previewPath = join(out, 'preview', 'index.html')
  const articlePath = join(out, 'article.md')
  mkdirSync(join(out, 'preview'), { recursive: true })
  if (snapshots.length) mkdirSync(join(out, 'preview', 'figures'), { recursive: true })
  for (const snapshot of snapshots) copyFileSync(join(out, 'figures', snapshot.file), join(out, 'preview', 'figures', snapshot.file))
  writeFileSync(previewPath, rendered.html)
  writeFileSync(articlePath, rendered.markdown)
  writeFileSync(join(out, 'news-item.json'), JSON.stringify(rendered.newsItem, null, 2) + '\n')
  completeRun(run, { articlePath, previewPath, rootDir })
  console.log(`Rendered local DRAFT ${date}: ${articlePath}; ${previewPath}. Generation checkpoint saved; no publication or send.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2)
    if (args.length !== 2 || args[0] !== '--date') throw new Error('Usage: --date YYYY-MM-DD')
    renderLocalRun(args[1])
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
