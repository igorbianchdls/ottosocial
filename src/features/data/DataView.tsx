'use client'
/* eslint-disable @next/next/no-img-element -- small static logos, nothing for next/image to optimize */

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, CircleCheck, Clock, ExternalLink, Loader2, Lock, Pause, Play, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { db, remoteMode } from '@/lib/sync'
import { useAccount } from '@/features/auth/account'
import { useIsAdmin } from '@/features/connectors/parts'
import { mainConnection, useConnections } from '@/features/connectors/store'
import { datasetFor, googleSources, jobSourceById, jobSources, type DataSource } from './catalog'
import s from '@/components/ui.module.css'
import a from '@/features/posts/accounts.module.css'
import c from '@/features/connectors/connectors.module.css'
import d from './data.module.css'

type Sync = { id: string; source: DataSource; streams: string[]; hour: number; enabled: boolean; next_run_at: string; last_run_at: string | null; last_status: 'ok' | 'erro' | null; run_requested_at: string | null; created_at: string }
type Run = { id: string; sync_id: string; status: 'rodando' | 'ok' | 'erro'; trigger: 'agenda' | 'manual'; started_at: string; finished_at: string | null; rows: Record<string, number>; calls: number; error: string | null }
type Destination = { id: string; dataset: string; location: string; status: 'pendente' | 'ativo' | 'erro'; error: string | null; project_id: string | null }
type Data = { loaded: boolean; syncs: Sync[]; runs: Run[]; destination: Destination | null }

// The offline demo shows a sample so the screen can be seen without signing in.
const demoNow = '2026-11-05T09:00:00Z'
const demo: Data = {
  loaded: true,
  destination: { id: 'd1', dataset: 'otto_demo', location: 'US', status: 'ativo', error: null, project_id: null },
  syncs: [{ id: 's1', source: 'instagram', streams: ['posts', 'conta'], hour: 3, enabled: true, next_run_at: '2026-11-06T06:00:00Z', last_run_at: '2026-11-05T06:01:12Z', last_status: 'ok', run_requested_at: null, created_at: '2026-11-01T12:00:00Z' }],
  runs: [
    { id: 'r3', sync_id: 's1', status: 'ok', trigger: 'agenda', started_at: '2026-11-05T06:00:40Z', finished_at: '2026-11-05T06:01:12Z', rows: { instagram_posts: 6, instagram_post_metricas: 6, instagram_conta_diaria: 1 }, calls: 3, error: null },
    { id: 'r2', sync_id: 's1', status: 'ok', trigger: 'agenda', started_at: '2026-11-04T06:00:35Z', finished_at: '2026-11-04T06:01:02Z', rows: { instagram_posts: 5, instagram_post_metricas: 5, instagram_conta_diaria: 1 }, calls: 3, error: null },
    { id: 'r1', sync_id: 's1', status: 'ok', trigger: 'manual', started_at: '2026-11-01T12:05:10Z', finished_at: '2026-11-01T12:05:58Z', rows: { instagram_posts: 28, instagram_post_metricas: 28, instagram_conta_diaria: 7 }, calls: 9, error: null },
  ],
}
const empty: Data = { loaded: false, syncs: [], runs: [], destination: null }

function useData() {
  const account = useAccount()
  const ws = account?.workspaceId
  const [data, setData] = useState<Data>(remoteMode ? empty : demo)
  const [version, setVersion] = useState(0)
  const reload = () => setVersion(v => v + 1)
  useEffect(() => {
    if (!remoteMode || !ws) return
    let gone = false
    void Promise.all([
      db().from('data_syncs').select('id, source, streams, hour, enabled, next_run_at, last_run_at, last_status, run_requested_at, created_at').eq('workspace_id', ws).order('created_at'),
      db().from('data_sync_runs').select('id, sync_id, status, trigger, started_at, finished_at, rows, calls, error').eq('workspace_id', ws).order('started_at', { ascending: false }).limit(60),
      db().from('data_destinations').select('id, dataset, location, status, error, project_id').eq('workspace_id', ws).eq('kind', 'bigquery').maybeSingle(),
    ]).then(([syncs, runs, dest]) => {
      if (!gone) setData({ loaded: true, syncs: (syncs.data ?? []) as Sync[], runs: (runs.data ?? []) as Run[], destination: (dest.data ?? null) as Destination | null })
    })
    return () => { gone = true }
  }, [ws, version])
  // While something is waiting or running, check again every 20 s.
  const busy = data.syncs.some(x => x.run_requested_at) || data.runs.some(r => r.status === 'rodando')
  useEffect(() => {
    if (!remoteMode || !busy) return
    const t = setInterval(reload, 20_000)
    return () => clearInterval(t)
  }, [busy])
  return { data, reload, workspace: ws ?? 'demo' }
}

