import type { NextRequest } from 'next/server'
import { jobSourceById, nextDailyRun } from '@/features/data/catalog'
import { json, whoIsAsking } from '@/features/connectors/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Ctx = { params: Promise<{ id: string }> }

async function own(id: string) {
  const who = await whoIsAsking()
  if (!who.userId || !who.workspace) return { fail: json({ error: 'Entre na sua conta.' }, 401) }
  if (!who.admin) return { fail: json({ error: 'Só administradores mudam sincronizações.' }, 403) }
  const { data } = await supabaseAdmin().from('data_syncs').select('id, source, hour').eq('id', id).eq('workspace_id', who.workspace).maybeSingle()
  if (!data) return { fail: json({ error: 'Sincronização não encontrada.' }, 404) }
  return { sync: data }
}

/** Pause/resume, change the hour or what is copied. Body: { ativa?, hora?, dados? }. */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const r = await own(id)
  if (r.fail) return r.fail
  const body = await request.json().catch(() => ({})) as { ativa?: unknown; hora?: unknown; dados?: unknown }
  const patch: Record<string, unknown> = {}
  if (typeof body.ativa === 'boolean') patch.enabled = body.ativa
  if (Number.isInteger(body.hora) && (body.hora as number) >= 0 && (body.hora as number) <= 23) patch.hour = body.hora
  if (Array.isArray(body.dados)) {
    const source = jobSourceById(r.sync.source)
    const streams = body.dados.filter((d): d is string => !!source?.streams.some(s => s.id === d))
    if (!streams.length) return json({ error: 'Escolha pelo menos um tipo de dado.' }, 400)
    patch.streams = streams
  }
  if (!Object.keys(patch).length) return json({ error: 'Nada para mudar.' }, 400)
  if ('hour' in patch || patch.enabled === true) patch.next_run_at = nextDailyRun((patch.hour as number | undefined) ?? r.sync.hour).toISOString()
  const { error } = await supabaseAdmin().from('data_syncs').update(patch).eq('id', id)
  return error ? json({ error: 'Não foi possível salvar.' }, 500) : json({ ok: true })
}

/** Deletes the sync and its history (the data already in BigQuery stays). */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const r = await own(id)
  if (r.fail) return r.fail
  const { error } = await supabaseAdmin().from('data_syncs').delete().eq('id', id)
  return error ? json({ error: 'Não foi possível excluir.' }, 500) : json({ ok: true })
}
