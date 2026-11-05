import { workspaceConnections } from '@/features/apikeys/connectorsApi'
import { fail, ok, withKey } from '@/features/apikeys/v1'
import { ConnectorError, endConnection } from '@/features/connectors/server'

/** Disconnects the service from the workspace. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withKey(request, 'conectar', async owner => {
    const row = (await workspaceConnections(owner.workspace)).get(id)
    if (!row) return fail('Este conector não está conectado.', 404)
    try {
      await endConnection({ workspace: owner.workspace, connectionId: row.id, userId: owner.userId, apiKey: owner.keyId })
      return ok({ ok: true, status: 'desconectado' })
    } catch (e) {
      if (e instanceof ConnectorError) return fail(e.message, e.status)
      throw e
    }
  })
}
