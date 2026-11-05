import type { NextRequest } from 'next/server'
import { fail, ok, withKey } from '@/features/apikeys/v1'
import { ConnectorError, startConnection } from '@/features/connectors/server'

/**
 * Starts connecting a service: answers the login link. The agent cannot log in for the person
 * (the service asks a human to authorize), so it sends the link to them; once they authorize,
 * the connector shows as "conectado" in GET /api/v1/conectores/{id}.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withKey(request, 'conectar', async owner => {
    try {
      const { url, connectionId } = await startConnection({ workspace: owner.workspace, userId: owner.userId, connector: id, origin: request.nextUrl.origin, apiKey: owner.keyId })
      return ok({
        link: url,
        conexao: connectionId,
        instrucoes: 'Envie este link para a pessoa dona da conta. Ela abre, faz login e autoriza. Depois, consulte GET /api/v1/conectores/' + id + ' até o status ser "conectado".',
      }, 201)
    } catch (e) {
      if (e instanceof ConnectorError) return fail(e.message, e.status)
      throw e
    }
  })
}
