import type { NextRequest } from 'next/server'
import { connectorById } from '@/features/connectors/catalog'
import { authConfigFor, createLink } from '@/features/connectors/composio'
import { json, whoIsAsking } from '@/features/connectors/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Starts connecting a service for the active workspace: records the connection as "conectando" and
 * answers with the Composio page where the person logs in. Composio sends them back to /api/conectores/retorno.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const connector = connectorById(id)
  if (!connector) return json({ error: 'Conector desconhecido.' }, 404)
  const who = await whoIsAsking()
  if (!who.userId || !who.workspace) return json({ error: 'Entre na sua conta.' }, 401)
  if (!who.admin) return json({ error: 'Só os administradores do workspace podem conectar serviços.' }, 403)
  const authConfigId = authConfigFor(id)
  if (!authConfigId) return json({ error: `${connector.name} ainda não está disponível.` }, 409)

  const sb = supabaseAdmin()
  const connectionId = crypto.randomUUID()
  const callbackUrl = new URL(`/api/conectores/retorno?conexao=${connectionId}`, request.nextUrl.origin).toString()
  try {
    const link = await createLink({ authConfigId, workspace: who.workspace, callbackUrl })
    const { error } = await sb.from('connectors').insert({
      id: connectionId, workspace_id: who.workspace, connector: id, status: 'conectando',
      composio_account_id: link.accountId, composio_auth_config_id: authConfigId, connected_by: who.userId,
    })
    if (error) throw error
    return json({ url: link.url })
  } catch (e) {
    console.error('conectores: falha ao iniciar a conexão', e)
    return json({ error: `Não foi possível abrir o login do ${connector.name}. Tente de novo.` }, 502)
  }
}
