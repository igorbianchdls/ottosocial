import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { connectorById } from './catalog'
import { authConfigFor, createLink, deleteAccount, executeTool, type AccountStatus } from './composio'

/** Who is asking: the person, the active workspace and whether they are its admin (only admins connect). */
export async function whoIsAsking() {
  const { userId, orgId, orgRole } = await auth()
  return { userId, workspace: orgId, admin: orgRole === 'org:admin' }
}

export const json = (body: unknown, status = 200) => Response.json(body, { status })

type Sb = ReturnType<typeof supabaseAdmin>
export type Action = 'conectou' | 'desconectou' | 'reconectar' | 'erro' | 'usou'

export async function logActivity(sb: Sb, row: { workspace: string; connection?: string; connector: string; action: Action; detail?: string; actor?: string | null; apiKey?: string | null }) {
  await sb.from('connector_activity').insert({ workspace_id: row.workspace, connection_id: row.connection ?? null, connector: row.connector, action: row.action, detail: row.detail ?? '', actor: row.actor ?? null, api_key_id: row.apiKey ?? null })
}

/** A notice for everyone in the workspace (e.g. a connection that expired). */
export async function notifyWorkspace(sb: Sb, workspace: string, n: { title: string; text: string; href: string; action: string }) {
  await sb.from('notifications').insert({ workspace_id: workspace, user_id: null, kind: 'conta', ...n })
}

const accountStatus = (s: AccountStatus | 'desconectado') => s === 'conectado' ? 'conectada' : s === 'reconectar' ? 'reconectar' : 'desconectada'

/**
 * A social network connector also stands for the account Postar and Agendados use (social_accounts),
 * so that row follows the connection: created or updated with the Composio account as its external id.
 */
export async function syncSocialAccount(sb: Sb, workspace: string, connector: string, status: AccountStatus | 'desconectado', label: string, composioId: string) {
  const network = connectorById(connector)?.network
  if (!network || status === 'conectando') return
  const { data: existing } = await sb.from('social_accounts').select('id, handle').eq('workspace_id', workspace).eq('network', network).order('created_at').limit(1).maybeSingle()
  const fields = { status: accountStatus(status), external_id: composioId, connected_at: status === 'conectado' ? new Date().toISOString() : undefined }
  if (existing) {
    await sb.from('social_accounts').update({ ...fields, ...(label && label !== existing.handle ? { handle: label } : {}) }).eq('id', existing.id)
  } else if (status === 'conectado') {
    await sb.from('social_accounts').insert({ workspace_id: workspace, network, handle: label || connectorById(connector)!.name, ...fields })
  }
}

/** A failure with the message to show and the HTTP status to answer with. */
export class ConnectorError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

/**
 * Starts connecting a service for a workspace: records the connection as "conectando" and returns the
 * Composio page where a person logs in. Used by the site (admin session) and by the agents' API (API key).
 */
export async function startConnection(opts: { workspace: string; userId: string; connector: string; origin: string; apiKey?: string }) {
  const connector = connectorById(opts.connector)
  if (!connector) throw new ConnectorError('Conector desconhecido.', 404)
  const authConfigId = authConfigFor(connector.id)
  if (!authConfigId) throw new ConnectorError(`${connector.name} ainda não está disponível.`, 409)
  const sb = supabaseAdmin()
  await sweepAbandoned(opts.workspace)
  const connectionId = crypto.randomUUID()
  const callbackUrl = new URL(`/api/conectores/retorno?conexao=${connectionId}`, opts.origin).toString()
  try {
    const link = await createLink({ authConfigId, workspace: opts.workspace, callbackUrl })
    const { error } = await sb.from('connectors').insert({
      id: connectionId, workspace_id: opts.workspace, connector: connector.id, status: 'conectando',
      composio_account_id: link.accountId, composio_auth_config_id: authConfigId, connected_by: opts.userId, api_key_id: opts.apiKey ?? null,
    })
    if (error) throw error
    return { connectionId, url: link.url }
  } catch (e) {
    console.error('conectores: falha ao iniciar a conexão', e)
    throw new ConnectorError(`Não foi possível abrir o login do ${connector.name}. Tente de novo.`, 502)
  }
}

