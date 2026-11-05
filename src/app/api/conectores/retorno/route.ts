import { NextResponse, type NextRequest } from 'next/server'
import { connectorById } from '@/features/connectors/catalog'
import { getAccount } from '@/features/connectors/composio'
import { logActivity, syncSocialAccount, whoIsAsking } from '@/features/connectors/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Where Composio sends the person after the service's login. Asks Composio how the connection ended,
 * saves it and goes back to the connector's page with ?ok=1 or ?erro=1.
 */
export async function GET(request: NextRequest) {
  const back = (path: string) => NextResponse.redirect(new URL(path, request.nextUrl.origin))
  const connectionId = request.nextUrl.searchParams.get('conexao')
  if (!connectionId) return back('/conectores')
  const who = await whoIsAsking()
  const sb = supabaseAdmin()
  const { data: row } = await sb.from('connectors').select('id, workspace_id, connector, composio_account_id, status').eq('id', connectionId).maybeSingle()
  // Only the workspace that started it can finish it.
  if (!row || row.workspace_id !== who.workspace || !row.composio_account_id) return back('/conectores')
  const page = `/conectores/${row.connector}`
  const name = connectorById(row.connector)?.name ?? row.connector

  try {
    const account = await getAccount(row.composio_account_id)
    if (account.workspace && account.workspace !== row.workspace_id) throw new Error('conta de outro workspace')
    const ok = account.status === 'conectado'
    await sb.from('connectors').update({
      status: ok ? 'conectado' : 'erro',
      account_label: account.label,
      connected_at: ok ? new Date().toISOString() : null,
      error: ok ? null : 'O login não foi concluído.',
    }).eq('id', row.id)
    if (ok) {
      // Another connection of the same service that was left half way is dropped.
      await sb.from('connectors').delete().eq('workspace_id', row.workspace_id).eq('connector', row.connector).eq('status', 'conectando').neq('id', row.id)
      await syncSocialAccount(sb, row.workspace_id, row.connector, 'conectado', account.label, row.composio_account_id)
    }
    await logActivity(sb, { workspace: row.workspace_id, connection: row.id, connector: row.connector, action: ok ? 'conectou' : 'erro', detail: ok ? `${name} conectado${account.label ? ` (${account.label})` : ''}.` : `O login do ${name} não foi concluído.`, actor: who.userId })
    return back(`${page}?${ok ? 'ok' : 'erro'}=1`)
  } catch (e) {
    console.error('conectores: falha no retorno', e)
    await sb.from('connectors').update({ status: 'erro', error: 'Não foi possível confirmar a conexão.' }).eq('id', row.id)
    return back(`${page}?erro=1`)
  }
}
