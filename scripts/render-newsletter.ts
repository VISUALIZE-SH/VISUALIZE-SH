/** Render a deterministic, email-safe weekly digest from data/news.yaml. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const DISCLAIMER = 'This is not a clinical advice tool. Content here is not provided or endorsed by the organizations listed. For educational and informational use only. This is not medical advice and may be incomplete or out of date. Regulatory status, trial results, and corporate ownership change frequently — always verify against primary sources (FDA labeling, ClinicalTrials.gov, peer-reviewed publications) before relying on anything here.'
const GROUPS = ['Structural Heart', 'Heart Failure', 'SH-relevant Digital Therapies'] as const
type Group = (typeof GROUPS)[number]

interface NewsItem {
  id: string
  publishedAt: string
  title: string
  summary: string
  sourceName: string
  sourceUrl: string
  additionalSources?: { label: string; url: string }[]
  topicTags: string[]
  relevantNodeIds: string[]
  /** Optional evidence fields used by the local intelligence preview. */
  reviewStatus?: 'draft' | 'reviewed'
  change?: string
  whyItMatters?: string
  uncertainty?: string
  atlasHref?: string
  dataHref?: string
}

interface DigestIndexEntry {
  issueDate: string
  startDate: string
  endDate: string
  itemCount: number
  href: string
  emailHref: string
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const NEWS_FILE = join(ROOT, 'data', 'news.yaml')
const DIGESTS_DIR = join(ROOT, 'public', 'digests')

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}

