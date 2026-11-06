// Where the rows go: BigQuery (the job) or files on disk (the dry run, to check a source without BigQuery).
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BigQuery } from '@google-cloud/bigquery'
import type { Row, TableSpec } from './tables.ts'

export type Writer = {
  /** Creates the dataset (once per run). */
  prepare: () => Promise<void>
  /** Writes the rows of one table and returns how many went in. */
  write: (spec: TableSpec, rows: Row[]) => Promise<number>
}

const ndjson = (rows: Row[]) => rows.map(r => JSON.stringify(r)).join('\n') + '\n'

/**
 * BigQuery with load jobs (free, unlike streaming inserts):
 *  - "partition" tables: each day's rows replace that day's partition (table$YYYYMMDD, WRITE_TRUNCATE);
 *  - "merge" tables: rows go to a staging table, then a MERGE updates or adds them by key.
 */
export function bigQueryWriter(opts: { projectId: string; dataset: string; location: string; workspace: string }): Writer {
  const bq = new BigQuery({ projectId: opts.projectId })
  const ds = bq.dataset(opts.dataset, { location: opts.location })
  const schema = (spec: TableSpec) => ({ fields: spec.columns.map(c => ({ name: c.name, type: c.type, description: c.description })) })

  async function ensureTable(name: string, spec: TableSpec, extra: Record<string, unknown> = {}) {
    const table = ds.table(name)
    const [exists] = await table.exists()
    if (!exists) {
      await ds.createTable(name, {
        schema: schema(spec), description: spec.description, ...extra,
        ...(spec.write.kind === 'partition' ? { timePartitioning: { type: 'DAY', field: spec.write.dateColumn } } : {}),
        ...(spec.write.kind === 'merge' ? { clustering: { fields: [spec.write.key] } } : {}),
      })
    } else if (!name.startsWith('_stage_')) {
      // New columns added to the spec later are added to the table (BigQuery only allows adding).
      const [meta] = await table.getMetadata()
      const have = new Set<string>((meta.schema?.fields ?? []).map((f: { name: string }) => f.name))
      const missing = spec.columns.filter(c => !have.has(c.name))
      if (missing.length) await table.setMetadata({ schema: { fields: [...(meta.schema?.fields ?? []), ...missing.map(c => ({ name: c.name, type: c.type, description: c.description }))] } })
    }
    return table
  }

  async function load(tableName: string, spec: TableSpec, rows: Row[]) {
    const dir = join(tmpdir(), `otto-sync-${process.pid}`)
    await mkdir(dir, { recursive: true })
    const file = join(dir, `${tableName.replace(/\$/g, '_')}.ndjson`)
    await writeFile(file, ndjson(rows))
    try {
      await ds.table(tableName).load(file, { sourceFormat: 'NEWLINE_DELIMITED_JSON', writeDisposition: 'WRITE_TRUNCATE', schema: schema(spec) })
    } finally { await rm(file, { force: true }) }
  }

  return {
    async prepare() {
      const [exists] = await ds.exists()
      if (!exists) await bq.createDataset(opts.dataset, { location: opts.location, description: `OttoSocial · workspace ${opts.workspace}` })
    },
    async write(spec, rows) {
      if (!rows.length) return 0
      await ensureTable(spec.name, spec)
      if (spec.write.kind === 'partition') {
        const column = spec.write.dateColumn
        const byDay = new Map<string, Row[]>()
        for (const r of rows) { const d = String(r[column]); byDay.set(d, [...(byDay.get(d) ?? []), r]) }
        for (const [day, dayRows] of byDay) await load(`${spec.name}$${day.replace(/-/g, '')}`, spec, dayRows)
        return rows.length
      }
      const stage = `_stage_${spec.name}`
      await ensureTable(stage, spec, { expirationTime: String(Date.now() + 86_400_000) })
      await load(stage, spec, rows)
      const key = spec.write.key
      const cols = spec.columns.map(c => `\`${c.name}\``)
      const target = `\`${opts.projectId}.${opts.dataset}.${spec.name}\``
      const source = `\`${opts.projectId}.${opts.dataset}.${stage}\``
      await bq.query({
        location: opts.location,
        query: `MERGE ${target} T USING (SELECT * EXCEPT(_r) FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY \`${key}\`) AS _r FROM ${source}) WHERE _r = 1) S
          ON T.\`${key}\` = S.\`${key}\` AND T._workspace = S._workspace
          WHEN MATCHED THEN UPDATE SET ${cols.map(c => `${c} = S.${c}`).join(', ')}
          WHEN NOT MATCHED THEN INSERT (${cols.join(', ')}) VALUES (${cols.map(c => `S.${c}`).join(', ')})`,
      })
      return rows.length
    },
  }
}

/** Dry run: one .ndjson file per table in the folder, nothing sent to BigQuery. */
export function fileWriter(dir: string): Writer {
  return {
    prepare: () => mkdir(dir, { recursive: true }).then(() => undefined),
    async write(spec, rows) {
      await writeFile(join(dir, `${spec.name}.ndjson`), rows.length ? ndjson(rows) : '')
      return rows.length
    },
  }
}
