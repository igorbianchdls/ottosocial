import { json, whoIsAsking } from '@/features/connectors/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** "Rodar agora": the job runs it on its next start (within 15 minutes). Admins only. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const who = await whoIsAsking()
  if (!who.userId || !who.workspace) return json({ error: 'Entre na sua conta.' }, 401)
  if (!who.admin) return json({ error: 'Só administradores rodam sincronizações.' }, 403)
  const { data, error } = await supabaseAdmin().from('data_syncs').update({ run_requested_at: new Date().toISOString() })
    .eq('id', id).eq('workspace_id', who.workspace).eq('enabled', true).select('id')
  if (error) return json({ error: 'Não foi possível pedir a execução.' }, 500)
  if (!data?.length) return json({ error: 'Sincronização não encontrada ou pausada.' }, 404)
  return json({ ok: true })
}
