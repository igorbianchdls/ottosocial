'use client'

import { useEffect, useState } from 'react'
import { Check, CircleAlert, Clock, Copy, Lock, ShieldCheck, Unplug, X } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { MCP_URL, activity, connections, examples, modeLabel, tools, type Assistant, type ToolMode } from './data'
import s from '@/components/ui.module.css'
import p from './plugin.module.css'

const MODES_KEY = 'ottosocial-plugin-modes-v1'
const groups = ['Drive', 'Posts', 'Legenda'] as const

export function PluginView() {
  const [connected, setConnected] = useState<Record<Assistant, boolean>>(() => Object.fromEntries(connections.map(c => [c.assistant, c.connected])) as Record<Assistant, boolean>)
  const [open, setOpen] = useState<Assistant | null>(null)
  const [modes, setModes] = useState<Record<string, ToolMode>>(() => Object.fromEntries(tools.map(t => [t.id, t.mode])))
  const [toast, setToast] = useState('')
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MODES_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setModes(m => ({ ...m, ...JSON.parse(raw) }))
    } catch { /* keeps the defaults */ }
  }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t) }, [toast])
  const setMode = (id: string, mode: ToolMode) => {
    const next = { ...modes, [id]: mode }
    setModes(next)
    try { localStorage.setItem(MODES_KEY, JSON.stringify(next)) } catch { /* storage blocked */ }
  }
  const copy = (text: string, what: string) => { navigator.clipboard?.writeText(text).catch(() => {}); setToast(`${what} copiado.`) }
  return <section className={s.content}>
    <div className={s.pageHead}><div><h1>Plugin</h1><p>Use o OttoSocial conversando no ChatGPT ou no Claude.</p></div></div>

    <div className={p.connections}>{connections.map(c => { const on = connected[c.assistant], expanded = open === c.assistant || !on; return <div key={c.assistant} className={`${s.card} ${p.conn}`}>
      <div className={p.connHead}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className={p.brand}><img src={c.logo} alt="" className={p.logo} /><b>{c.label}</b></span>
        {on ? <em className={`${s.pill} ${s.pill_publicado}`}><Check size={12} />Conectado</em> : <em className={`${s.pill} ${s.pill_rascunho}`}>Não conectado</em>}
      </div>
      {on ? <p className={s.muted}>Conectado a <b>{c.account ?? 'Workspace Otto ERP'}</b>{c.connectedAt ? ` desde ${c.connectedAt.split('-').reverse().join('/')}` : ''}.</p>
        : <p className={s.muted}>Conecte para pedir posts, legendas e agendamentos direto no {c.label}.</p>}
      {expanded && <ol className={p.steps}>{c.steps.map(step => <li key={step}>{step}</li>)}</ol>}
      {expanded && c.assistant === 'claude' && <button className={p.url} onClick={() => copy(MCP_URL, 'Endereço')}><code>{MCP_URL}</code><Copy size={14} /></button>}
      <div className={s.row}>
        {on ? <><button className={s.secondary} onClick={() => setOpen(open === c.assistant ? null : c.assistant)}>{open === c.assistant ? 'Ocultar passos' : 'Ver passos'}</button><button className={s.ghost} onClick={() => { setConnected({ ...connected, [c.assistant]: false }); setToast(`${c.label} desconectado.`) }}><Unplug size={15} />Desconectar</button></>
          : <button className={s.primary} onClick={() => { setConnected({ ...connected, [c.assistant]: true }); setToast(`${c.label} conectado (demonstração).`) }}>Conectar {c.label}</button>}
      </div>
    </div> })}</div>

    <div className={s.grid2} style={{ marginTop: 18 }}>
      <div className={s.card}>
        <div className={s.cardHead}><h2>O que o assistente pode fazer</h2><span className={p.legend}><ShieldCheck size={15} />Publicar e agendar sempre passam por você</span></div>
        {groups.map(g => <section key={g} className={p.group}><h3>{g}</h3><ul className={s.rows}>{tools.filter(t => t.group === g).map(t => <li key={t.id}>
          <span className={s.rowText}><b>{t.name}</b><small>{t.description}</small></span>
          <span className={p.modes} role="radiogroup" aria-label={`Permissão para ${t.name}`}>{(['livre', 'confirmar', 'bloqueado'] as const).filter(m => t.risky || m !== 'confirmar').map(m => <button key={m} role="radio" aria-checked={modes[t.id] === m} className={modes[t.id] === m ? p.modeOn : ''} onClick={() => setMode(t.id, m)} disabled={t.risky && m === 'livre'} title={t.risky && m === 'livre' ? 'Publicar e agendar sempre pedem confirmação' : ''}>{m === 'bloqueado' && <Lock size={12} />}{modeLabel[m]}</button>)}</span>
        </li>)}</ul></section>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
        <div className={s.card}>
          <div className={s.cardHead}><h2>Atividade</h2></div>
          <ul className={s.rows}>{activity.map(a => { const c = connections.find(x => x.assistant === a.assistant)!; return <li key={a.id}>
            <span className={`${p.status} ${p[`st_${a.status}`]}`}>{a.status === 'feito' ? <Check size={13} /> : a.status === 'aguardando' ? <Clock size={13} /> : <X size={13} />}</span>
            <span className={s.rowText} style={{ whiteSpace: 'normal' }}><b style={{ whiteSpace: 'normal' }}>{a.text}</b><small>{c.label} · {formatDateTime(a.date)}</small></span>
            {a.status === 'aguardando' && <button className={s.secondary} onClick={() => setToast('Agendamento confirmado (demonstração).')}>Confirmar</button>}
          </li> })}</ul>
        </div>
        <div className={s.card}>
          <div className={s.cardHead}><h2>Peça assim</h2></div>
          <ul className={p.examples}>{examples.map(e => <li key={e}><button onClick={() => copy(e, 'Exemplo')}>“{e}”<Copy size={13} /></button></li>)}</ul>
          <p className={p.note}><CircleAlert size={14} />Demonstração: o servidor do plugin entra na próxima fase, junto com o login.</p>
        </div>
      </div>
    </div>
    {toast && <div className={s.toast} role="status"><Check size={15} />{toast}</div>}
  </section>
}
