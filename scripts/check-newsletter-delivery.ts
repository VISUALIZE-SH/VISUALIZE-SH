/** Check the exact public HTML before a human imports it into Zoho Campaigns. */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))

export function issueDateArgument(args: string[]): string {
  if (args.length !== 2 || args[0] !== '--date' || !/^\d{4}-\d{2}-\d{2}$/.test(args[1])) {
    throw new Error('Usage: newsletter:delivery:check --date YYYY-MM-DD')
  }
  const date = new Date(`${args[1]}T00:00:00.000Z`)
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== args[1]) {
    throw new Error('Issue date is not a valid calendar date')
  }
  return args[1]
}

export function publicOrigin(value: string, expectedHost: string): string {
  const url = new URL(value)
  if (
    url.protocol !== 'https:' || url.hostname !== expectedHost || url.port ||
    url.username || url.password || url.pathname !== '/' || url.search || url.hash
  ) {
    throw new Error(`Public origin must be https://${expectedHost} with no path or parameters`)
  }
  return url.origin
}

async function main(): Promise<void> {
  const date = issueDateArgument(process.argv.slice(2))
  const expectedHost = readFileSync(join(ROOT, 'public', 'CNAME'), 'utf8').trim().toLowerCase()
  const origin = publicOrigin(process.env.NEWSLETTER_PUBLIC_ORIGIN?.trim() || `https://${expectedHost}`, expectedHost)
  const emailUrl = `${origin}/digests/${date}/email.html`
  const local = readFileSync(join(ROOT, 'public', 'digests', date, 'email.html'))
  const response = await fetch(emailUrl, { redirect: 'manual', signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`Public email HTML returned HTTP ${response.status}; wait for the reviewed deployment`)
  const remote = Buffer.from(await response.arrayBuffer())
  if (!local.equals(remote)) throw new Error('Public email HTML differs from the local reviewed file; do not import or send it')
  const hash = createHash('sha256').update(local).digest('hex')
  console.log(`✓ exact public email HTML matches local file: ${emailUrl}`)
  console.log(`  SHA-256: ${hash}`)
  console.log('  Ready for human review in Zoho; this command did not create or send a campaign.')
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main().catch((error) => {
  console.error(`✗ delivery check failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
