/** Build local-only flagship newsletter previews from compiled intelligence. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import type {
  EvidenceClaim,
  IntelligenceData,
  IntelligenceEvent,
  EndpointDefinition,
  OutcomeObservation,
  Provenance,
  SourceDocument,
  TrialCohort,
  TrialReadout,
} from '../src/types/intelligence'
import { loadLegacyIds, validateIntelligence } from './intelligence/validation'
import { escapeHtml, isHttpsUrl } from './render-newsletter'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INTELLIGENCE_FILE = join(ROOT, 'data', 'intelligence', 'pilot.yaml')
const COMPILED_INTELLIGENCE_FILE = join(ROOT, 'public', 'intelligence.json')
const INTELLIGENCE_SCHEMA_FILE = join(ROOT, 'schema', 'intelligence.schema.json')
const EDITORIAL_FILE = join(ROOT, 'data', 'editorial-issues.yaml')
const PREVIEW_DIR = join(ROOT, 'public', 'previews', 'newsletter')
const REQUIRED_ENV = [
  'NEWSLETTER_PUBLIC_ORIGIN',
  'VITE_NEWSLETTER_SIGNUP_URL',
  'ZOHO_ACCOUNTS_URL',
  'ZOHO_CAMPAIGNS_API_URL',
  'ZOHO_CLIENT_ID',
  'ZOHO_CLIENT_SECRET',
  'ZOHO_REFRESH_TOKEN',
  'ZOHO_CAMPAIGNS_FROM_EMAIL',
  'ZOHO_CAMPAIGNS_LIST_KEY',
] as const
const OPTIONAL_ENV = ['ZOHO_CAMPAIGNS_TOPIC_ID'] as const

type ReviewStatus = 'draft' | 'reviewed'
interface EditorialIssue { slug: string; title: string; dek: string; versionIds: string[]; eventIds?: string[]; readoutIds?: string[]; claimIds?: string[] }
export interface PreviewIssue extends EditorialIssue {
  reviewStatus: ReviewStatus
  generatedAt: string
  events: IntelligenceEvent[]
  readouts: TrialReadout[]
  claims: EvidenceClaim[]
  outcomes: OutcomeObservation[]
  endpoints: EndpointDefinition[]
  cohorts: TrialCohort[]
  armNames: Record<string, string>
  sourceDocuments: SourceDocument[]
  archiveHref: string
  atlasHrefs: string[]
  dataHrefs: string[]
  basePath: string
}
export interface PreflightCheck { name: string; status: 'configured' | 'missing' | 'invalid' | 'pending'; detail: string }
export interface PreflightResult { ok: boolean; checks: PreflightCheck[]; manualRequirements: string[] }

function fail(message: string): never { throw new Error(`newsletter local: ${message}`) }
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`)
  return value as Record<string, unknown>
}
function list(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) fail(`${label} must be a list`)
  return value
}
function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} must be a non-empty string`)
  return value
}
function stringList(value: unknown, label: string): string[] {
  return list(value, label).map((child, index) => text(child, `${label}[${index}]`))
}
function parseYamlFile<T>(path: string, label: string): T {
  if (!existsSync(path)) fail(`${label} is not present at ${path}`)
  try { return yaml.load(readFileSync(path, 'utf8'), { schema: yaml.CORE_SCHEMA }) as T } catch (error) { fail(`${label} has invalid YAML syntax: ${error instanceof Error ? error.message : String(error)}`) }
}

function loadIntelligence(path?: string): IntelligenceData {
  const inputPath = path ?? (existsSync(COMPILED_INTELLIGENCE_FILE) ? COMPILED_INTELLIGENCE_FILE : INTELLIGENCE_FILE)
  const value = object(path?.endsWith('.json') || inputPath.endsWith('.json')
    ? JSON.parse(readFileSync(inputPath, 'utf8')) as unknown
    : parseYamlFile<unknown>(inputPath, 'compiled intelligence'), 'compiled intelligence')
  return validateIntelligence(value, {
    schemaPath: INTELLIGENCE_SCHEMA_FILE,
    legacyIds: loadLegacyIds(join(ROOT, 'data'), join(ROOT, 'public', 'graph.json')),
  })
}
function normalizeBasePath(value = process.env.VITE_BASE ?? '/'): string {
  const base = value.trim() || '/'
  if (!base.startsWith('/') || /[\u0000-\u001f\u007f"'<>]/.test(base) || base.includes('..')) fail('base must be a site path such as / or /visualize-sh/')
  return base.endsWith('/') ? base : `${base}/`
}
export function validatePreviewSlug(slug: string): string {
  if (slug.length > 96 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail(`invalid preview slug "${slug}"`)
  return slug
}
function loadEditorialIssues(path = EDITORIAL_FILE): EditorialIssue[] {
  return list(parseYamlFile<unknown>(path, 'editorial issues'), 'editorial issues').map((value, index) => {
    const item = object(value, `editorial issues[${index}]`)
    return {
      slug: text(item.slug, `editorial issues[${index}].slug`),
      title: text(item.title, `editorial issues[${index}].title`),
      dek: text(item.dek, `editorial issues[${index}].dek`),
      versionIds: stringList(item.versionIds, `editorial issues[${index}].versionIds`),
      eventIds: item.eventIds === undefined ? undefined : stringList(item.eventIds, `editorial issues[${index}].eventIds`),
      readoutIds: item.readoutIds === undefined ? undefined : stringList(item.readoutIds, `editorial issues[${index}].readoutIds`),
      claimIds: item.claimIds === undefined ? undefined : stringList(item.claimIds, `editorial issues[${index}].claimIds`),
    }
  })
}

function statusOf(value: Provenance): ReviewStatus { return value.reviewStatus === 'reviewed' ? 'reviewed' : 'draft' }
function sourceIds(value: Provenance): string[] { return value.sourceRefs.map((ref) => ref.sourceId) }
function pathHref(basePath: string, mode: 'atlas' | 'data', id: string): string {
  return `${basePath}?mode=${mode}&version=${encodeURIComponent(id)}`
}
function sourceHref(source: SourceDocument | undefined): string | undefined {
  if (!source || !isHttpsUrl(source.url)) return undefined
  return source.url
}
function sourceMap(data: IntelligenceData): Map<string, SourceDocument> { return new Map(data.sources.map((source) => [source.id, source])) }

function selected<T extends { id: string; versionIds?: string[]; versionId?: string }>(items: T[], ids: string[] | undefined, versionIds: string[]): T[] {
  if (ids !== undefined) {
    const requested = new Set(ids)
    return items.filter((item) => requested.has(item.id))
  }
  return items.filter((item) => (item.versionIds ?? []).some((id: string) => versionIds.includes(id)) || (item.versionId ? versionIds.includes(item.versionId) : false))
}

function buildIssue(spec: EditorialIssue, data: IntelligenceData, basePath: string, generatedAt = data.updatedAt): PreviewIssue {
  validatePreviewSlug(spec.slug)
  const versions = new Set(spec.versionIds)
  const knownVersions = new Set(data.versions.map((version) => version.id))
  for (const id of spec.versionIds) if (!knownVersions.has(id)) fail(`editorial issue ${spec.slug} references missing version ${id}`)
  const knownEvents = new Set(data.events.map((event) => event.id))
  const knownReadouts = new Set(data.readouts.map((readout) => readout.id))
  const knownClaims = new Set(data.claims.map((claim) => claim.id))
  for (const id of spec.eventIds ?? []) if (!knownEvents.has(id)) fail(`editorial issue ${spec.slug} references missing event ${id}`)
  for (const id of spec.readoutIds ?? []) if (!knownReadouts.has(id)) fail(`editorial issue ${spec.slug} references missing readout ${id}`)
  for (const id of spec.claimIds ?? []) if (!knownClaims.has(id)) fail(`editorial issue ${spec.slug} references missing claim ${id}`)
  const allEvents = spec.eventIds?.length
    ? (data.events ?? []).filter((event) => spec.eventIds!.includes(event.id))
    : (data.events ?? []).filter((event) => event.versionIds.some((id) => versions.has(id)))
  const eventReadoutIds = allEvents.flatMap((event) => event.readoutIds)
  const readoutIds = spec.readoutIds !== undefined || spec.eventIds !== undefined
    ? [...new Set([...(spec.readoutIds ?? []), ...eventReadoutIds])]
    : undefined
  const allReadouts = selected(data.readouts ?? [], readoutIds, spec.versionIds)
  const allClaims = selected(data.claims ?? [], spec.claimIds, spec.versionIds)
  // An issue may omit optional IDs and assemble records through its explicit
  // version scope. Explicit IDs are checked above and never silently guessed.
  const events = allEvents
  const readouts = allReadouts
  const claims = allClaims
  const readoutIdSet = new Set(readouts.map((item) => item.id))
  const outcomes = (data.outcomes ?? []).filter((outcome) => readoutIdSet.has(outcome.readoutId))
  const endpointIds = new Set(outcomes.map((outcome) => outcome.endpointId))
  const endpoints = data.endpoints.filter((endpoint) => endpointIds.has(endpoint.id))
  const cohorts = new Map(data.cohorts.map((cohort) => [cohort.id, cohort]))
  const selectedCohorts = readouts.map((readout) => cohorts.get(readout.cohortId)).filter((cohort): cohort is TrialCohort => Boolean(cohort))
  const armNames: Record<string, string> = {}
  for (const readout of readouts) {
    const cohort = cohorts.get(readout.cohortId)
    for (const arm of cohort?.arms ?? []) armNames[arm.id] = arm.name
  }
  const records: Provenance[] = [...events, ...readouts, ...claims, ...outcomes, ...endpoints, ...selectedCohorts]
  const reviewStatus: ReviewStatus = records.length > 0 && records.every((record) => statusOf(record) === 'reviewed') ? 'reviewed' : 'draft'
  const sources = sourceMap(data)
  const sourceDocuments = [...new Set(records.flatMap(sourceIds))].map((id) => sources.get(id)).filter((value): value is SourceDocument => Boolean(value))
  return {
    ...spec,
    reviewStatus,
    generatedAt,
    events,
    readouts,
    claims,
    outcomes,
    endpoints,
    cohorts: selectedCohorts,
    armNames,
    sourceDocuments,
    archiveHref: `${basePath}previews/newsletter/${spec.slug}/index.html`,
    atlasHrefs: spec.versionIds.map((id) => pathHref(basePath, 'atlas', id)),
    dataHrefs: spec.versionIds.map((id) => pathHref(basePath, 'data', id)),
    basePath,
  }
}

function linksFor(value: Provenance, sources: Map<string, SourceDocument>): string {
  return value.sourceRefs.map((ref) => {
    const source = sources.get(ref.sourceId)
    const url = sourceHref(source)
    if (!url) return ''
    const label = `${source?.publisher ?? 'Source'} · ${ref.locator}`
    return `<a href="${escapeHtml(url)}" style="color:#5427a6;text-decoration:underline;">${escapeHtml(label)}</a>`
  }).filter(Boolean).join(' · ')
}
function valueText(value: unknown): string {
  if (value === undefined || value === null) return 'not reported'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
function evidenceDateText(value: { value: string; precision: string }): string {
  return value.precision === 'day' ? value.value : `${value.value} (${value.precision})`
}
function outcomeStats(outcome: OutcomeObservation, armNames: Record<string, string>): string {
  const parts: string[] = []
  if (outcome.arms.length) {
    parts.push(outcome.arms.map((arm) => `${armNames[arm.armId] ?? arm.armId}: ${valueText(arm.value)} ${arm.unit}${arm.denominator === undefined ? '' : ` (n=${arm.denominator})`}`).join('; '))
  }
  if (outcome.effect) {
    const ci = outcome.effect.ci
    let effect = `${outcome.effect.measure} ${outcome.effect.value}${outcome.effect.unit ? ` ${outcome.effect.unit}` : ''}`
    if (ci) {
      const bounds = [ci.lower, ci.upper].filter((bound): bound is number => bound !== undefined).join(' to ')
      const level = ci.level === undefined ? 'CI level not reported' : `${ci.level}% CI`
      effect += `; ${level} ${bounds || 'bounds not reported'} (${ci.sidedness.replace('_', '-')})`
    }
    parts.push(effect)
  }
  if (outcome.pValue !== undefined) parts.push(`P${outcome.pValueQualifier ?? '='}${outcome.pValue}`)
  return parts.length ? `<p style="margin:0 0 8px;font:13px/19px Arial,sans-serif;color:#444;"><strong>Reported statistics:</strong> ${escapeHtml(parts.join(' · '))}</p>` : ''
}
function renderEvent(event: IntelligenceEvent, sources: Map<string, SourceDocument>): string {
  const beforeAfter = event.before.trim() ? `${event.before} → ${event.after}` : event.after
  return `<article style="margin:0 0 24px;padding:0 0 20px;border-bottom:1px solid #d9d9d9;"><p style="margin:0 0 6px;color:#555;font:12px/18px Arial,sans-serif;">${escapeHtml(evidenceDateText(event.eventDate))} · ${escapeHtml(event.kind)}</p><h3 style="margin:0 0 8px;font:700 19px/25px Arial,sans-serif;color:#1b1b1b;">${escapeHtml(event.title)}</h3><p style="margin:0 0 8px;font:14px/21px Arial,sans-serif;color:#333;"><strong>Change:</strong> ${escapeHtml(beforeAfter)}</p><p style="margin:0 0 8px;font:14px/21px Arial,sans-serif;color:#333;"><strong>Why it matters:</strong> ${escapeHtml(event.whyItMatters)}</p><p style="margin:0 0 8px;font:14px/21px Arial,sans-serif;color:#333;"><strong>Uncertainty:</strong> ${escapeHtml(event.uncertainty)}</p><p style="margin:0;font:13px/19px Arial,sans-serif;">${linksFor(event, sources)}</p></article>`
}
function renderReadout(readout: TrialReadout, outcomes: OutcomeObservation[], endpoints: Map<string, EndpointDefinition>, cohorts: Map<string, TrialCohort>, armNames: Record<string, string>, sources: Map<string, SourceDocument>): string {
  const rows = outcomes.filter((outcome) => outcome.readoutId === readout.id).sort((left, right) => {
    const rank = (value: OutcomeObservation) => endpoints.get(value.endpointId)?.hierarchy === 'primary' ? 0 : endpoints.get(value.endpointId)?.hierarchy === 'secondary' ? 1 : 2
    return rank(left) - rank(right) || left.endpointId.localeCompare(right.endpointId)
  }).map((outcome) => {
    const endpoint = endpoints.get(outcome.endpointId)
    const endpointDetails = endpoint ? `<p style="margin:0 0 8px;font:13px/19px Arial,sans-serif;color:#444;"><strong>Endpoint:</strong> ${escapeHtml(endpoint.name)} · ${escapeHtml(endpoint.hierarchy)} · ${escapeHtml(endpoint.timeframe)} · ${escapeHtml(endpoint.analysisPopulation)} · ${linksFor(endpoint, sources)}</p>` : ''
    return `<li>${endpointDetails}${outcomeStats(outcome, armNames)}${escapeHtml(outcome.interpretation)}${outcome.limitation ? ` <span>(Limitation: ${escapeHtml(outcome.limitation)})</span>` : ''}</li>`
  }).join('')
  const cohort = cohorts.get(readout.cohortId)
  const cohortLine = cohort ? `<p style="margin:0 0 8px;font:13px/19px Arial,sans-serif;color:#444;"><strong>Cohort:</strong> ${escapeHtml(cohort.name)} · ${escapeHtml(cohort.population)} · ${linksFor(cohort, sources)}</p>` : ''
  return `<article style="margin:0 0 24px;padding:0 0 20px;border-bottom:1px solid #d9d9d9;"><h3 style="margin:0 0 8px;font:700 19px/25px Arial,sans-serif;color:#1b1b1b;">${escapeHtml(readout.title)}</h3><p style="margin:0 0 8px;font:14px/21px Arial,sans-serif;color:#333;">Published ${escapeHtml(evidenceDateText(readout.publishedAt))} · ${escapeHtml(readout.followUp)} · ${escapeHtml(readout.maturity)} readout</p>${cohortLine}${readout.limitation ? `<p style="margin:0 0 8px;font:14px/21px Arial,sans-serif;color:#333;"><strong>Uncertainty:</strong> ${escapeHtml(readout.limitation)}</p>` : ''}${rows ? `<ul style="margin:0 0 8px;padding-left:20px;font:14px/21px Arial,sans-serif;color:#333;">${rows}</ul>` : ''}<p style="margin:0;font:13px/19px Arial,sans-serif;">${linksFor(readout, sources)}</p></article>`
}
function renderClaim(claim: EvidenceClaim, sources: Map<string, SourceDocument>): string {
  const basis = claim.basis === 'directly_reported' ? 'Directly reported' : claim.basis === 'derived' ? 'Derived' : 'Analyst interpretation'
  const availability = claim.availability === 'reported' ? 'Reported' : claim.availability === 'not_yet_reviewed' ? 'Not yet reviewed' : claim.availability === 'not_publicly_disclosed' ? 'Not publicly disclosed' : claim.availability === 'not_applicable' ? 'Not applicable' : 'Conflicting public record'
  const missing = claim.value === undefined || claim.value === null
  const value = missing ? `<span>[${escapeHtml(availability)}]</span>` : `${escapeHtml(valueText(claim.value))}${claim.unit ? ` ${escapeHtml(claim.unit)}` : ''} <span>[${escapeHtml(basis)} · ${escapeHtml(availability)}]</span>`
  return `<li style="margin:0 0 8px;font:14px/21px Arial,sans-serif;color:#333;"><strong>${escapeHtml(claim.label)}:</strong> ${value}${claim.context ? ` <span>(${escapeHtml(claim.context)})</span>` : ''}${claim.limitation ? ` <span>Limitation: ${escapeHtml(claim.limitation)}</span>` : ''} ${linksFor(claim, sources)}</li>`
}

export function renderPreview(issue: PreviewIssue, email = false): string {
  const sources = new Map(issue.sourceDocuments.map((source) => [source.id, source]))
  const banner = '<div style="margin:0 0 20px;padding:12px 14px;border:2px solid #9b2c2c;background:#fff5f5;color:#7f1d1d;font:700 13px/18px Arial,sans-serif;letter-spacing:.04em;">DRAFT REVIEW — FOR LOCAL REVIEW ONLY; DO NOT SEND</div>'
  const events = issue.events.map((event) => renderEvent(event, sources)).join('')
  const endpointMap = new Map(issue.endpoints.map((endpoint) => [endpoint.id, endpoint]))
  const cohortMap = new Map(issue.cohorts.map((cohort) => [cohort.id, cohort]))
  const readouts = issue.readouts.map((readout) => renderReadout(readout, issue.outcomes, endpointMap, cohortMap, issue.armNames, sources)).join('')
  const claims = issue.claims.length ? `<section style="margin:0 0 26px;"><h2 style="font:700 21px/27px Arial,sans-serif;color:#2b165a;">Design and operating context</h2><ul style="padding-left:20px;">${issue.claims.map((claim) => renderClaim(claim, sources)).join('')}</ul></section>` : ''
  const atlasLinks = issue.atlasHrefs.map((href, index) => `<a href="${escapeHtml(href)}" style="color:#5427a6;text-decoration:underline;margin-right:14px;">Atlas ${index + 1}</a>`).join('')
  const dataLinks = issue.dataHrefs.map((href, index) => `<a href="${escapeHtml(href)}" style="color:#5427a6;text-decoration:underline;margin-right:14px;">Data ${index + 1}</a>`).join('')
  const familyContext = issue.readouts.some((readout) => readout.versionIds.length === 0) ? '<p style="margin:8px 0 0;font:13px/19px Arial,sans-serif;color:#555;">Atlas link is family-level context; the exact tested software or device build is unresolved in the compiled record.</p>' : ''
  const archiveLink = issue.archiveHref.startsWith('/') ? `<a href="${escapeHtml(issue.archiveHref)}" style="color:#5427a6;text-decoration:underline;">Preview archive</a>` : ''
  const content = `${banner}<p style="margin:0 0 24px;font:15px/22px Arial,sans-serif;color:#444;">${escapeHtml(issue.dek)}</p>${events ? `<section style="margin:0 0 26px;"><h2 style="font:700 21px/27px Arial,sans-serif;color:#2b165a;">What changed</h2>${events}</section>` : ''}${readouts ? `<section style="margin:0 0 26px;"><h2 style="font:700 21px/27px Arial,sans-serif;color:#2b165a;">Evidence in context</h2>${readouts}</section>` : ''}${claims}<section style="margin:0 0 26px;"><h2 style="font:700 21px/27px Arial,sans-serif;color:#2b165a;">Atlas and Data</h2><p style="font:14px/21px Arial,sans-serif;">${atlasLinks}${dataLinks}</p>${familyContext}</section><p style="font:12px/18px Arial,sans-serif;color:#555;">${archiveLink} · Compiled records may be draft or awaiting review. This local preview is not a clinical advice tool and is not eligible for a weekly send.</p>`
  const title = `VISUALIZE-SH — ${issue.title}`
  const main = `<main style="max-width:680px;margin:0 auto;padding:28px 20px;background:#fff;"><p style="margin:0 0 8px;font:12px/18px Arial,sans-serif;color:#7f1d1d;">LOCAL PREVIEW · ${escapeHtml(issue.reviewStatus.toUpperCase())}</p><h1 style="margin:0 0 10px;font:700 28px/34px Arial,sans-serif;color:#1b1b1b;">${escapeHtml(issue.title)}</h1>${content}<hr style="border:0;border-top:1px solid #d9d9d9;margin:28px 0 16px;"><p style="margin:0;color:#555;font:12px/18px Arial,sans-serif;">For educational and source-review use only. Verify the linked primary records before relying on any statement.</p></main>`
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#f4f4f4;">${email ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td>${main}</td></tr></table>` : main}</body></html>\n`
}

function envUrl(name: string): PreflightCheck {
  const value = process.env[name]?.trim()
  if (!value) return { name, status: 'missing', detail: 'not set' }
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('HTTPS URL without credentials required')
    return { name, status: 'configured', detail: 'set; value withheld' }
  } catch { return { name, status: 'invalid', detail: 'must be an HTTPS URL; value withheld' } }
}
function envSecret(name: string, kind: 'email' | 'identifier' | 'opaque' = 'identifier'): PreflightCheck {
  const value = process.env[name]?.trim()
  if (!value) return { name, status: 'missing', detail: 'not set' }
  const valid = kind === 'opaque'
    ? value.length <= 2048 && !(/[\s\u0000-\u001f\u007f]/.test(value))
    : kind === 'email'
    ? value.length <= 254 && !(/[\s\u0000-\u001f\u007f]/.test(value)) && /^[^@]+@[^@]+\.[^@]+$/.test(value)
    : value.length <= 256 && /^[A-Za-z0-9_-]+$/.test(value)
  return { name, status: valid ? 'configured' : 'invalid', detail: valid ? 'set; value withheld' : 'format invalid; value withheld' }
}
export function preflight(): PreflightResult {
  const checks: PreflightCheck[] = REQUIRED_ENV.map((name) => {
    if (name.endsWith('_URL') || name.endsWith('_ORIGIN')) return envUrl(name)
    if (name === 'ZOHO_CAMPAIGNS_FROM_EMAIL') return envSecret(name, 'email')
    if (name === 'ZOHO_CLIENT_ID' || name === 'ZOHO_CLIENT_SECRET' || name === 'ZOHO_REFRESH_TOKEN') return envSecret(name, 'opaque')
    return envSecret(name)
  })
  const origin = process.env.NEWSLETTER_PUBLIC_ORIGIN?.trim()
  if (origin) {
    try {
      const parsed = new URL(origin)
      if (parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error()
      checks.push({ name: 'NEWSLETTER_PUBLIC_ORIGIN shape', status: 'configured', detail: 'origin shape checked; value withheld' })
    } catch { checks.push({ name: 'NEWSLETTER_PUBLIC_ORIGIN shape', status: 'invalid', detail: 'must be an HTTPS origin without a path; value withheld' }) }
  }
  for (const name of OPTIONAL_ENV) checks.push(process.env[name]?.trim() ? envSecret(name) : { name, status: 'pending', detail: 'optional; not set' })
  const accounts = process.env.ZOHO_ACCOUNTS_URL?.trim()
  const campaigns = process.env.ZOHO_CAMPAIGNS_API_URL?.trim()
  if (accounts && campaigns) {
    try {
      const a = new URL(accounts); const c = new URL(campaigns)
      const match = new Map([['accounts.zoho.com', 'campaigns.zoho.com'], ['accounts.zoho.eu', 'campaigns.zoho.eu'], ['accounts.zoho.in', 'campaigns.zoho.in'], ['accounts.zoho.com.au', 'campaigns.zoho.com.au'], ['accounts.zoho.jp', 'campaigns.zoho.jp'], ['accounts.zoho.com.cn', 'campaigns.zoho.com.cn']]).get(a.hostname)
      checks.push({ name: 'ZOHO data-center pair', status: match === c.hostname && a.pathname === '/' && c.pathname === '/api/v1.1' && !a.port && !c.port && !a.search && !c.search && !a.hash && !c.hash ? 'configured' : 'invalid', detail: 'host pair checked; values withheld' })
    } catch { checks.push({ name: 'ZOHO data-center pair', status: 'invalid', detail: 'URL syntax invalid; values withheld' }) }
  } else checks.push({ name: 'ZOHO data-center pair', status: 'pending', detail: 'requires both Zoho endpoint URLs' })
  const manualRequirements = ['Create the Zoho Campaigns organization and enter the public identity, mailing address, privacy URL, verified sender, and unsubscribe footer.', 'Publish and verify SPF and DKIM for the sending domain and maintain an appropriate DMARC policy.', 'Create the consent-controlled list/topic and hosted HTTPS signup form; enable double opt-in and retain the signup URL.', 'Disable Zoho open, click, plain-text, reply, Google Analytics, and website-activity tracking.', 'Configure NEWSLETTER_PUBLIC_ORIGIN only after HTTPS deployment; verify the exact public email URL and review the Zoho test-list import manually.']
  return { ok: checks.every((check) => check.status !== 'missing' && check.status !== 'invalid'), checks, manualRequirements }
}

export function renderPreviews(options: { intelligencePath?: string; editorialPath?: string; generatedAt?: string; basePath?: string; outputDir?: string } = {}): PreviewIssue[] {
  const data = loadIntelligence(options.intelligencePath)
  const basePath = normalizeBasePath(options.basePath)
  const specs = loadEditorialIssues(options.editorialPath)
  const slugs = new Set<string>()
  for (const spec of specs) {
    validatePreviewSlug(spec.slug)
    if (slugs.has(spec.slug)) fail(`duplicate preview slug "${spec.slug}"`)
    slugs.add(spec.slug)
  }
  const outputRoot = resolve(options.outputDir ?? PREVIEW_DIR)
  const issues = specs.map((spec) => buildIssue(spec, data, basePath, options.generatedAt ?? data.updatedAt))
  mkdirSync(outputRoot, { recursive: true })
  for (const issue of issues) {
    const directory = resolve(outputRoot, issue.slug)
    if (directory !== outputRoot && !directory.startsWith(`${outputRoot}/`)) fail(`preview slug escapes output directory: ${issue.slug}`)
    mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, 'index.html'), renderPreview(issue, false), 'utf8')
    writeFileSync(join(directory, 'email.html'), renderPreview(issue, true), 'utf8')
  }
  writeFileSync(join(outputRoot, 'index.json'), `${JSON.stringify(issues.map(({ events, readouts, claims, outcomes, sourceDocuments, endpoints, cohorts, armNames, ...manifest }) => ({ ...manifest, itemCount: events.length + readouts.length + claims.length + outcomes.length, indexHref: `${basePath}previews/newsletter/${manifest.slug}/index.html`, emailHref: `${basePath}previews/newsletter/${manifest.slug}/email.html` })), null, 2)}\n`, 'utf8')
  return issues
}

function main(args: string[]): void {
  if (args.includes('--send') || args.includes('--draft')) fail('this local command never creates or sends Zoho campaigns')
  const dryRun = args.includes('--dry-run')
  const check = preflight()
  console.log(`local preflight: ${check.ok ? 'ready' : 'action required'}`)
  for (const item of check.checks) console.log(`${item.status.toUpperCase()} ${item.name}: ${item.detail}`)
  if (!check.ok) console.log('Remaining manual Zoho/domain requirements:')
  for (const item of check.manualRequirements) console.log(`- ${item}`)
  if (dryRun) { console.log('dry-run: no files written and no Zoho request made'); return }
  const baseArgument = args.indexOf('--base')
  const basePath = baseArgument === -1 ? undefined : args[baseArgument + 1]
  if (baseArgument !== -1 && !basePath) fail('--base requires a site path such as / or /visualize-sh/')
  const issues = renderPreviews({ basePath })
  console.log(`✓ rendered ${issues.length} local preview issues under public/previews/newsletter/`)
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) { try { main(process.argv.slice(2)) } catch (error) { console.error(`✗ ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1 } }
