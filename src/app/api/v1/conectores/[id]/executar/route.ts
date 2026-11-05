import { fail, ok, withKey } from '@/features/apikeys/v1'
import { connectorById } from '@/features/connectors/catalog'
import { ComposioError, executeTool } from '@/features/connectors/composio'
import { activeConnection, logActivity } from '@/features/connectors/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Runs one action of a connected service. Body: { "acao": "SLUG", "argumentos": { … } }.
 * The action must belong to this service (its slug starts with the service's toolkit, e.g. GMAIL_…).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withKey(request, 'usar', async owner => {
    const connector = connectorById(id)
    if (!connector) return fail('Conector desconhecido. Veja a lista em GET /api/v1/conectores.', 404)
    const body = await request.json().catch(() => null) as { acao?: unknown; argumentos?: unknown } | null
    const action = typeof body?.acao === 'string' ? body.acao.trim().toUpperCase() : ''
    if (!action) return fail('Informe a ação em "acao". Veja as opções em GET /api/v1/conectores/' + id + '/acoes.', 400)
    if (!action.startsWith(connector.toolkit.toUpperCase() + '_')) return fail(`A ação ${action} não é do ${connector.name}.`, 400)
    const args = body?.argumentos && typeof body.argumentos === 'object' && !Array.isArray(body.argumentos) ? body.argumentos as Record<string, unknown> : {}

    const connection = await activeConnection(owner.workspace, id)
    if (!connection?.composio_account_id) return fail(`${connector.name} não está conectado neste workspace. Conecte primeiro.`, 409)

    let result
    try {
      result = await executeTool({ tool: action, accountId: connection.composio_account_id, workspace: owner.workspace, args })
    } catch (e) {
      if (e instanceof ComposioError && e.status < 500) return fail(`O ${connector.name} recusou a ação: ${e.message.replace(/^Composio [A-Z]+ \S+: /, '')}`, 422)
      throw e
    }
    await logActivity(supabaseAdmin(), {
      workspace: owner.workspace, connection: connection.id, connector: id, action: result.successful === false ? 'erro' : 'usou',
      detail: `Agente "${owner.keyName}" ${result.successful === false ? 'tentou' : 'executou'} ${action}.`, actor: owner.userId, apiKey: owner.keyId,
    })
    return ok({ sucesso: result.successful !== false, dados: result.data ?? null, erro: result.error ?? null })
  })
}
