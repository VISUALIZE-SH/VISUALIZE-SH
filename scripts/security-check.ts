/** Heuristic CI scan for known secret, email, and browser-tracking patterns. */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  cwd: ROOT,
  encoding: 'utf8',
}).split('\0').filter(Boolean)
// Include untracked, unignored files so the same command catches local
// mistakes before they are staged; ignored private artifacts stay out of scope.

const binaryExtensions = new Set([
  '.avif', '.gif', '.ico', '.jpeg', '.jpg', '.pdf', '.png', '.webp', '.woff', '.woff2', '.zip',
])
const secretPatterns: Array<{ name: string; pattern: RegExp }> = [
  { name: 'private key material', pattern: /-----BEGIN(?: [A-Z0-9]+)* PRIVATE KEY-----/g },
  { name: 'OpenAI-style API key', pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { name: 'GitHub access token', pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g },
  { name: 'Zoho OAuth token', pattern: /\b1000\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g },
]
const emailPattern = /[A-Z0-9._%+\-\[\]]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const literalSecretAssignment = /\b(OPENAI_API_KEY|ZOHO_CLIENT_SECRET|ZOHO_REFRESH_TOKEN)\s*[:=]\s*["']?([^\s"'#}]+)/g
const browserTrackingPatterns: Array<{ name: string; pattern: RegExp }> = [
  { name: 'cookie API', pattern: /\bdocument\.cookie\b/g },
  { name: 'analytics API', pattern: /\b(?:gtag|ga\s*\(|mixpanel|posthog|analytics\.track)\b/gi },
  { name: 'analytics host', pattern: /(?:google-analytics\.com|googletagmanager\.com|plausible\.io|api\.segment\.io)/gi },
  { name: 'tracking pixel markup', pattern: /<img\b[^>]*(?:width=["']?1["']?[^>]*height=["']?1|height=["']?1["']?[^>]*width=["']?1)/gi },
]
const browserStorageApi = /\b(?:window\.)?(?:localStorage|sessionStorage)\s*(?:\.|\[)/g
const allowedThemeStorageLines = new Map([
  ['src/theme.ts', new Set([
    'const saved = window.localStorage.getItem(THEME_STORAGE_KEY)',
    'window.localStorage.setItem(THEME_STORAGE_KEY, preference)',
  ])],
])

interface Finding { file: string; line: number; type: string }
const findings: Finding[] = []
function lineNumber(text: string, offset: number): number {
  let line = 1
  for (let i = 0; i < offset; i++) if (text.charCodeAt(i) === 10) line++
  return line
}
function addMatches(file: string, text: string, type: string, pattern: RegExp): void {
  pattern.lastIndex = 0
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    findings.push({ file, line: lineNumber(text, match.index), type })
    if (match[0].length === 0) pattern.lastIndex++
  }
}

let scanned = 0
for (const file of [...new Set(files)].sort()) {
  if (binaryExtensions.has(extname(file).toLowerCase())) continue
  let text: string
  try { text = readFileSync(resolve(ROOT, file), 'utf8') } catch { continue }
  if (text.includes('\0')) continue
  scanned++
  for (const candidate of secretPatterns) addMatches(file, text, candidate.name, candidate.pattern)
  addMatches(file, text, 'email address', emailPattern)

  literalSecretAssignment.lastIndex = 0
  for (let match = literalSecretAssignment.exec(text); match; match = literalSecretAssignment.exec(text)) {
    const value = match[2]
    if (value.startsWith('${{') || value.startsWith('$') || /^(YOUR_|REPLACE_|<)/.test(value)) continue
    findings.push({ file, line: lineNumber(text, match.index), type: `literal ${match[1]} assignment` })
  }

  if (file === 'index.html' || file.startsWith('src/') || file.startsWith('public/')) {
    for (const candidate of browserTrackingPatterns) addMatches(file, text, candidate.name, candidate.pattern)
    browserStorageApi.lastIndex = 0
    for (let match = browserStorageApi.exec(text); match; match = browserStorageApi.exec(text)) {
      const line = text.slice(text.lastIndexOf('\n', match.index) + 1, text.indexOf('\n', match.index) < 0 ? text.length : text.indexOf('\n', match.index)).trim()
      if (allowedThemeStorageLines.get(file)?.has(line)) continue
      findings.push({ file, line: lineNumber(text, match.index), type: 'unapproved persistent browser storage API' })
    }
  }
  if (file.startsWith('.github/workflows/') && /\.ya?ml$/i.test(file)) {
    addMatches(file, text, 'dangerous pull_request_target trigger', /^\s*pull_request_target\s*:/gm)
    addMatches(file, text, 'workflow-wide write-all permission', /^\s*permissions\s*:\s*write-all\s*$/gm)
    addMatches(file, text, 'shell tracing can expose secrets', /\bset\s+-[^\n]*x/g)
    const actionUse = /^\s*uses:\s*(?!\.\/)([^@\s]+)@([^\s#]+)/gm
    for (let match = actionUse.exec(text); match; match = actionUse.exec(text)) {
      if (!/^[0-9a-f]{40}$/.test(match[2])) {
        findings.push({ file, line: lineNumber(text, match.index), type: 'GitHub Action is not pinned to a full commit SHA' })
      }
    }
  }
  if (file.startsWith('public/digests/') && file.endsWith('.html')) {
    addMatches(file, text, 'active content in static digest', /<(?:script|iframe|form|object|embed)\b/gi)
    addMatches(file, text, 'remote asset in static digest', /\b(?:src|background)\s*=|url\s*\(/gi)
  }
}

const unique = [...new Map(findings.map(finding => [`${finding.file}:${finding.line}:${finding.type}`, finding])).values()]
if (unique.length > 0) {
  console.error(`Security check failed with ${unique.length} finding(s):`)
  for (const finding of unique) console.error(`  ${finding.file}:${finding.line}: ${finding.type}`)
  process.exitCode = 1
} else {
  console.log(`✓ security check: ${scanned} public-repository files scanned; no secrets, email addresses, or browser tracking APIs found`)
}
