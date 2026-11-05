import type { NextRequest } from 'next/server'
import { fail, ok, withKey } from '@/features/apikeys/v1'
import { connectorById } from '@/features/connectors/catalog'
import { authConfigFor, listTools } from '@/features/connectors/composio'

/**
 * The actions the service offers, with the arguments each one takes (JSON Schema), what each does
 * (leitura, altera, apaga) and whether this key may run it. ?busca= filters.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withKey(request, 'ler', async owner => {
    const connector = connectorById(id)
    if (!connector) return fail('Conector desconhecido. Veja a lista em GET /api/v1/conectores.', 404)
    if (!authConfigFor(id)) return fail(`${connector.name} ainda não está disponível.`, 409)
    const tools = await listTools(connector.toolkit, request.nextUrl.searchParams.get('busca') ?? undefined)
    return ok({ conector: id, acoes: tools.map(t => ({ acao: t.slug, nome: t.name, descricao: t.description, efeito: t.effect, permitida: t.effect === 'leitura' ? owner.scopes.includes('usar') || owner.scopes.includes('agir') : owner.scopes.includes('agir'), argumentos: t.parameters })) })
  })
}
