// otto-sync: the Cloud Run Job. Cloud Scheduler starts it every 15 minutes; each start takes the syncs that are
// due (or asked to "rodar agora" in the app), runs them, records the result and exits.
//
// Settings (Cloud Run env vars / Secret Manager):
//   SUPABASE_URL, SUPABASE_SECRET_KEY   the app's database
//   COMPOSIO_API_KEY                    reads the services
//   BQ_PROJECT                          the OttoSocial BigQuery project (used when a destination has none)
//   BQ_LOCATION                         default "US"
//   MAX_SYNCS                           syncs per start (default 10)
//   DRY_RUN_DIR                         optional: write .ndjson files there instead of BigQuery (testing)
import { createClient } from '@supabase/supabase-js'
import { runSync } from './run.ts'
import { bigQueryWriter, fileWriter } from './writers.ts'

const env = (name: string, fallback?: string) => {
  const v = process.env[name] ?? fallback
  if (!v) throw new Error(`Falta a variável ${name}`)
  return v
}

type Claimed = { run_id: string; sync_id: string; workspace_id: string; source: string; connection_id: string | null; streams: string[]; mode: 'incremental' | 'completo'; state: Record<string, unknown>; project_id: string | null; dataset: string; location: string; manual: boolean }

async function main() {
  const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SECRET_KEY'), { auth: { persistSession: false, autoRefreshToken: false } })
  const composioKey = env('COMPOSIO_API_KEY')
  const dryRun = process.env.DRY_RUN_DIR
  const defaultProject = dryRun ? 'dry-run' : env('BQ_PROJECT')
  const { data, error } = await sb.rpc('claim_due_syncs', { max_syncs: Number(process.env.MAX_SYNCS ?? 10) })
  if (error) throw error
  const claimed = (data ?? []) as Claimed[]
  console.log(`otto-sync: ${claimed.length} sincronização(ões) na vez`)

  for (const c of claimed) {
    const started = Date.now()
    try {
      const { data: conn } = c.connection_id
        ? await sb.from('connectors').select('composio_account_id, status').eq('id', c.connection_id).maybeSingle()
        : { data: null }
      if (!conn?.composio_account_id || conn.status !== 'conectado') throw new Error('A conexão não está ativa. Reconecte o serviço em Conectores.')
      const projectId = c.project_id || defaultProject
      const result = await runSync(
        { workspace: c.workspace_id, source: c.source, connectionId: c.connection_id!, composioAccountId: conn.composio_account_id, streams: c.streams, mode: c.mode, state: c.state ?? {} },
        dryRun ? fileWriter(`${dryRun}/${c.dataset}`) : bigQueryWriter({ projectId, dataset: c.dataset, location: c.location, workspace: c.workspace_id }),
        composioKey,
      )
      await sb.from('data_sync_runs').update({ status: 'ok', finished_at: new Date().toISOString(), rows: result.rows, calls: result.calls, error: result.warnings.length ? result.warnings.join('\n') : null }).eq('id', c.run_id)
      await sb.from('data_syncs').update({ state: result.state, last_run_at: new Date().toISOString(), last_status: 'ok', ...(c.mode === 'completo' ? { mode: 'incremental' } : {}) }).eq('id', c.sync_id)
      await sb.from('data_destinations').update({ status: 'ativo', error: null }).eq('workspace_id', c.workspace_id).eq('dataset', c.dataset)
      console.log(`  ${c.source} ${c.sync_id}: ok em ${Date.now() - started}ms`, result.rows, `${result.calls} chamadas`)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      console.error(`  ${c.source} ${c.sync_id}: erro`, message)
      await sb.from('data_sync_runs').update({ status: 'erro', finished_at: new Date().toISOString(), error: message.slice(0, 2000) }).eq('id', c.run_id)
      await sb.from('data_syncs').update({ last_run_at: new Date().toISOString(), last_status: 'erro' }).eq('id', c.sync_id)
      await sb.from('notifications').insert({ workspace_id: c.workspace_id, user_id: null, kind: 'erro', title: 'A sincronização com o BigQuery falhou', text: message.slice(0, 300), href: '/dados', action: 'Ver dados' })
    }
  }
}

main().catch(e => { console.error('otto-sync: falhou', e); process.exit(1) })
