import { listForWorkspace } from '@/features/apikeys/connectorsApi'
import { ok, withKey } from '@/features/apikeys/v1'

/** Every connector of the catalog, whether it can be connected and whether the workspace has it. */
export async function GET(request: Request) {
  return withKey(request, 'ler', async owner => ok({ conectores: await listForWorkspace(owner.workspace) }))
}
