import type { NextRequest } from 'next/server'
import { ConnectorError, json, startConnection, whoIsAsking } from '@/features/connectors/server'

/**
 * Starts connecting a service for the active workspace and answers with the Composio page where the
 * person logs in. Composio sends them back to /api/conectores/retorno. Admins only.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const who = await whoIsAsking()
  if (!who.userId || !who.workspace) return json({ error: 'Entre na sua conta.' }, 401)
  if (!who.admin) return json({ error: 'Só os administradores do workspace podem conectar serviços.' }, 403)
  try {
    const { url } = await startConnection({ workspace: who.workspace, userId: who.userId, connector: id, origin: request.nextUrl.origin })
    return json({ url })
  } catch (e) {
    if (e instanceof ConnectorError) return json({ error: e.message }, e.status)
    throw e
  }
}