/** Disconnects one connection of a workspace: removes it at Composio, then here. */
export async function endConnection(opts: { workspace: string; connectionId: string; userId: string; apiKey?: string }) {
  const sb = supabaseAdmin()
  const { data: row } = await sb.from('connectors').select('id, workspace_id, connector, composio_account_id, account_label').eq('id', opts.connectionId).maybeSingle()
  if (!row || row.workspace_id !== opts.workspace) throw new ConnectorError('Conexão não encontrada.', 404)
  const name = connectorById(row.connector)?.name ?? row.connector
  try {
    if (row.composio_account_id) await deleteAccount(row.composio_account_id)
  } catch (e) {
    console.error('conectores: falha ao desconectar no Composio', e)
    throw new ConnectorError(`Não foi possível desconectar o ${name} agora. Tente de novo.`, 502)
  }
  await sb.from('connectors').update({ status: 'desconectado', composio_account_id: null }).eq('id', row.id)
  if (row.composio_account_id) await syncSocialAccount(sb, row.workspace_id, row.connector, 'desconectado', '', row.composio_account_id)
  await logActivity(sb, { workspace: row.workspace_id, connection: row.id, connector: row.connector, action: 'desconectou', detail: `${name} desconectado${row.account_label ? ` (${row.account_label})` : ''}.`, actor: opts.userId, apiKey: opts.apiKey })
}

/** The working connection of a connector in a workspace, if there is one. */
export async function activeConnection(workspace: string, connector: string) {
  const { data } = await supabaseAdmin().from('connectors').select('id, connector, status, account_label, composio_account_id, connected_at')
    .eq('workspace_id', workspace).eq('connector', connector).eq('status', 'conectado').order('connected_at', { ascending: false }).limit(1).maybeSingle()
  return data
}

/**
 * Connections left half way (the person never finished the login) for more than an hour: removed here and
 * at Composio. Runs when the workspace starts a new connection, so nothing piles up.
 */
async function sweepAbandoned(workspace: string) {
  const sb = supabaseAdmin()
  const cutoff = new Date(Date.now() - 3_600_000).toISOString()
  const { data } = await sb.from('connectors').select('id, composio_account_id').eq('workspace_id', workspace).eq('status', 'conectando').lt('created_at', cutoff)
  for (const row of data ?? []) {
    if (row.composio_account_id) await deleteAccount(row.composio_account_id).catch(e => console.error('conectores: limpeza no Composio', e))
    await sb.from('connectors').delete().eq('id', row.id)
  }
}

// The first of these keys found in a profile answer names the account, in this order.
const LABEL_KEYS = ['username', 'emailAddress', 'email', 'mail', 'userPrincipalName', 'login', 'display_name', 'displayName', 'name', 'localizedFirstName']

function findLabel(value: unknown, depth = 0): string | undefined {
  if (!value || typeof value !== 'object' || depth > 4) return
  const obj = value as Record<string, unknown>
  for (const k of LABEL_KEYS) if (typeof obj[k] === 'string' && obj[k]) return obj[k] as string
  for (const v of Object.values(obj)) { const found = findLabel(v, depth + 1); if (found) return found }
}

/**
 * How the connected account should read ("@marca", the e-mail, the page): Composio rarely says, so the
 * service's own profile action is asked once, right after connecting. Best effort: empty when it can't tell.
 */
export async function accountLabel(connector: string, accountId: string, workspace: string): Promise<string> {
  const c = connectorById(connector)
  if (!c?.profileTool) return ''
  try {
    const r = await Promise.race([
      executeTool({ tool: c.profileTool, accountId, workspace, args: {} }),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 8000)),
    ])
    const label = r?.successful === false ? undefined : findLabel(r?.data)
    if (!label) return ''
    return c.network && c.network !== 'linkedin' && !label.includes('@') && !label.includes(' ') ? `@${label}` : label
  } catch (e) {
    console.error('conectores: não deu para ler o perfil', e)
    return ''
  }
}
