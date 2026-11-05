'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Clock, Loader2, Lock, Plug, RefreshCw, Search, Unplug } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/format'
import { remoteMode } from '@/lib/sync'
import { setAccountStatus, useAccounts, type AccountState } from '@/features/posts/accounts'
import { usePosts } from '@/features/posts/store'
import { notify } from '@/features/notifications/store'
import { categories, connectorById, connectors, type Category, type Connector } from './catalog'
import { disconnect, mainConnection, startConnect, useConnections, type Connection } from './store'
import { ConnectorBadge, DemoConnectDialog, StatusPill, labelOf, statusOf, useIsAdmin, type Status } from './parts'
import s from '@/components/ui.module.css'
import a from '@/features/posts/accounts.module.css'
import c from './connectors.module.css'

type Tab = 'todos' | Category
const tabs: { id: Tab; label: string }[] = [{ id: 'todos', label: 'Todos' }, ...categories.map(k => ({ id: k.id, label: k.label }))]
export const isTab = (v: string | undefined): v is Tab => tabs.some(t => t.id === v)

/** How a connector is connected right now: through Composio, the demo flow (social networks only), or not yet. */
type Mode = 'composio' | 'demo' | 'breve'
type Row = { connector: Connector; connection?: Connection; account?: AccountState; status: Status; label: string; mode: Mode }

function useRows(available: string[]): Row[] {
  const { connections } = useConnections()
  const accounts = useAccounts()
  return useMemo(() => connectors.map(connector => {
    const connection = mainConnection(connections, connector.id)
    // The account Postar uses, when this connector is a social network (one per network for now).
    const account = connector.network ? accounts.find(x => x.network === connector.network) : undefined
    const mode: Mode = available.includes(connector.id) ? 'composio' : connector.network ? 'demo' : 'breve'
    return { connector, connection, account, status: statusOf(connection, account), label: labelOf(connection, account), mode }
  }), [available, connections, accounts])
}

/** Connect, reconnect and disconnect, shared by the list and the detail page. */
function useActions() {
  const [busy, setBusy] = useState<string | null>(null)
  const [demo, setDemo] = useState<Row | null>(null)
  const [confirm, setConfirm] = useState<Row | null>(null)
  const [toast, setToast] = useState('')
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t) }, [toast])

  const connect = async (row: Row) => {
    if (row.mode === 'demo') { setDemo(row); return }
    if (row.mode !== 'composio') return
    setBusy(row.connector.id)
    const error = await startConnect(row.connector.id)
    // On success the browser is already going to the service's login.
    if (error) { setBusy(null); setToast(error) }
  }
  const doDisconnect = async (row: Row) => {
    setConfirm(null)
    if (row.connection) {
      setBusy(row.connector.id)
      const error = await disconnect(row.connection.id)
      setBusy(null)
      setToast(error ?? `${row.connector.name} desconectado.`)
    } else if (row.account) {
      setAccountStatus(row.account.id, 'desconectada')
      setToast(`${row.connector.name} desconectado.`)
    }
  }

  const dialogs = <>
    {demo?.account && <DemoConnectDialog connector={demo.connector} account={demo.account} onClose={() => setDemo(null)} onDone={handle => {
      setAccountStatus(demo.account!.id, 'conectada', handle !== demo.account!.handle ? { handle } : undefined)
      notify({ kind: 'conta', title: `${demo.connector.name} conectado`, text: `${handle} já pode receber posts e agendamentos.`, href: `/conectores/${demo.connector.id}`, action: 'Ver conector' })
      setToast(`${demo.connector.name} conectado.`); setDemo(null)
    }} />}
    {confirm && <div className={a.backdrop} onPointerDown={e => { if (e.target === e.currentTarget) setConfirm(null) }}><div className={a.dialog} role="dialog" aria-modal="true" aria-label="Desconectar">
      <h2>Desconectar {confirm.label || confirm.connector.name}?</h2>
      <p>{confirm.connector.network ? 'Os posts agendados para esta conta não vão sair. Os já publicados continuam na rede.' : `O OttoSocial deixa de usar o ${confirm.connector.name} na hora.`} Você pode conectar de novo quando quiser.</p>
      <div className={a.dialogActions}><button className={s.secondary} onClick={() => setConfirm(null)}>Cancelar</button><button className={a.danger} onClick={() => void doDisconnect(confirm)}>Desconectar</button></div>
    </div></div>}
    {toast && <div className={s.toast} role="status"><Check size={15} />{toast}</div>}
  </>
  return { busy, connect, askDisconnect: setConfirm, setToast, dialogs }
}

