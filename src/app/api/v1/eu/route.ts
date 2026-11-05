import { keyOwner } from '@/features/apikeys/server'
import { fail, ok } from '@/features/apikeys/v1'

/** Who this key is: its name, workspace and permissions. Any valid key. */
export async function GET(request: Request) {
  const owner = await keyOwner(request)
  if (!owner) return fail('Chave de API ausente, inválida ou revogada. Envie "Authorization: Bearer otto_sk_…".', 401)
  return ok({ chave: owner.keyName, workspace: owner.workspace, permissoes: owner.scopes, administrador: owner.admin })
}