async function call(url: string, method: string, body?: unknown): Promise<string | undefined> {
  if (!remoteMode) return 'Na demonstração as sincronizações não rodam. Entre com a sua conta.'
  try {
    const res = await fetch(url, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
    if (res.ok) return
    return ((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Algo deu errado. Tente de novo.'
  } catch { return 'Sem conexão com o servidor.' }
}

const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`
const totalRows = (rows: Record<string, number>) => Object.values(rows ?? {}).reduce((n, v) => n + (v || 0), 0)
const duration = (r: Run) => r.finished_at ? `${Math.max(1, Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000))} s` : '—'

type Tab = 'sincronizacoes' | 'destinos' | 'historico'

export function DataView({ initialNew }: { initialNew?: string }) {
  const { data, reload, workspace } = useData()
  const admin = useIsAdmin()
  const [tab, setTab] = useState<Tab>('sincronizacoes')
  const [creating, setCreating] = useState<DataSource | null | false>(initialNew && jobSourceById(initialNew)?.ready ? initialNew as DataSource : false)
  const [guide, setGuide] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t) }, [toast])
  const runsBySync = useMemo(() => new Map(data.syncs.map(x => [x.id, data.runs.filter(r => r.sync_id === x.id)])), [data])

  const act = async (url: string, method: string, body: unknown, ok: string) => {
    const error = await call(url, method, body)
    setToast(error ?? ok)
    if (!error) reload()
  }

  return <section className={s.content}>
    <div className={s.pageHead}>
      <div><h1>Dados</h1><p>Leve os números das suas redes para o BigQuery, todo dia, para montar relatórios e painéis.</p></div>
      {admin && <button className={s.primary} onClick={() => setCreating(null)}><Plus size={16} />Nova sincronização</button>}
    </div>
    <nav className={c.tabs} role="tablist" aria-label="Seções">
      {([['sincronizacoes', 'Sincronizações'], ['destinos', 'Destinos'], ['historico', 'Histórico']] as [Tab, string][]).map(([id, label]) =>
        <button key={id} role="tab" aria-selected={tab === id} className={`${c.tab} ${tab === id ? c.tabOn : ''}`} onClick={() => setTab(id)}>{label}</button>)}
    </nav>

    {tab === 'sincronizacoes' && <>
      <h2 className={c.group}>Copiadas pelo OttoSocial</h2>
      {remoteMode && !data.loaded ? <p className={d.loading}><Loader2 size={16} className={a.spin} />Carregando…</p>
        : !data.syncs.length ? <div className={d.empty}>
          <span className={d.flow}><img src="/logos/connectors/instagram-icon.svg" alt="" /><ArrowRight size={18} /><img src="/logos/connectors/bigquery.svg" alt="" /></span>
          <b>Nenhuma sincronização ainda</b>
          <span>Escolha o que levar, e o OttoSocial copia todo dia no horário que você quiser.</span>
          {admin && <button className={s.primary} onClick={() => setCreating(null)}><Plus size={16} />Nova sincronização</button>}
        </div>
        : <ul className={d.list}>{data.syncs.map(x => {
          const src = jobSourceById(x.source)
          const last = runsBySync.get(x.id)?.[0]
          const running = last?.status === 'rodando'
          const waiting = !!x.run_requested_at && !running
          return <li key={x.id} className={!x.enabled ? d.paused : ''}>
            <span className={d.flow}><img src={src?.logo} alt="" /><ArrowRight size={16} /><img src="/logos/connectors/bigquery.svg" alt="" /></span>
            <span className={d.info}>
              <b>{src?.name} → BigQuery</b>
              <small>{x.streams.map(id => src?.streams.find(st => st.id === id)?.label ?? id).join(' · ')}</small>
              <small className={d.when}><Clock size={12} />{x.enabled ? `Todo dia às ${hourLabel(x.hour)} · próxima ${formatDateTime(x.next_run_at)}` : 'Pausada'}</small>
            </span>
            <span className={d.state}>
              {running ? <em className={d.st_running}><Loader2 size={13} className={a.spin} />Rodando</em>
                : waiting ? <em className={d.st_wait}><Clock size={13} />Na fila (até 15 min)</em>
                : x.last_status === 'ok' ? <em className={d.st_ok}><CircleCheck size={13} />{last ? `${totalRows(last.rows).toLocaleString('pt-BR')} linhas` : 'Ok'}</em>
                : x.last_status === 'erro' ? <em className={d.st_err}><AlertTriangle size={13} />Falhou</em>
                : <em className={d.st_wait}><Clock size={13} />Aguardando a primeira carga</em>}
              {x.last_run_at && <small>{formatDateTime(x.last_run_at)}</small>}
            </span>
            {admin && <span className={d.actions}>
              <button className={s.secondary} disabled={!x.enabled || running || waiting} onClick={() => void act(`/api/dados/sincronizacoes/${x.id}/rodar`, 'POST', undefined, 'Pedido enviado: roda em até 15 minutos.')}><RefreshCw size={14} />Rodar agora</button>
              <button className={s.ghost} onClick={() => void act(`/api/dados/sincronizacoes/${x.id}`, 'PATCH', { ativa: !x.enabled }, x.enabled ? 'Sincronização pausada.' : 'Sincronização retomada.')} aria-label={x.enabled ? 'Pausar' : 'Retomar'}>{x.enabled ? <Pause size={15} /> : <Play size={15} />}</button>
              <button className={s.ghost} onClick={() => { if (confirm(`Excluir a sincronização do ${src?.name}? Os dados já no BigQuery continuam lá.`)) void act(`/api/dados/sincronizacoes/${x.id}`, 'DELETE', undefined, 'Sincronização excluída.') }} aria-label="Excluir"><Trash2 size={15} /></button>
            </span>}
          </li>
        })}</ul>}

      <h2 className={c.group}>Fontes do Google · importação nativa</h2>
      <p className={c.blurb}>O próprio Google leva estes dados para o BigQuery, de graça. Configure uma vez no Google; o OttoSocial explica como.</p>
      <div className={d.cards}>{googleSources.map(g => <article key={g.id} className={d.card}>
        <header><span className={d.logo}><img src={g.logo} alt="" /></span><span><b>{g.name}</b><small>{g.how}</small></span></header>
        <button className={s.secondary} onClick={() => setGuide(g.id)}>Como ligar<ArrowRight size={14} /></button>
      </article>)}
        {jobSources.filter(x => !x.ready).map(x => <article key={x.id} className={`${d.card} ${d.soon}`}>
          <header><span className={d.logo}><img src={x.logo} alt="" /></span><span><b>{x.name}</b><small>{x.note}</small></span></header>
          <span className={c.hint}><Lock size={13} />Em breve</span>
        </article>)}
      </div>
    </>}

    {tab === 'destinos' && <div className={d.cards}>
      <article className={d.card}>
        <header><span className={d.logo}><img src="/logos/connectors/bigquery.svg" alt="" /></span><span><b>BigQuery</b><small>{data.destination?.project_id ? `Projeto ${data.destination.project_id}` : 'Projeto do OttoSocial'}</small></span>
          {data.destination?.status === 'ativo' ? <em className={d.st_ok}><CircleCheck size={13} />Ativo</em> : data.destination?.status === 'erro' ? <em className={d.st_err}><AlertTriangle size={13} />Erro</em> : <em className={d.st_wait}><Clock size={13} />{data.destination ? 'Aguardando a primeira carga' : 'Criado na primeira sincronização'}</em>}
        </header>
        <dl className={c.facts}>
          <dt>Dataset</dt><dd><code>{data.destination?.dataset ?? datasetFor(workspace)}</code></dd>
          <dt>Região</dt><dd>{data.destination?.location ?? 'US'}</dd>
          <dt>Tabelas</dt><dd className={d.tables}>{jobSources.filter(x => x.ready).flatMap(x => x.streams.flatMap(st => st.tables)).map(t => <code key={t}>{t}</code>)}</dd>
        </dl>
        {data.destination?.error && <p className={d.errorText}>{data.destination.error}</p>}
      </article>
      <article className={`${d.card} ${d.soon}`}>
        <header><span className={d.logo}><img src="/logos/connectors/bigquery.svg" alt="" /></span><span><b>Use o seu próprio BigQuery</b><small>Mande os dados para um projeto Google Cloud da sua empresa.</small></span></header>
        <span className={c.hint}><Lock size={13} />Em breve</span>
      </article>
    </div>}

    {tab === 'historico' && (data.runs.length ? <table className={s.table}>
      <thead><tr><th>Quando</th><th>Fonte</th><th>Como</th><th>Situação</th><th className={s.num}>Linhas</th><th className={s.num}>Chamadas</th><th className={s.num}>Duração</th></tr></thead>
      <tbody>{data.runs.map(r => {
        const sync = data.syncs.find(x => x.id === r.sync_id)
        return <tr key={r.id} style={{ cursor: 'default' }}>
          <td>{formatDateTime(r.started_at)}</td>
          <td>{jobSourceById(sync?.source ?? '')?.name ?? '—'}</td>
          <td className={s.muted}>{r.trigger === 'manual' ? 'Rodar agora' : 'Agenda'}</td>
          <td>{r.status === 'ok' ? <em className={d.st_ok}><Check size={13} />Ok{r.error ? ' (com avisos)' : ''}</em> : r.status === 'erro' ? <em className={d.st_err} title={r.error ?? ''}><X size={13} />{(r.error ?? 'Erro').slice(0, 60)}</em> : <em className={d.st_running}><Loader2 size={13} className={a.spin} />Rodando</em>}</td>
          <td className={s.num} title={Object.entries(r.rows ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n')}>{totalRows(r.rows).toLocaleString('pt-BR')}</td>
          <td className={s.num}>{r.calls}</td>
          <td className={s.num}>{duration(r)}</td>
        </tr>
      })}</tbody>
    </table> : <p className={c.empty}>Nenhuma execução ainda.</p>)}

    {!remoteMode && <p className={a.note}><Lock size={13} />Demonstração com dados de exemplo. Com a sua conta, as sincronizações rodam de verdade.</p>}
    {creating !== false && <NewSyncDialog initial={creating} existing={data.syncs.map(x => x.source)} onClose={() => setCreating(false)} onDone={msg => { setCreating(false); setToast(msg); reload() }} workspace={workspace} />}
    {guide && <GoogleGuide id={guide} onClose={() => setGuide(null)} />}
    {toast && <div className={s.toast} role="status"><Check size={15} />{toast}</div>}
  </section>
}

function NewSyncDialog({ initial, existing, onClose, onDone, workspace }: { initial: DataSource | null; existing: DataSource[]; onClose: () => void; onDone: (msg: string) => void; workspace: string }) {
  const { connections } = useConnections()
  const connected = (id: DataSource) => !remoteMode ? id === 'instagram' : mainConnection(connections, id)?.status === 'conectado'
  const [step, setStep] = useState(initial ? 2 : 1)
  const [source, setSource] = useState<DataSource | null>(initial)
  const src = source ? jobSourceById(source) : undefined
  const [streams, setStreams] = useState<string[]>(src?.streams.map(st => st.id) ?? [])
  const [hour, setHour] = useState(3)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pick = (id: DataSource) => { setSource(id); setStreams(jobSourceById(id)?.streams.map(st => st.id) ?? []); setStep(2) }
  const create = async () => {
    setBusy(true); setError('')
    const e = await call('/api/dados/sincronizacoes', 'POST', { fonte: source, dados: streams, hora: hour })
    setBusy(false)
    if (e) setError(e); else onDone(`Sincronização criada. A primeira carga começa em até 15 minutos.`)
  }
  return <div className={a.backdrop} onPointerDown={ev => { if (ev.target === ev.currentTarget && !busy) onClose() }}>
    <div className={`${a.dialog} ${d.dialog}`} role="dialog" aria-modal="true" aria-label="Nova sincronização">
      <button className={a.close} onClick={onClose} aria-label="Fechar"><X size={18} /></button>
      <h2>Nova sincronização</h2>
      <ol className={d.steps}>{['Fonte', 'Dados', 'Horário', 'Revisar'].map((label, i) => <li key={label} className={step === i + 1 ? d.stepOn : step > i + 1 ? d.stepDone : ''}><i>{i + 1}</i>{label}</li>)}</ol>

      {step === 1 && <div className={d.choices}>{jobSources.map(x => {
        const ok = x.ready && connected(x.id) && !existing.includes(x.id)
        return <button key={x.id} className={d.choice} disabled={!ok} onClick={() => pick(x.id)}>
          <span className={d.logo}><img src={x.logo} alt="" /></span>
          <span><b>{x.name}</b><small>{!x.ready ? x.note : existing.includes(x.id) ? 'Já tem uma sincronização.' : !connected(x.id) ? 'Conecte primeiro em Conectores.' : `${x.streams.length} tipos de dado`}</small></span>
          {ok ? <ArrowRight size={16} /> : <Lock size={14} />}
        </button>
      })}
        <p className={c.muted}>Falta algum? Conecte a conta em <Link href="/conectores?aba=redes" className={s.link}>Conectores</Link> e volte aqui.</p>
      </div>}

      {step === 2 && src && <div className={d.choices}>{src.streams.map(st => <label key={st.id} className={d.check}>
        <input type="checkbox" checked={streams.includes(st.id)} onChange={() => setStreams(v => v.includes(st.id) ? v.filter(x => x !== st.id) : [...v, st.id])} />
        <span><b>{st.label}</b><small>{st.text}</small><small className={d.tables}>{st.tables.map(t => <code key={t}>{t}</code>)}</small></span>
      </label>)}</div>}

      {step === 3 && <div className={d.choices}>
        <label className={a.handleField}>Todo dia às (horário de Brasília)
          <select value={hour} onChange={e => setHour(Number(e.target.value))} className={d.select}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}</select>
        </label>
        <p className={c.muted}>De madrugada é o melhor: os números do dia anterior já estão fechados no Instagram e no Facebook.</p>
      </div>}

      {step === 4 && src && <dl className={c.facts}>
        <dt>Fonte</dt><dd>{src.name}</dd>
        <dt>Dados</dt><dd>{streams.map(id => src.streams.find(st => st.id === id)?.label).join(', ')}</dd>
        <dt>Quando</dt><dd>Todo dia às {hourLabel(hour)}, e agora a primeira carga</dd>
        <dt>Destino</dt><dd>BigQuery · <code>{datasetFor(workspace)}</code></dd>
      </dl>}

      {error && <p className={d.errorText}>{error}</p>}
      <div className={a.dialogActions}>
        {step > 1 && !initial || step > 2 ? <button className={s.secondary} onClick={() => setStep(step - 1)} disabled={busy}>Voltar</button> : <button className={s.secondary} onClick={onClose}>Cancelar</button>}
        {step === 2 && <button className={s.primary} disabled={!streams.length} onClick={() => setStep(3)}>Continuar</button>}
        {step === 3 && <button className={s.primary} onClick={() => setStep(4)}>Continuar</button>}
        {step === 4 && <button className={s.primary} onClick={() => void create()} disabled={busy}>{busy ? <Loader2 size={15} className={a.spin} /> : <Check size={15} />}Criar sincronização</button>}
      </div>
    </div>
  </div>
}

function GoogleGuide({ id, onClose }: { id: string; onClose: () => void }) {
  const g = googleSources.find(x => x.id === id)!
  return <div className={a.backdrop} onPointerDown={ev => { if (ev.target === ev.currentTarget) onClose() }}>
    <div className={`${a.dialog} ${d.dialog}`} role="dialog" aria-modal="true" aria-label={`Ligar ${g.name}`}>
      <button className={a.close} onClick={onClose} aria-label="Fechar"><X size={18} /></button>
      <header className={d.guideHead}><span className={d.logo}><img src={g.logo} alt="" /></span><span><h2>{g.name}</h2><small>{g.how} · gratuito</small></span></header>
      <ol className={d.guide}>{g.steps.map((st, i) => <li key={i}><i>{i + 1}</i><span>{st}</span></li>)}</ol>
      <p className={c.muted}>Use o mesmo projeto do BigQuery dos dados do OttoSocial, para cruzar tudo nas mesmas consultas.</p>
      <div className={a.dialogActions}><a className={s.secondary} href={g.link} target="_blank" rel="noreferrer">Guia do Google<ExternalLink size={14} /></a><button className={s.primary} onClick={onClose}>Entendi</button></div>
    </div>
  </div>
}
