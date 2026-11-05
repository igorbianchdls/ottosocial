import { fail, ok, withKey } from '@/features/apikeys/v1'
import { connectorById } from '@/features/connectors/catalog'
import { ComposioError, executeTool, getTool } from '@/features/connectors/composio'
import { activeConnection, logActivity } from '@/features/connectors/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Runs one action of a connected service. Body: { "acao": "SLUG", "argumentos": { … } }.
 * The action must belong to this service. Reading needs the "usar" permission; anything that sends,
 * publishes, changes or deletes needs "agir". Counts toward the key's daily actions.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // "usar" or "agir" lets a key in; which actions it may run is checked below, by what the action does.
  return withKey(request, 'usar', async owner => {
    if (!owner.scopes.includes('usar') && !owner.scopes.includes('agir')) return fail('Esta chave não tem permissão para usar os serviços conectados.', 403)
    const connector = connectorById(id)
    if (!connector) return fail('Conector desconhecido. Veja a lista em GET /api/v1/conectores.', 404)
    const body = await request.json().catch(() => null) as { acao?: unknown; argumentos?: unknown } | null
    const action = typeof body?.acao === 'string' ? body.acao.trim().toUpperCase() : ''
    if (!action) return fail('Informe a ação em "acao". Veja as opções em GET /api/v1/conectores/' + id + '/acoes.', 400)
    if (!action.startsWith(connector.toolkit.toUpperCase() + '_')) return fail(`A ação ${action} não é do ${connector.name}.`, 400)
    const args = body?.argumentos && typeof body.argumentos === 'object' && !Array.isArray(body.argumentos) ? body.argumentos as Record<string, unknown> : {}

    const tool = await getTool(action)
    if (!tool) return fail(`Ação ${action} não encontrada. Veja as opções em GET /api/v1/conectores/${id}/acoes.`, 404)
    if (tool.effect !== 'leitura' && !owner.scopes.includes('agir')) {
      return fail(`${action} ${tool.effect === 'apaga' ? 'apaga' : 'envia, publica ou altera'} algo no ${connector.name}. Esta chave só pode executar ações de leitura: crie uma chave com a permissão "Agir nos serviços".`, 403)
    }

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
    return ok({ sucesso: result.successful !== false, efeito: tool.effect, dados: result.data ?? null, erro: result.error ?? null })
  }, { action: true, anyScope: true })
}