function ConnectButton({ row, busy, onConnect, admin }: { row: Row; busy: boolean; onConnect: () => void; admin: boolean }) {
  if (row.mode === 'breve') return <button className={s.secondary} disabled title="Este conector ainda não foi ativado"><Clock size={15} />Em breve</button>
  if (!admin) return <span className={c.hint}><Lock size={13} />Só administradores conectam</span>
  const again = row.status === 'reconectar' || row.status === 'erro'
  return <button className={s.primary} onClick={onConnect} disabled={busy}>
    {busy ? <Loader2 size={15} className={a.spin} /> : again ? <RefreshCw size={15} /> : <Plug size={15} />}{again ? 'Reconectar' : 'Conectar'}
  </button>
}

// ---------- the list ----------

export function ConnectorsView({ available, tab: initialTab }: { available: string[]; tab?: string }) {
  const rows = useRows(available)
  const { loaded } = useConnections()
  const admin = useIsAdmin()
  const { busy, connect, dialogs } = useActions()
  const [tab, setTab] = useState<Tab>(isTab(initialTab) ? initialTab : 'todos')
  const [q, setQ] = useState('')
  const pick = (t: Tab) => { setTab(t); history.replaceState(null, '', t === 'todos' ? '/conectores' : `/conectores?aba=${t}`) }

  const term = q.trim().toLowerCase()
  const shown = rows.filter(r => (tab === 'todos' || r.connector.category === tab) && (!term || `${r.connector.name} ${r.connector.description}`.toLowerCase().includes(term)))
  const on = shown.filter(r => r.status !== 'desconectado')
  const off = shown.filter(r => r.status === 'desconectado')
  const total = rows.filter(r => r.status !== 'desconectado').length
  const count = (t: Tab) => rows.filter(r => (t === 'todos' || r.connector.category === t) && r.status !== 'desconectado').length
  const blurb = categories.find(k => k.id === tab)?.blurb

  const card = (r: Row) => <article key={r.connector.id} className={`${a.card} ${r.status === 'reconectar' || r.status === 'erro' ? a.warn : ''}`}>
    <header className={a.head}>
      <ConnectorBadge connector={r.connector} />
      <span className={a.name}><b>{r.connector.name}</b><small>{(r.status !== 'desconectado' && r.label) || categories.find(k => k.id === r.connector.category)?.label}</small></span>
      <StatusPill status={r.status} />
    </header>
    <p className={c.desc}>{r.connector.description}</p>
    <footer className={a.actions}>
      {r.status === 'desconectado' || r.status === 'reconectar' || r.status === 'erro' ? <ConnectButton row={r} busy={busy === r.connector.id} onConnect={() => void connect(r)} admin={admin} /> : null}
      <Link href={`/conectores/${r.connector.id}`} className={r.status === 'conectado' ? s.secondary : s.ghost}>{r.status === 'conectado' ? 'Gerenciar' : 'Detalhes'}<ChevronRight size={15} /></Link>
    </footer>
  </article>

  return <section className={s.content}>
    <div className={s.pageHead}>
      <div><h1>Conectores</h1><p>Os serviços ligados ao workspace. {remoteMode && !loaded ? 'Carregando…' : `${total} conectado${total === 1 ? '' : 's'}.`}</p></div>
      <label className={s.search}><Search size={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar conector…" aria-label="Buscar conector" /></label>
    </div>
    <nav className={c.tabs} role="tablist" aria-label="Categorias">
      {tabs.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} className={`${c.tab} ${tab === t.id ? c.tabOn : ''}`} onClick={() => pick(t.id)}>
        {t.label}{count(t.id) > 0 && <span className={c.tabCount}>{count(t.id)}</span>}
      </button>)}
    </nav>
    {blurb && <p className={c.blurb}>{blurb}</p>}

    {!shown.length && <p className={c.empty}>Nenhum conector encontrado para “{q}”.</p>}
    {on.length > 0 && <>{tab === 'todos' && <h2 className={c.group}>Conectados</h2>}<div className={a.grid}>{on.map(card)}</div></>}
    {off.length > 0 && <>{(tab === 'todos' || on.length > 0) && <h2 className={c.group}>Disponíveis</h2>}<div className={a.grid}>{off.map(card)}</div></>}

    <p className={a.note}><Lock size={13} />As conexões são feitas pelo Composio: o login acontece na página do próprio serviço e o OttoSocial nunca vê a sua senha.</p>
    {dialogs}
  </section>
}

// ---------- one connector ----------

const actionLabel = { conectou: 'Conectado', desconectou: 'Desconectado', reconectar: 'Expirou', erro: 'Erro', usou: 'Usado' } as const