function dateAtUtc(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Expected YYYY-MM-DD, received "${value}"`)
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw new Error(`Invalid calendar date: "${value}"`)
  return date
}

function dateString(date: Date): string { return date.toISOString().slice(0, 10) }

export function groupFor(item: NewsItem): Group {
  const tags = item.topicTags.join(' ').toLowerCase()
  const nodes = item.relevantNodeIds.join(' ').toLowerCase()
  if (tags.includes('heart failure') || nodes.includes('cond-hf')) return 'Heart Failure'
  if (/(clinical ai|digital health|robotics|patient monitoring|software|ai-ecg)/.test(tags) || item.relevantNodeIds.some((id) => id.startsWith('dig-'))) return 'SH-relevant Digital Therapies'
  return 'Structural Heart'
}

export function isSendableNewsItem(item: NewsItem): boolean {
  return item.reviewStatus !== 'draft'
}

function loadNews(): NewsItem[] {
  const parsed = yaml.load(readFileSync(NEWS_FILE, 'utf8'), { schema: yaml.CORE_SCHEMA })
  if (!Array.isArray(parsed)) throw new Error('data/news.yaml must be a YAML list')
  return parsed as NewsItem[]
}

function renderItem(item: NewsItem): string {
  if (!isHttpsUrl(item.sourceUrl)) throw new Error(`News item ${item.id} has a non-HTTPS source URL`)
  for (const source of item.additionalSources ?? []) {
    if (!isHttpsUrl(source.url)) throw new Error(`News item ${item.id} has a non-HTTPS additional source URL`)
  }
  const evidence = [
    item.change ? `<p style="margin:0 0 8px;font:14px/21px Arial,sans-serif;color:#333;"><strong>Change:</strong> ${escapeHtml(item.change)}</p>` : '',
    item.whyItMatters ? `<p style="margin:0 0 8px;font:14px/21px Arial,sans-serif;color:#333;"><strong>Why it matters:</strong> ${escapeHtml(item.whyItMatters)}</p>` : '',
    item.uncertainty ? `<p style="margin:0 0 10px;font:14px/21px Arial,sans-serif;color:#333;"><strong>Uncertainty:</strong> ${escapeHtml(item.uncertainty)}</p>` : '',
  ].join('')
  const recordLinks = [
    item.atlasHref && isSitePath(item.atlasHref) ? `<a href="${escapeHtml(item.atlasHref)}" style="color:#5427a6;text-decoration:underline;margin-right:14px;">Open in Atlas</a>` : '',
    item.dataHref && isSitePath(item.dataHref) ? `<a href="${escapeHtml(item.dataHref)}" style="color:#5427a6;text-decoration:underline;">Inspect Data</a>` : '',
  ].join('')
  const citations = [
    `<a href="${escapeHtml(item.sourceUrl)}" style="color:#5427a6;text-decoration:underline;">${escapeHtml(item.sourceName)}</a>`,
    ...(item.additionalSources ?? []).map((source) => `<a href="${escapeHtml(source.url)}" style="color:#5427a6;text-decoration:underline;">${escapeHtml(source.label)}</a>`),
  ].join(' &nbsp;·&nbsp; ')
  return `<article style="margin:0 0 24px;padding:0 0 24px;border-bottom:1px solid #d9d9d9;">
  <p style="margin:0 0 6px;color:#555;font:12px/18px Arial,sans-serif;">${escapeHtml(item.publishedAt)}</p>
  <h3 style="margin:0 0 8px;font:700 18px/24px Arial,sans-serif;color:#1b1b1b;">${escapeHtml(item.title)}</h3>
  <p style="margin:0 0 10px;font:14px/21px Arial,sans-serif;color:#333;">${escapeHtml(item.summary)}</p>
  ${evidence}
  ${recordLinks ? `<p style="margin:0 0 10px;font:14px/20px Arial,sans-serif;">${recordLinks}</p>` : ''}
  <p style="margin:0;font:14px/20px Arial,sans-serif;">Sources: ${citations}</p>
</article>`
}

function isSitePath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !/[\u0000-\u001f\u007f"'<>]/.test(value)
}

export function renderDocument(issueDate: string, startDate: string, grouped: Map<Group, NewsItem[]>, email: boolean, draftReview = false): string {
  const sections = GROUPS.map((group) => {
    const items = grouped.get(group) ?? []
    if (items.length === 0) return ''
    return `<section style="margin:0 0 30px;"><h2 style="margin:0 0 16px;font:700 22px/28px Arial,sans-serif;color:#2b165a;">${group}</h2>${items.map(renderItem).join('\n')}</section>`
  }).join('\n')
  const title = `Structural Heart Weekly Digest — ${issueDate}`
  const content = `${sections || '<p style="font:14px/21px Arial,sans-serif;">No source-linked items were published in this window.</p>'}`
  const draftBanner = draftReview ? `<div style="margin:0 0 20px;padding:12px 14px;border:2px solid #9b2c2c;background:#fff5f5;color:#7f1d1d;font:700 13px/18px Arial,sans-serif;letter-spacing:.04em;">DRAFT REVIEW — FOR LOCAL REVIEW ONLY; DO NOT SEND</div>` : ''
  const main = `<main style="max-width:680px;margin:0 auto;padding:28px 20px;background:#ffffff;">
  ${draftBanner}
  <h1 style="margin:0 0 8px;font:700 28px/34px Arial,sans-serif;color:#1b1b1b;">${title}</h1>
  <p style="margin:0 0 28px;color:#555;font:14px/21px Arial,sans-serif;">Coverage window: ${startDate} through ${issueDate} (inclusive)</p>
  ${content}
  <hr style="border:0;border-top:1px solid #d9d9d9;margin:28px 0 16px;">
  <p style="margin:0;color:#555;font:12px/18px Arial,sans-serif;">${escapeHtml(DISCLAIMER)}</p>
</main>`
  // Tables and inline styles are retained by major email clients; no scripts, forms,
  // pixels, trackers, external assets, or web-font requests are emitted.
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#f4f4f4;">${email ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td>${main}</td></tr></table>` : main}</body></html>\n`
}

function parseDateArgument(args: string[], latestDate: string): string {
  const index = args.indexOf('--date')
  if (index === -1) return latestDate
  const value = args[index + 1]
  if (!value || args.filter((arg) => arg === '--date').length !== 1) throw new Error('Use --date YYYY-MM-DD at most once')
  return value
}

function readIndex(): DigestIndexEntry[] {
  const indexFile = join(DIGESTS_DIR, 'index.json')
  if (!existsSync(indexFile)) return []
  const parsed: unknown = JSON.parse(readFileSync(indexFile, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error('public/digests/index.json must be an array')
  return parsed as DigestIndexEntry[]
}

export function renderIssue(issueDateArg?: string): DigestIndexEntry {
  const news = loadNews()
  const latest = news.map((item) => item.publishedAt).sort().at(-1)
  if (!latest) throw new Error('No news items available')
  const issueDate = issueDateArg ?? latest
  const end = dateAtUtc(issueDate)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 6)
  const startDate = dateString(start)
  // Draft or unreviewed intelligence is preview-only. Legacy news records have
  // no reviewStatus and remain eligible for the established weekly digest.
  const selected = news.filter((item) => isSendableNewsItem(item) && item.publishedAt >= startDate && item.publishedAt <= issueDate)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id))
  const grouped = new Map<Group, NewsItem[]>(GROUPS.map((group) => [group, []]))
  for (const item of selected) grouped.get(groupFor(item))!.push(item)
  const outDir = join(DIGESTS_DIR, issueDate)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'index.html'), renderDocument(issueDate, startDate, grouped, false), 'utf8')
  writeFileSync(join(outDir, 'email.html'), renderDocument(issueDate, startDate, grouped, true), 'utf8')
  const entry: DigestIndexEntry = { issueDate, startDate, endDate: issueDate, itemCount: selected.length, href: `/digests/${issueDate}/`, emailHref: `/digests/${issueDate}/email.html` }
  const nextIndex = [...readIndex().filter((item) => item.issueDate !== issueDate), entry]
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
  writeFileSync(join(DIGESTS_DIR, 'index.json'), JSON.stringify(nextIndex, null, 2) + '\n', 'utf8')
  return entry
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  try {
    const latest = loadNews().map((item) => item.publishedAt).sort().at(-1)
    const entry = renderIssue(parseDateArgument(process.argv.slice(2), latest ?? ''))
    console.log(`✓ rendered ${entry.itemCount} items to public/digests/${entry.issueDate}/`)
  } catch (error) {
    console.error(`✗ newsletter render failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
