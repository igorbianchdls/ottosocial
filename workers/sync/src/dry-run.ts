// Dry run: reads one source of a workspace exactly like the job, but writes the tables as .ndjson files
// instead of BigQuery, and touches nothing in the database. For checking a source end to end.
//   SUPABASE_URL=… SUPABASE_SECRET_KEY=… COMPOSIO_API_KEY=… npm run dry-run -- <workspace_id> <instagram|facebook> [saida]
import { createClient } from '@supabase/supabase-js'
import { runSync } from './run.ts'
import { fileWriter } from './writers.ts'

const [workspace, source, out = './saida'] = process.argv.slice(2)
if (!workspace || !source) { console.error('uso: dry-run <workspace_id> <instagram|facebook> [pasta]'); process.exit(1) }

const streams = source === 'instagram' ? ['posts', 'conta'] : ['posts', 'pagina']
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })
const { data: conn, error } = await sb.from('connectors').select('id, composio_account_id').eq('workspace_id', workspace).eq('connector', source).eq('status', 'conectado').limit(1).maybeSingle()
if (error) { console.error('Supabase:', error.message); process.exit(1) }
if (!conn?.composio_account_id) { console.error(`${source} não está conectado em ${workspace}`); process.exit(1) }

const result = await runSync({ workspace, source, connectionId: conn.id, composioAccountId: conn.composio_account_id, streams, mode: 'incremental', state: {} }, fileWriter(out), process.env.COMPOSIO_API_KEY!)
console.log(JSON.stringify({ linhas: result.rows, chamadas: result.calls, avisos: result.warnings, estado: result.state }, null, 2))
