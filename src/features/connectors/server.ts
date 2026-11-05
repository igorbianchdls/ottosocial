import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { connectorById } from './catalog'
import type { AccountStatus } from './composio'

/** Who is asking: the person, the active workspace and whether they are its admin (only admins connect). */
export async function whoIsAsking() {
  const { userId, orgId, orgRole } = await auth()
  return { userId, workspace: orgId, admin: orgRole === 'org:admin' }
}

export const json = (body: unknown, status = 200) => Response.json(body, { status })

type Sb = ReturnType<typeof supabaseAdmin>

export async function logActivity(sb: Sb, row: { workspace: string; connection?: string; connector: string; action: 'conectou' | 'desconectou' | 'reconectar' | 'erro' | 'usou'; detail?: string; actor?: string | null }) {
  await sb.from('connector_activity').insert({ workspace_id: row.workspace, connection_id: row.connection ?? null, connector: row.connector, action: row.action, detail: row.detail ?? '', actor: row.actor ?? null })
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
