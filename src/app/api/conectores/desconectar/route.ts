import type { NextRequest } from 'next/server'
import { ConnectorError, endConnection, json, whoIsAsking } from '@/features/connectors/server'

/** Disconnects one connection of the active workspace. Body: { conexao }. Admins only. */
export async function POST(request: NextRequest) {
  const who = await whoIsAsking()
  if (!who.userId || !who.workspace) return json({ error: 'Entre na sua conta.' }, 401)
  if (!who.admin) return json({ error: 'Só os administradores do workspace podem desconectar serviços.' }, 403)
  const { conexao } = await request.json().catch(() => ({})) as { conexao?: string }
  if (!conexao) return json({ error: 'Conexão não informada.' }, 400)
  try {
    await endConnection({ workspace: who.workspace, connectionId: conexao, userId: who.userId })
    return json({ ok: true })
  } catch (e) {
    if (e instanceof ConnectorError) return json({ error: e.message }, e.status)
    throw e
  }
}
