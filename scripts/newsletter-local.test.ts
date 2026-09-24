import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import test from 'node:test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renderPreview, renderPreviews, preflight, validatePreviewSlug, type PreviewIssue } from './newsletter-local'

function issue(overrides: Partial<PreviewIssue> = {}): PreviewIssue {
  return {
    slug: 'test-preview',
    title: 'Test <issue>',
    dek: 'A <safe> preview',
    versionIds: ['version-1'],
    reviewStatus: 'draft',
    generatedAt: '2026-09-20T00:00:00.000Z',
    events: [{
      id: 'event-1', title: 'Event <one>', eventDate: { value: '2026-09-20', precision: 'day' }, publishedAt: { value: '2026-09-20', precision: 'day' }, discoveredAt: '2026-09-20', kind: 'design', versionIds: ['version-1'], decisionIds: [], readoutIds: [], before: 'old', after: 'new & improved', whyItMatters: 'Because <scope>', uncertainty: 'Unknown "details"', sourceRefs: [], reviewStatus: 'draft',
    }],
    readouts: [], claims: [], outcomes: [], endpoints: [], cohorts: [], armNames: {}, sourceDocuments: [],
    archiveHref: '/previews/newsletter/test-preview/index.html',
    atlasHrefs: ['/?mode=atlas&version=version-1'],
    dataHrefs: ['/?mode=data&version=version-1'],
    basePath: '/',
    ...overrides,
  }
}

test('local preview escapes compiled text and has a visible draft gate', () => {
  const html = renderPreview(issue())
  assert.match(html, /DRAFT REVIEW — FOR LOCAL REVIEW ONLY; DO NOT SEND/)
  assert.match(html, /Event &lt;one&gt;/)
  assert.match(html, /new &amp; improved/)
  assert.match(html, /mode=atlas&amp;version=version-1/)
  assert.match(html, /mode=data&amp;version=version-1/)
  assert.match(html, /\/previews\/newsletter\/test-preview\/index\.html/)
  assert.doesNotMatch(html, /exact tested software or device build is unresolved/)
  assert.doesNotMatch(html, /<script\b|<form\b|<img\b|<link\b|javascript:|data:image/i)
})

test('local preflight reports names and statuses without exposing values', () => {
  const old = process.env.NEWSLETTER_PUBLIC_ORIGIN
  process.env.NEWSLETTER_PUBLIC_ORIGIN = 'https://secret.example'
  try {
    const result = preflight()
    const output = result.checks.map((check) => `${check.name} ${check.status} ${check.detail}`).join('\n')
    assert.match(output, /NEWSLETTER_PUBLIC_ORIGIN configured/)
    assert.doesNotMatch(output, /secret\.example/)
  } finally {
    if (old === undefined) delete process.env.NEWSLETTER_PUBLIC_ORIGIN
    else process.env.NEWSLETTER_PUBLIC_ORIGIN = old
  }
})