export function ConnectorDetailView({ id, available, result }: { id: string; available: string[]; result?: 'ok' | 'erro' }) {
  const connector = connectorById(id)!
  const row = useRows(available).find(r => r.connector.id === id)!
  const { activity } = useConnections()
  const { posts } = usePosts()
  const admin = useIsAdmin()
  const { busy, connect, askDisconnect, setToast, dialogs } = useActions()
  const category = categories.find(k => k.id === connector.category)!

  // Coming back from the service's login.
  useEffect(() => {
    if (!result) return
    setToast(result === 'ok' ? `${connector.name} conectado.` : `A conexão com o ${connector.name} não foi concluída.`)
    history.replaceState(null, '', `/conectores/${id}`)
  }, [result]) // eslint-disable-line react-hooks/exhaustive-deps

  const mine = activity.filter(e => e.connector === id)
  const stats = useMemo(() => {
    if (!row.account || row.status === 'desconectado') return null
    const list = posts.filter(p => p.accountIds.includes(row.account!.id))
    const published = list.filter(p => p.status === 'publicado').sort((x, y) => y.date.localeCompare(x.date))
    return { published: published.length, scheduled: list.filter(p => p.status === 'agendado').length, views: published.reduce((v, p) => v + (p.metrics?.views ?? 0), 0), last: published[0]?.date }
  }, [posts, row])
  const since = row.connection?.connectedAt ?? row.account?.connectedAt

  return <section className={s.content}>
    <Link href={`/conectores?aba=${connector.category}`} className={c.back}><ArrowLeft size={15} />Conectores · {category.label}</Link>
    <header className={c.detailHead}>
      <ConnectorBadge connector={connector} size={56} />
      <div className={c.detailTitle}><h1>{connector.name}</h1><p>{connector.description}</p></div>
      <StatusPill status={row.status} />
    </header>

    <div className={c.detailGrid}>
      <div className={c.panel}>
        <h2>Conexão</h2>
        {row.status !== 'desconectado' ? <dl className={c.facts}>
          {row.label && <><dt>Conta</dt><dd>{row.label}</dd></>}
          {since && <><dt>Conectado em</dt><dd>{formatDate(since.slice(0, 10))}</dd></>}
          <dt>Via</dt><dd>{row.connection ? 'Composio' : 'Conexão de demonstração'}</dd>
          {row.connection?.error && <><dt>Aviso</dt><dd className={c.warnText}>{row.connection.error}</dd></>}
        </dl> : <p className={c.muted}>{row.mode === 'breve' ? `O ${connector.name} ainda não foi ativado. Assim que estiver disponível, um administrador conecta por aqui.` : `Nenhuma conta do ${connector.name} ligada ao workspace.`}</p>}
        {stats && <div className={a.stats}>
          <span><b>{stats.published}</b>publicados</span><span><b>{stats.scheduled}</b>agendados</span><span><b>{stats.views.toLocaleString('pt-BR')}</b>visualizações</span>
        </div>}
        {stats?.last && <p className={a.meta}>Última publicação em {formatDateTime(stats.last)}</p>}
        <div className={a.actions}>
          {row.status !== 'conectado' && <ConnectButton row={row} busy={busy === id} onConnect={() => void connect(row)} admin={admin} />}
          {row.status !== 'desconectado' && connector.network && <Link href="/posts" className={s.secondary}>Ver posts</Link>}
          {row.status !== 'desconectado' && admin && <button className={s.ghost} onClick={() => askDisconnect(row)} disabled={busy === id}><Unplug size={15} />Desconectar</button>}
        </div>
      </div>

      <div className={c.panel}>
        <h2>O que o OttoSocial pode fazer</h2>
        <ul className={a.perms}>{connector.permissions.map(p => <li key={p}><Check size={14} />{p}</li>)}</ul>
        <p className={c.muted}>Você autoriza na página do {connector.name}. Dá para desconectar a qualquer momento.</p>
      </div>

      <div className={`${c.panel} ${c.wide}`}>
        <h2>Atividade</h2>
        {mine.length ? <ul className={c.timeline}>{mine.map(e => <li key={e.id}>
          <span className={`${c.dot} ${c[`ev_${e.action}`]}`} />
          <span className={c.evText}><b>{actionLabel[e.action]}</b>{e.detail}</span>
          <time>{formatDateTime(e.date)}</time>
        </li>)}</ul> : <p className={c.muted}>Nada por aqui ainda. Conexões, desconexões e avisos aparecem nesta lista.</p>}
      </div>
    </div>
    {dialogs}
  </section>
}
