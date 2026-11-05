import { LIMITS } from '@/features/apikeys/server'
import { ok, withKey } from '@/features/apikeys/v1'

/** Who this key is: its name, workspace, permissions and limits. Any valid key. */
export async function GET(request: Request) {
  return withKey(request, 'ler', async owner => ok({ chave: owner.keyName, workspace: owner.workspace, permissoes: owner.scopes, administrador: owner.admin, limites: LIMITS }), { anyScope: true })
}
