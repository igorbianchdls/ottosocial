'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertTriangle, Check, CircleCheck, ExternalLink, Loader2, Lock, Plug, RefreshCw, Unplug, X } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/format'
import { NetworkIcon } from './badges'
import { networkLabel, type Network } from './data'
import { setAccountStatus, useAccounts, type AccountState } from './accounts'
import { usePosts } from './store'
import { notify } from '@/features/notifications/store'
import s from '@/components/ui.module.css'
import c from './accounts.module.css'

const permissions: Record<Network, string[]> = {
  instagram: ['Publicar Reels, Feed e Stories', 'Ler métricas dos posts', 'Ler comentários'],
  tiktok: ['Publicar vídeos e fotos', 'Ler métricas dos vídeos'],
  linkedin: ['Publicar na página da empresa', 'Ler métricas da página'],
  youtube: ['Publicar Shorts', 'Ler métricas do canal'],
}
const soon = [['Facebook', '#1877f2'], ['Threads', '#111'], ['Pinterest', '#e60023'], ['X', '#111']]

export function AccountsView() {
  const accounts = useAccounts()
  const { posts } = usePosts()
  const [connecting, setConnecting] = useState<AccountState | null>(null)
  const [confirm, setConfirm] = useState<AccountState | null>(null)
  const [toast, setToast] = useState('')
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2800); return () => clearTimeout(t) }, [toast])

  const stats = (id: string) => {
    const mine = posts.filter(p => p.accountIds.includes(id))
    const published = mine.filter(p => p.status === 'publicado').sort((a, b) => b.date.localeCompare(a.date))
    return { published: published.length, scheduled: mine.filter(p => p.status === 'agendado').length, last: published[0]?.date, views: published.reduce((v, p) => v + (p.metrics?.views ?? 0), 0) }
  }
  const connected = accounts.filter(a => a.status !== 'desconectada').length
  const stale = accounts.filter(a => a.status === 'reconectar')

  return <section className={s.content}>
    <div className={s.pageHead}><div><h1>Contas</h1><p>As redes sociais onde o OttoSocial publica. {connected} de {accounts.length} conectadas.</p></div></div>
    {stale.length > 0 && <div className={c.banner}><AlertTriangle size={17} /><span>{stale.map(a => `${networkLabel[a.network]} (${a.handle})`).join(', ')} precisa ser reconectado. Até lá, os posts agendados para essa conta não saem.</span></div>}
    <div className={c.grid}>{accounts.map(a => { const st = stats(a.id); return <article key={a.id} className={`${c.card} ${a.status === 'reconectar' ? c.warn : ''}`}>
      <header className={c.head}>
        <NetworkIcon network={a.network} size={44} />
        <span className={c.name}><b>{a.handle}</b><small>{networkLabel[a.network]} · {a.name}</small></span>
        <span className={`${c.status} ${c[`st_${a.status}`]}`}>{a.status === 'conectada' ? <><CircleCheck size={14} />Conectada</> : a.status === 'reconectar' ? <><AlertTriangle size={14} />Reconectar</> : 'Não conectada'}</span>
      </header>
      {a.status !== 'desconectada' ? <>
        <div className={c.stats}>
          <span><b>{st.published}</b>publicados</span>
          <span><b>{st.scheduled}</b>agendados</span>
          <span><b>{st.views.toLocaleString('pt-BR')}</b>visualizações</span>
        </div>
        <p className={c.meta}>{st.last ? `Última publicação em ${formatDateTime(st.last)}` : 'Nenhuma publicação ainda'}{a.connectedAt ? ` · conectada em ${formatDate(a.connectedAt)}` : ''}</p>
      </> : <ul className={c.perms}>{permissions[a.network].map(p => <li key={p}><Check size={14} />{p}</li>)}</ul>}
      <footer className={c.actions}>
        {a.status === 'desconectada' && <button className={s.primary} onClick={() => setConnecting(a)}><Plug size={15} />Conectar {networkLabel[a.network]}</button>}
        {a.status === 'reconectar' && <button className={s.primary} onClick={() => setConnecting(a)}><RefreshCw size={15} />Reconectar</button>}
        {a.status !== 'desconectada' && <><Link href="/posts" className={s.secondary}>Ver posts</Link><button className={s.ghost} onClick={() => setConfirm(a)}><Unplug size={15} />Desconectar</button></>}
      </footer>
    </article> })}</div>

    <h2 className={c.soonTitle}>Em breve</h2>
    <div className={c.soon}>{soon.map(([n, col]) => <span key={n}><i style={{ background: col }}>{n[0]}</i>{n}</span>)}</div>
    <p className={c.note}><Lock size={13} />O OttoSocial só pede as permissões necessárias para publicar e ler métricas. Nesta demonstração a conexão é simulada.</p>

    {connecting && <ConnectDialog account={connecting} onClose={() => setConnecting(null)} onDone={() => {
      setAccountStatus(connecting.id, 'conectada')
      notify({ kind: 'conta', title: `${networkLabel[connecting.network]} conectado`, text: `${connecting.handle} já pode receber posts e agendamentos.`, href: '/contas', action: 'Ver contas' })
      setToast(`${networkLabel[connecting.network]} conectado.`); setConnecting(null)
    }} />}
    {confirm && <div className={c.backdrop} onPointerDown={e => { if (e.target === e.currentTarget) setConfirm(null) }}><div className={c.dialog} role="dialog" aria-modal="true" aria-label="Desconectar">
      <h2>Desconectar {confirm.handle}?</h2>
      <p>{stats(confirm.id).scheduled ? `${stats(confirm.id).scheduled} post(s) agendado(s) para esta conta não vão sair.` : 'Você pode conectar de novo quando quiser.'} Os posts já publicados continuam na rede.</p>
      <div className={c.dialogActions}><button className={s.secondary} onClick={() => setConfirm(null)}>Cancelar</button><button className={c.danger} onClick={() => { setAccountStatus(confirm.id, 'desconectada'); setToast(`${networkLabel[confirm.network]} desconectado.`); setConfirm(null) }}>Desconectar</button></div>
    </div></div>}
    {toast && <div className={s.toast} role="status"><Check size={15} />{toast}</div>}
  </section>
}

