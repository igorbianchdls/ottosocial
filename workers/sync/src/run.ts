// One sync: read the source through Composio, write each table, report rows, calls and warnings.
import { composioCaller } from './composio.ts'
import { extractFacebook } from './sources/facebook.ts'
import { extractInstagram } from './sources/instagram.ts'
import { tables, type Row } from './tables.ts'
import type { Writer } from './writers.ts'

export type SyncJob = { workspace: string; source: string; connectionId: string; composioAccountId: string; streams: string[]; mode: 'incremental' | 'completo'; state: Record<string, unknown> }
export type SyncResult = { rows: Record<string, number>; calls: number; state: Record<string, unknown>; warnings: string[] }

export async function runSync(job: SyncJob, writer: Writer, composioKey: string): Promise<SyncResult> {
  const api = composioCaller({ apiKey: composioKey, accountId: job.composioAccountId, workspace: job.workspace })
  const loadedAt = new Date().toISOString()
  const control = (raw: unknown): Row => ({ _workspace: job.workspace, _conexao: job.connectionId, _carregado_em: loadedAt, _origem: raw == null ? null : JSON.stringify(raw) })
  const opts = { streams: job.streams, mode: job.mode, state: job.state, control }

  const extracted = job.source === 'instagram' ? await extractInstagram(api, opts)
    : job.source === 'facebook' ? await extractFacebook(api, opts)
    : null
  if (!extracted) throw new Error(`Fonte ainda não suportada pelo job: ${job.source}`)

  await writer.prepare()
  const rows: Record<string, number> = {}
  for (const [name, list] of Object.entries(extracted.rows)) {
    const spec = tables[name]
    if (!spec) throw new Error(`Tabela desconhecida: ${name}`)
    rows[name] = await writer.write(spec, list)
  }
  return { rows, calls: api.calls(), state: extracted.state, warnings: extracted.warnings }
}
