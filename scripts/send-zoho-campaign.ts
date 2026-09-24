/** Create a Zoho Campaigns draft, or send only when --send is explicitly supplied. */
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
const DEFAULT_ACCOUNTS_URL = 'https://accounts.zoho.com'
const DEFAULT_CAMPAIGNS_URL = 'https://campaigns.zoho.com/api/v1.1'
const ZOHO_DATA_CENTERS = new Map([
  ['accounts.zoho.com', 'campaigns.zoho.com'],
  ['accounts.zoho.eu', 'campaigns.zoho.eu'],
  ['accounts.zoho.in', 'campaigns.zoho.in'],
  ['accounts.zoho.com.au', 'campaigns.zoho.com.au'],
  ['accounts.zoho.jp', 'campaigns.zoho.jp'],
  ['accounts.zoho.com.cn', 'campaigns.zoho.com.cn'],
])

type Mode = 'dry-run' | 'draft' | 'send'
interface Config {
  accountsUrl: string
  campaignsUrl: string
  emailUrl: string
  campaignName: string
  subject: string
  fromEmail: string
  listKey: string
  topicId?: string
}

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}
function email(name: string, value: string): string {
  if (value.length > 254 || /[\s\u0000-\u001f\u007f]/.test(value) || !/^[^@]+@[^@]+\.[^@]+$/.test(value)) {
    throw new Error(`${name} must be a valid email address`)
  }
  return value
}
function identifier(name: string, value: string | undefined, requiredValue = false): string | undefined {
  const normalized = value?.trim()
  if (!normalized) {
    if (requiredValue) throw new Error(`Missing required environment variable: ${name}`)
    return undefined
  }
  if (normalized.length > 256 || !/^[A-Za-z0-9_-]+$/.test(normalized)) {
    throw new Error(`${name} has an invalid format`)
  }
  return normalized
}
function httpsUrl(name: string, value: string): string {
  try { const url = new URL(value); if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw new Error(); return url.toString().replace(/\/$/, '') } catch { throw new Error(`${name} must be an absolute HTTPS URL without embedded credentials`) }
}
export function zohoEndpoints(accountsValue: string, campaignsValue: string): { accountsUrl: string; campaignsUrl: string } {
  const accountsUrl = httpsUrl('ZOHO_ACCOUNTS_URL', accountsValue)
  const campaignsUrl = httpsUrl('ZOHO_CAMPAIGNS_API_URL', campaignsValue)
  const accounts = new URL(accountsUrl)
  const campaigns = new URL(campaignsUrl)
  const expectedCampaignsHost = ZOHO_DATA_CENTERS.get(accounts.hostname)
  if (
    !expectedCampaignsHost ||
    campaigns.hostname !== expectedCampaignsHost ||
    accounts.port || campaigns.port ||
    accounts.pathname !== '/' || accounts.search || accounts.hash ||
    campaigns.pathname !== '/api/v1.1' || campaigns.search || campaigns.hash
  ) {
    throw new Error('Zoho Accounts and Campaigns URLs must be an approved, matching Zoho data-center pair')
  }
  return { accountsUrl, campaignsUrl }
}
function displayText(name: string, value: string): string {
  if (!value.trim() || value.length > 250 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error(`${name} must be plain text no longer than 250 characters`)
  }
  return value
}
function argument(args: string[], name: string): string | undefined { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1] }
function redactUrl(value: string): string { const url = new URL(value); return `${url.origin}${url.pathname}` }
function campaignKey(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (['campaignkey', 'campaign_key', 'campaignKey'].includes(key) && typeof child === 'string') return child
    const nested = campaignKey(child); if (nested) return nested
  }
  return undefined
}
function responseCode(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'code' && (typeof child === 'string' || typeof child === 'number')) return String(child)
    const nested = responseCode(child); if (nested) return nested
  }
  return undefined
}
async function api(url: string, token: string, values: Record<string, string>): Promise<unknown> {
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(values) })
  const body = await response.text()
  if (!response.ok) throw new Error(`Zoho Campaigns request failed with HTTP ${response.status}; inspect the protected workflow and Zoho audit logs`)
  let parsed: unknown
  try { parsed = JSON.parse(body) } catch { throw new Error('Zoho Campaigns returned a non-JSON response') }
  if (responseCode(parsed) !== '200') {
    throw new Error('Zoho Campaigns rejected the request; inspect the protected workflow and Zoho audit logs')
  }
  return parsed
}
async function accessToken(accountsUrl: string): Promise<string> {
  const response = await fetch(`${accountsUrl}/oauth/v2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', client_id: required('ZOHO_CLIENT_ID'), client_secret: required('ZOHO_CLIENT_SECRET'), refresh_token: required('ZOHO_REFRESH_TOKEN') }) })
  const body = await response.text()
  if (!response.ok) throw new Error(`Zoho token exchange failed (${response.status}). Check the client, refresh token, and data-center URL.`)
  const parsed = JSON.parse(body) as { access_token?: string }
  if (!parsed.access_token) throw new Error('Zoho token exchange did not return an access token')
  return parsed.access_token // Deliberately never logged or persisted.
}
export function config(args: string[]): { mode: Mode; config: Config } {
  const send = args.includes('--send'), draft = args.includes('--draft')
  if (send && draft) throw new Error('Choose either --draft or --send, not both')
  const emailUrl = argument(args, '--email-url') ?? process.env.NEWSLETTER_EMAIL_URL
  if (!emailUrl) throw new Error('Use --email-url https://your-public-site/digests/YYYY-MM-DD/email.html')
  const campaignName = displayText('campaign name', argument(args, '--campaign-name') ?? `Structural Heart Weekly Digest ${new Date().toISOString().slice(0, 10)}`)
  const subject = displayText('subject', argument(args, '--subject') ?? campaignName)
  const normalizedEmailUrl = httpsUrl('NEWSLETTER_EMAIL_URL', emailUrl)
  const parsedEmailUrl = new URL(normalizedEmailUrl)
  if (!/^\/digests\/\d{4}-\d{2}-\d{2}\/email\.html$/.test(parsedEmailUrl.pathname) || parsedEmailUrl.search || parsedEmailUrl.hash) {
    throw new Error('NEWSLETTER_EMAIL_URL must identify a generated /digests/YYYY-MM-DD/email.html file')
  }
  const publicOrigin = process.env.NEWSLETTER_PUBLIC_ORIGIN?.trim()
  if (publicOrigin && new URL(normalizedEmailUrl).origin !== new URL(httpsUrl('NEWSLETTER_PUBLIC_ORIGIN', publicOrigin)).origin) {
    throw new Error('NEWSLETTER_EMAIL_URL must use the configured NEWSLETTER_PUBLIC_ORIGIN')
  }
  const endpoints = zohoEndpoints(
    process.env.ZOHO_ACCOUNTS_URL?.trim() || DEFAULT_ACCOUNTS_URL,
    process.env.ZOHO_CAMPAIGNS_API_URL?.trim() || DEFAULT_CAMPAIGNS_URL,
  )
  return {
    mode: send ? 'send' : draft ? 'draft' : 'dry-run',
    config: {
      ...endpoints,
      emailUrl: normalizedEmailUrl,
      campaignName,
      subject,
      fromEmail: email('ZOHO_CAMPAIGNS_FROM_EMAIL', required('ZOHO_CAMPAIGNS_FROM_EMAIL')),
      listKey: identifier('ZOHO_CAMPAIGNS_LIST_KEY', process.env.ZOHO_CAMPAIGNS_LIST_KEY, true)!,
      topicId: identifier('ZOHO_CAMPAIGNS_TOPIC_ID', process.env.ZOHO_CAMPAIGNS_TOPIC_ID),
    },
  }
}
async function main(): Promise<void> {
  const { mode, config: values } = config(process.argv.slice(2))
  console.log(`${mode}: ${values.campaignName} → ${redactUrl(values.emailUrl)}`)
  if (mode === 'dry-run') { console.log('No Zoho request was made. Use --draft to create a draft or --send to create and send.'); return }
  const token = await accessToken(values.accountsUrl)
  // Zoho separates campaign creation from sending. A failed second request may
  // leave a draft, so operators must inspect Zoho before retrying this command.
  const campaign: Record<string, string> = {
    resfmt: 'json',
    campaignname: values.campaignName,
    subject: values.subject,
    from_email: values.fromEmail,
    content_url: values.emailUrl,
    list_details: JSON.stringify({ [values.listKey]: [] }),
  }
  if (values.topicId) campaign.topicId = values.topicId
  const created = await api(`${values.campaignsUrl}/createCampaign`, token, campaign)
  const key = campaignKey(created)
  if (!key) throw new Error('Campaign was created but no campaign key was returned; inspect it in Zoho Campaigns before sending.')
  if (mode === 'send') { await api(`${values.campaignsUrl}/sendcampaign`, token, { resfmt: 'json', campaignkey: key }); console.log('✓ campaign created and send requested') }
  else console.log('✓ campaign draft created')
}
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main().catch((error) => { console.error(`✗ Zoho campaign command failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1 })
