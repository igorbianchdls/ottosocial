import { json, whoIsAsking } from '@/features/connectors/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** Revokes one of the signed-in person's keys in the active workspace. It stops working at once. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const who = await whoIsAsking()
  if (!who.userId || !who.workspace) return json({ error: 'Entre na sua conta.' }, 401)
  const { data, error } = await supabaseAdmin().from('api_keys').update({ revoked_at: new Date().toISOString() })
    .eq('id', id).eq('workspace_id', who.workspace).eq('user_id', who.userId).is('revoked_at', null).select('id')
  if (error) return json({ error: 'Não foi possível revogar a chave. Tente de novo.' }, 500)
  if (!data?.length) return json({ error: 'Chave não encontrada.' }, 404)
  return json({ ok: true })
}
