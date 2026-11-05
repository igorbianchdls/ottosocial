import { oneForWorkspace } from '@/features/apikeys/connectorsApi'
import { fail, ok, withKey } from '@/features/apikeys/v1'

/** One connector: what it does, its status and the connected account. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withKey(request, 'ler', async owner => {
    const one = await oneForWorkspace(owner.workspace, id)
    return one ? ok(one) : fail('Conector desconhecido. Veja a lista em GET /api/v1/conectores.', 404)
  })
}
