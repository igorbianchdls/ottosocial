import type { NextRequest } from 'next/server'
import { connectorById } from '@/features/connectors/catalog'
import { verifyWebhook } from '@/features/connectors/composio'
import { logActivity, notifyWorkspace, syncSocialAccount } from '@/features/connectors/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Composio tells the app when a connection stops working (its refresh token was revoked or expired):
 * the connector goes to "reconectar", the social account too, and the workspace gets a notice.
 * Signed with COMPOSIO_WEBHOOK_SECRET; subscribe the "composio.connected_account.expired" event to this URL.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text()
  if (!verifyWebhook(request.headers, raw)) return new Response('invalid signature', { status: 401 })
  let event: { type?: string; data?: Record<string, unknown> }
  try { event = JSON.parse(raw) } catch { return new Response('invalid body', { status: 400 }) }

  if (event.type === 'composio.connected_account.expired') {
    const data = event.data ?? {}
    const accountId = String(data.id ?? data.connected_account_id ?? data.nanoid ?? '')
    if (!accountId) return new Response('ok')
    const sb = supabaseAdmin()
    const { data: row } = await sb.from('connectors').select('id, workspace_id, connector, account_label, status').eq('composio_account_id', accountId).maybeSingle()
    if (!row || row.status === 'reconectar') return new Response('ok')
    const name = connectorById(row.connector)?.name ?? row.connector
    await sb.from('connectors').update({ status: 'reconectar', error: 'A autorização expirou.' }).eq('id', row.id)
    await syncSocialAccount(sb, row.workspace_id, row.connector, 'reconectar', '', accountId)
    await logActivity(sb, { workspace: row.workspace_id, connection: row.id, connector: row.connector, action: 'reconectar', detail: `A autorização do ${name} expirou.` })
    await notifyWorkspace(sb, row.workspace_id, { title: `Reconecte o ${name}`, text: `A autorização${row.account_label ? ` de ${row.account_label}` : ''} expirou. Até reconectar, o OttoSocial não consegue usar essa conta.`, href: `/conectores/${row.connector}`, action: 'Reconectar' })
  }
  return new Response('ok')
}