/** Pretend OAuth: explains the permissions, "opens" the network's login and comes back connected. */
function ConnectDialog({ account, onClose, onDone }: { account: AccountState; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<'info' | 'wait' | 'ok'>('info')
  useEffect(() => {
    if (step !== 'wait') return
    const t = setTimeout(() => setStep('ok'), 1400)
    return () => clearTimeout(t)
  }, [step])
  return <div className={c.backdrop} onPointerDown={e => { if (e.target === e.currentTarget && step !== 'wait') onClose() }}>
    <div className={c.dialog} role="dialog" aria-modal="true" aria-label={`Conectar ${networkLabel[account.network]}`}>
      <button className={c.close} onClick={onClose} aria-label="Fechar"><X size={18} /></button>
      <div className={c.pair}><span className={c.logoMark}>O</span><span className={c.dots}><i /><i /><i /></span><NetworkIcon network={account.network} size={44} /></div>
      {step === 'info' && <>
        <h2>Conectar {networkLabel[account.network]}</h2>
        <p>Você vai entrar no {networkLabel[account.network]} e autorizar o OttoSocial a:</p>
        <ul className={c.perms}>{permissions[account.network].map(p => <li key={p}><Check size={14} />{p}</li>)}</ul>
        <div className={c.dialogActions}><button className={s.secondary} onClick={onClose}>Cancelar</button><button className={s.primary} onClick={() => setStep('wait')}><ExternalLink size={15} />Continuar no {networkLabel[account.network]}</button></div>
      </>}
      {step === 'wait' && <div className={c.waiting}><Loader2 size={26} className={c.spin} /><b>Aguardando autorização…</b><span>Na versão real, uma janela do {networkLabel[account.network]} abre aqui.</span></div>}
      {step === 'ok' && <div className={c.waiting}><CircleCheck size={30} className={c.okIcon} /><b>{account.handle} conectado</b><span>Já dá para publicar e agendar nesta conta.</span><button className={s.primary} onClick={onDone}>Concluir</button></div>}
    </div>
  </div>
}
