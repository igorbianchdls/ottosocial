import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Composio, called over its REST API (no SDK): it hosts the login of each service, keeps and refreshes
// the tokens, and runs the actions. Its "user" is our workspace (the Clerk organization id), so a
// connection belongs to the whole team.
//
// Settings (server only, in Vercel):
//   COMPOSIO_API_KEY          Composio → Settings → API Keys
//   COMPOSIO_AUTH_CONFIGS     JSON from our connector id to its auth config, e.g. {"instagram":"ac_123","metaads":"ac_456"}
//   COMPOSIO_WEBHOOK_SECRET   secret of the webhook subscription pointing at /api/conectores/webhook
//   COMPOSIO_API_URL          optional, defaults to https://backend.composio.dev
// Without the key (or without a connector's auth config) the connector shows as "em breve" and nothing is called.

const API = (process.env.COMPOSIO_API_URL || 'https://backend.composio.dev').replace(/\/$/, '')
const KEY = process.env.COMPOSIO_API_KEY ?? ''

function authConfigs(): Record<string, string> {
  try { return JSON.parse(process.env.COMPOSIO_AUTH_CONFIGS || '{}') } catch { return {} }
}
/** Auth config of a connector, when Composio is set up for it. */
export const authConfigFor = (connector: string): string | undefined => KEY ? authConfigs()[connector] : undefined
/** Our connector ids that can be connected right now. */
export const availableConnectors = (): string[] => KEY ? Object.keys(authConfigs()).filter(k => authConfigs()[k]) : []

export class ComposioError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}
async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!KEY) throw new ComposioError('Composio não configurado', 503)
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'x-api-key': KEY, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) throw new ComposioError(`Composio ${method} ${path}: ${res.status} ${text.slice(0, 300)}`, res.status)
  return (text ? JSON.parse(text) : {}) as T
}

/** Starts a connection: Composio returns the page where the person logs in to the service. */
export async function createLink(opts: { authConfigId: string; workspace: string; callbackUrl: string }) {
  const r = await call<Record<string, unknown>>('POST', '/api/v3.1/connected_accounts/link', {
    auth_config_id: opts.authConfigId, user_id: opts.workspace, callback_url: opts.callbackUrl,
  })
  const url = str(r.redirect_url) ?? str(r.redirectUrl) ?? str(r.link_url)
  const accountId = str(r.connected_account_id) ?? str(r.connectedAccountId) ?? str(r.id)
  if (!url || !accountId) throw new ComposioError('Composio não devolveu o link de conexão', 502)
  return { url, accountId }
}

export type AccountStatus = 'conectando' | 'conectado' | 'reconectar' | 'erro'
/** State of a connected account, plus a label for it when the service gives one (the @, the page, the e-mail). */
export async function getAccount(accountId: string): Promise<{ status: AccountStatus; label: string; workspace?: string }> {
  const r = await call<Record<string, unknown>>('GET', `/api/v3/connected_accounts/${encodeURIComponent(accountId)}`)
  const raw = String(r.status ?? '').toUpperCase()
  const status: AccountStatus = raw === 'ACTIVE' ? 'conectado' : raw === 'EXPIRED' ? 'reconectar' : raw === 'FAILED' || raw === 'INACTIVE' ? 'erro' : 'conectando'
  const data = (r.data ?? r.state ?? {}) as Record<string, unknown>
  const label = str(r.alias) ?? str(data.username) ?? str(data.email) ?? str(data.name) ?? ''
  return { status, label, workspace: str(r.user_id) }
}

/** Removes the connection at Composio (it also revokes the tokens it kept). */
export async function deleteAccount(accountId: string) {
  try { await call('DELETE', `/api/v3/connected_accounts/${encodeURIComponent(accountId)}`) }
  catch (e) { if (!(e instanceof ComposioError && e.status === 404)) throw e }
}

/**
 * What an action does, from Composio's hints: "leitura" only reads; "altera" creates, sends, publishes
 * or changes something; "apaga" deletes. Without a read-only hint it counts as "altera" (the safe side).
 */
export type Effect = 'leitura' | 'altera' | 'apaga'
export type Tool = { slug: string; name: string; description: string; parameters: unknown; effect: Effect }
const effectOf = (tags: unknown): Effect => {
  const t = Array.isArray(tags) ? tags : []
  return t.includes('destructiveHint') ? 'apaga' : t.includes('readOnlyHint') ? 'leitura' : 'altera'
}
const toTool = (t: Record<string, unknown>): Tool => ({ slug: String(t.slug), name: String(t.name ?? t.slug), description: String(t.description ?? ''), parameters: t.input_parameters ?? {}, effect: effectOf(t.tags) })

/** The actions a service offers (Composio "tools" of a toolkit), with the schema of their arguments. Deprecated ones are left out. */
export async function listTools(toolkit: string, query?: string): Promise<Tool[]> {
  const qs = new URLSearchParams({ toolkit_slug: toolkit, limit: '300' })
  if (query) qs.set('query', query)
  const r = await call<{ items?: Record<string, unknown>[] }>('GET', `/api/v3.1/tools?${qs}`)
  return (r.items ?? []).filter(t => !(Array.isArray(t.tags) && t.tags.includes('deprecated'))).map(toTool)
}

// Tool details barely change: kept for 10 minutes per server instance.
const toolCache = new Map<string, { at: number; tool: Tool | null }>()
/** One action, or null when Composio does not know it. */
export async function getTool(slug: string): Promise<Tool | null> {
  const hit = toolCache.get(slug)
  if (hit && Date.now() - hit.at < 600_000) return hit.tool
  let tool: Tool | null = null
  try { tool = toTool(await call<Record<string, unknown>>('GET', `/api/v3.1/tools/${encodeURIComponent(slug)}`)) }
  catch (e) { if (!(e instanceof ComposioError && e.status === 404)) throw e }
  toolCache.set(slug, { at: Date.now(), tool })
  return tool
}

/** Runs one action on a connected account. Composio answers { data, error, successful }. */
export async function executeTool(opts: { tool: string; accountId: string; workspace: string; args: Record<string, unknown> }) {
  return call<{ data?: unknown; error?: string | null; successful?: boolean; log_id?: string }>('POST', `/api/v3.1/tools/execute/${encodeURIComponent(opts.tool)}`, {
    connected_account_id: opts.accountId, user_id: opts.workspace, arguments: opts.args,
  })
}

/**
 * Checks a webhook from Composio: "webhook-signature" is "v1,<base64 HMAC-SHA256>" of
 * "<webhook-id>.<webhook-timestamp>.<raw body>" with COMPOSIO_WEBHOOK_SECRET; older than 5 minutes is refused.
 */
export function verifyWebhook(headers: Headers, rawBody: string): boolean {
  const secret = process.env.COMPOSIO_WEBHOOK_SECRET
  const id = headers.get('webhook-id'), ts = headers.get('webhook-timestamp'), sig = headers.get('webhook-signature')
  if (!secret || !id || !ts || !sig) return false
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false
  // The secret is used as is (UTF-8), as in Composio's manual verification example.
  const expected = createHmac('sha256', secret).update(`${id}.${ts}.${rawBody}`).digest()
  return sig.split(' ').some(part => {
    const value = part.includes(',') ? part.slice(part.indexOf(',') + 1) : part
    if (!value) return false
    const given = Buffer.from(value, 'base64')
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
}

const str = (v: unknown) => typeof v === 'string' && v ? v : undefined
