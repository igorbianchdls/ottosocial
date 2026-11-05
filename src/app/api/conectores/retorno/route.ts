import { NextResponse, type NextRequest } from 'next/server'
import { connectorById } from '@/features/connectors/catalog'
import { deleteAccount, getAccount } from '@/features/connectors/composio'
import { accountLabel, logActivity, syncSocialAccount, whoIsAsking } from '@/features/connectors/server'
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
  const { data: row } = await sb.from('connectors').select('id, workspace_id, connector, composio_account_id, status, api_key_id').eq('id', connectionId).maybeSingle()
  if (!row || !row.composio_account_id || row.status !== 'conectando') return back('/conectores')
  // From the site, only the workspace that started it can finish it. A link an agent asked for (API key)
  // is opened by whoever the agent sent it to, maybe signed out: Composio's answer below decides.
  if (!row.api_key_id && row.workspace_id !== who.workspace) return back('/conectores')
  const page = `/conectores/${row.connector}`
  const name = connectorById(row.connector)?.name ?? row.connector

  try {
    const account = await getAccount(row.composio_account_id)
    if (account.workspace && account.workspace !== row.workspace_id) throw new Error('conta de outro workspace')
    const ok = account.status === 'conectado'
    const label = ok ? (account.label || await accountLabel(row.connector, row.composio_account_id, row.workspace_id)) : ''
    // A login that did not finish leaves nothing behind at Composio.
    if (!ok) await deleteAccount(row.composio_account_id).catch(e => console.error('conectores: limpeza no Composio', e))
    await sb.from('connectors').update({
      status: ok ? 'conectado' : 'erro',
      account_label: label,
      ...(ok ? {} : { composio_account_id: null }),
      connected_at: ok ? new Date().toISOString() : null,
      error: ok ? null : 'O login não foi concluído.',
    }).eq('id', row.id)
    if (ok) {
      // Another connection of the same service that was left half way is dropped.
      await sb.from('connectors').delete().eq('workspace_id', row.workspace_id).eq('connector', row.connector).eq('status', 'conectando').neq('id', row.id)
      await syncSocialAccount(sb, row.workspace_id, row.connector, 'conectado', label, row.composio_account_id)
    }
    await logActivity(sb, { workspace: row.workspace_id, connection: row.id, connector: row.connector, action: ok ? 'conectou' : 'erro', detail: ok ? `${name} conectado${label ? ` (${label})` : ''}.` : `O login do ${name} não foi concluído.`, actor: who.userId ?? null, apiKey: row.api_key_id })
    return back(`${page}?${ok ? 'ok' : 'erro'}=1`)
  } catch (e) {
    console.error('conectores: falha no retorno', e)
    await sb.from('connectors').update({ status: 'erro', error: 'Não foi possível confirmar a conexão.' }).eq('id', row.id)
    return back(`${page}?erro=1`)
  }
}
