import type { NextRequest } from 'next/server'
import { datasetFor, jobSourceById } from '@/features/data/catalog'
import { json, whoIsAsking } from '@/features/connectors/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Creates a sync for the active workspace. Body: { fonte, dados, hora }. Admins only.
 * The workspace's BigQuery destination is created on the first sync (a dataset in the OttoSocial project),
 * and the first load is asked to run at once (the job picks it up within 15 minutes).
 */
export async function POST(request: NextRequest) {
  const who = await whoIsAsking()
  if (!who.userId || !who.workspace) return json({ error: 'Entre na sua conta.' }, 401)
  if (!who.admin) return json({ error: 'Só administradores criam sincronizações.' }, 403)
  const body = await request.json().catch(() => ({})) as { fonte?: string; dados?: unknown; hora?: unknown }
  const source = jobSourceById(body.fonte ?? '')
  if (!source?.ready) return json({ error: 'Esta fonte ainda não pode ser sincronizada.' }, 400)
  const streams = Array.isArray(body.dados) ? [...new Set(body.dados.filter((d): d is string => source.streams.some(s => s.id === d)))] : []
  if (!streams.length) return json({ error: 'Escolha pelo menos um tipo de dado.' }, 400)
  const hour = Number.isInteger(body.hora) && (body.hora as number) >= 0 && (body.hora as number) <= 23 ? body.hora as number : 3

  const sb = supabaseAdmin()
  const { data: connection } = await sb.from('connectors').select('id').eq('workspace_id', who.workspace).eq('connector', source.id).eq('status', 'conectado')
    .order('connected_at', { ascending: false }).limit(1).maybeSingle()
  if (!connection) return json({ error: `Conecte o ${source.name} em Conectores antes de sincronizar.` }, 409)

  let { data: destination } = await sb.from('data_destinations').select('id').eq('workspace_id', who.workspace).eq('kind', 'bigquery').maybeSingle()
  if (!destination) {
    const created = await sb.from('data_destinations').insert({ workspace_id: who.workspace, dataset: datasetFor(who.workspace), created_by: who.userId }).select('id').single()
    if (created.error) return json({ error: 'Não foi possível preparar o destino.' }, 500)
    destination = created.data
  }

  const now = new Date().toISOString()
  const { data, error } = await sb.from('data_syncs').insert({
    workspace_id: who.workspace, destination_id: destination.id, source: source.id, connection_id: connection.id, streams, hour,
    created_by: who.userId, run_requested_at: now, next_run_at: now,
  }).select('id').single()
  if (error) {
    if (error.code === '23505') return json({ error: `Já existe uma sincronização do ${source.name}. Edite a que existe.` }, 409)
    console.error('dados: falha ao criar', error)
    return json({ error: 'Não foi possível criar a sincronização.' }, 500)
  }
  return json({ id: data.id }, 201)
}
