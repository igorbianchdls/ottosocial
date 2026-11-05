import type { NextRequest } from 'next/server'
import { connectorById } from '@/features/connectors/catalog'
import { deleteAccount } from '@/features/connectors/composio'
import { json, logActivity, syncSocialAccount, whoIsAsking } from '@/features/connectors/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** Disconnects one connection of the active workspace: removes it at Composio, then here. Body: { conexao }. */
export async function POST(request: NextRequest) {
  const who = await whoIsAsking()
  if (!who.userId || !who.workspace) return json({ error: 'Entre na sua conta.' }, 401)
  if (!who.admin) return json({ error: 'Só os administradores do workspace podem desconectar serviços.' }, 403)
  const { conexao } = await request.json().catch(() => ({})) as { conexao?: string }
  if (!conexao) return json({ error: 'Conexão não informada.' }, 400)

  const sb = supabaseAdmin()
  const { data: row } = await sb.from('connectors').select('id, workspace_id, connector, composio_account_id, account_label').eq('id', conexao).maybeSingle()
  if (!row || row.workspace_id !== who.workspace) return json({ error: 'Conexão não encontrada.' }, 404)
  const name = connectorById(row.connector)?.name ?? row.connector
  try {
    if (row.composio_account_id) await deleteAccount(row.composio_account_id)
  } catch (e) {
    console.error('conectores: falha ao desconectar no Composio', e)
    return json({ error: `Não foi possível desconectar o ${name} agora. Tente de novo.` }, 502)
  }
  await sb.from('connectors').update({ status: 'desconectado', composio_account_id: null }).eq('id', row.id)
  if (row.composio_account_id) await syncSocialAccount(sb, row.workspace_id, row.connector, 'desconectado', '', row.composio_account_id)
  await logActivity(sb, { workspace: row.workspace_id, connection: row.id, connector: row.connector, action: 'desconectou', detail: `${name} desconectado${row.account_label ? ` (${row.account_label})` : ''}.`, actor: who.userId })
  return json({ ok: true })
}