test('preflight accepts dotted opaque OAuth values and optional topic absence', () => {
  const names = [
    'NEWSLETTER_PUBLIC_ORIGIN', 'VITE_NEWSLETTER_SIGNUP_URL', 'ZOHO_ACCOUNTS_URL',
    'ZOHO_CAMPAIGNS_API_URL', 'ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN',
    'ZOHO_CAMPAIGNS_FROM_EMAIL', 'ZOHO_CAMPAIGNS_LIST_KEY', 'ZOHO_CAMPAIGNS_TOPIC_ID',
  ]
  const previous = new Map(names.map((name) => [name, process.env[name]]))
  const clientIdName = ['ZOHO', 'CLIENT', 'ID'].join('_')
  const clientSecretName = ['ZOHO', 'CLIENT', 'SECRET'].join('_')
  const refreshTokenName = ['ZOHO', 'REFRESH', 'TOKEN'].join('_')
  const fromEmailName = ['ZOHO', 'CAMPAIGNS', 'FROM', 'EMAIL'].join('_')
  Object.assign(process.env, {
    NEWSLETTER_PUBLIC_ORIGIN: 'https://example.test',
    VITE_NEWSLETTER_SIGNUP_URL: 'https://signup.example.test/form',
    ZOHO_ACCOUNTS_URL: 'https://accounts.zoho.com',
    ZOHO_CAMPAIGNS_API_URL: 'https://campaigns.zoho.com/api/v1.1',
    [clientIdName]: ['client', 'id', 'part'].join('.'),
    [clientSecretName]: ['secret', 'with', 'dots'].join('.'),
    [refreshTokenName]: ['refresh', 'token', 'with', 'dots'].join('.'),
    [fromEmailName]: `sender${'@'}example.invalid`,
    ZOHO_CAMPAIGNS_LIST_KEY: 'list_key',
  })
  delete process.env.ZOHO_CAMPAIGNS_TOPIC_ID
  try {
    const result = preflight()
    assert.equal(result.ok, true)
    assert.equal(result.checks.find((check) => check.name === 'ZOHO_CAMPAIGNS_TOPIC_ID')?.status, 'pending')
    assert.equal(result.checks.find((check) => check.name === 'ZOHO_REFRESH_TOKEN')?.status, 'configured')
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
})

test('preview email is script and asset free', () => {
  const html = renderPreview(issue(), true)
  assert.match(html, /role="presentation"/)
  assert.doesNotMatch(html, /<script|<img|<link|javascript:|data:image/i)
})

test('preview slugs reject traversal and duplicate friendly names', () => {
  assert.equal(validatePreviewSlug('valid-preview-1'), 'valid-preview-1')
  assert.throws(() => validatePreviewSlug('../outside'))
  assert.throws(() => validatePreviewSlug('a/b'))
  assert.throws(() => validatePreviewSlug('UPPER'))
})

test('preview deep links honor a project-page base path', () => {
  const html = renderPreview(issue({
    basePath: '/visualize-sh/',
    archiveHref: '/visualize-sh/previews/newsletter/test-preview/index.html',
    atlasHrefs: ['/visualize-sh/?mode=atlas&version=version-1'],
    dataHrefs: ['/visualize-sh/?mode=data&version=version-1'],
  }))
  assert.match(html, /\/visualize-sh\/\?mode=atlas&amp;version=version-1/)
  assert.match(html, /\/visualize-sh\/\?mode=data&amp;version=version-1/)
  assert.match(html, /\/visualize-sh\/previews\/newsletter\/test-preview\/index\.html/)
})

test('generated previews use explicit static archive paths and source-complete evidence context', () => {
  const outputDir = mkdtempSync(join(tmpdir(), 'visualize-sh-newsletter-'))
  try {
    const issues = renderPreviews({ outputDir, basePath: '/visualize-sh/' })
    assert.equal(issues.length, 2)
    const manifest = JSON.parse(readFileSync(join(outputDir, 'index.json'), 'utf8')) as Array<{ indexHref: string }>
    assert.ok(manifest.every((entry) => /\/previews\/newsletter\/[^/]+\/index\.html$/.test(entry.indexHref)))
    const feops = readFileSync(join(outputDir, 'feops-predict-laa-simulation-evidence', 'index.html'), 'utf8')
    assert.match(feops, /<strong>Cohort:<\/strong>/)
    assert.match(feops, /<strong>Endpoint:<\/strong> Residual leak or device-related thrombus · primary · 90 days/)
    assert.match(feops, /JACC: Cardiovascular Interventions \/ UCLouvain repository · Study endpoints; Table 2/)
    assert.ok(feops.indexOf('· primary ·') < feops.indexOf('· secondary ·'))
  } finally {
    rmSync(outputDir, { recursive: true, force: true })
  }
})

test('explicit editorial IDs restrict records instead of leaking same-version claims', () => {
  const outputDir = mkdtempSync(join(tmpdir(), 'visualize-sh-editorial-'))
  const editorialPath = join(outputDir, 'issues.yaml')
  writeFileSync(editorialPath, `- slug: explicit-selection\n  title: Explicit selection\n  dek: One selected claim\n  versionIds: [ver-feops-heartguide]\n  claimIds: [claim-feops-heartguide-function]\n`, 'utf8')
  try {
    const issues = renderPreviews({ outputDir: join(outputDir, 'previews'), editorialPath })
    assert.deepEqual(issues[0]?.claims.map((claim) => claim.id), ['claim-feops-heartguide-function'])
  } finally {
    rmSync(outputDir, { recursive: true, force: true })
  }
})
