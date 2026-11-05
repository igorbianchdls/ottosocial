'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Check, Copy, KeyRound, Loader2, Plus, ShieldAlert, Trash2, X } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/format'
import { db, remoteMode } from '@/lib/sync'
import { useAccount } from '@/features/auth/account'
import s from '@/components/ui.module.css'
import st from '@/features/settings/settings.module.css'
import a from '@/features/posts/accounts.module.css'
import k from './apikeys.module.css'

const noSubscribe = () => () => {}

type Scope = 'ler' | 'usar' | 'agir' | 'conectar'
type Key = { id: string; name: string; prefix: string; scopes: Scope[]; created_at: string; last_used_at: string | null }

const scopeInfo: Record<Scope, { label: string; text: string }> = {
  ler: { label: 'Ler', text: 'Ver os conectores, o status e as ações de cada serviço.' },
  usar: { label: 'Usar os serviços', text: 'Executar ações de leitura nos serviços conectados (ex.: buscar arquivos, ler e-mails, ver métricas).' },
  agir: { label: 'Agir nos serviços', text: 'Executar ações que enviam, publicam, alteram ou apagam (ex.: enviar e-mail, publicar post). Use com cuidado.' },
  conectar: { label: 'Conectar serviços', text: 'Gerar links de login e desconectar serviços. Só para administradores.' },
}

/** Configurações → Chaves de API: the person's keys in the active workspace, for agents. */
export function ApiKeysSection({ onToast }: { onToast: (t: string) => void }) {
  const account = useAccount()
  const admin = account?.role === 'admin'
  const [keys, setKeys] = useState<Key[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<string | null>(null)
  const [revoke, setRevoke] = useState<Key | null>(null)

  const ws = account?.workspaceId, uid = account?.userId
  const [version, setVersion] = useState(0)
  const load = () => setVersion(v => v + 1)
  useEffect(() => {
    if (!ws || !uid) return
    let gone = false
    void db().from('api_keys').select('id, name, prefix, scopes, created_at, last_used_at')
      .eq('workspace_id', ws).eq('user_id', uid).is('revoked_at', null).order('created_at', { ascending: false })
      .then(({ data }) => { if (!gone) setKeys((data ?? []) as Key[]) })
    return () => { gone = true }
  }, [ws, uid, version])

  const doRevoke = async (key: Key) => {
    setRevoke(null)
    const res = await fetch(`/api/chaves/${key.id}/revogar`, { method: 'POST' }).catch(() => null)
    if (!res?.ok) { onToast('Não foi possível revogar a chave. Tente de novo.'); return }
    onToast(`Chave "${key.name}" revogada.`)
    load()
  }

  // The site's address, read in the browser only (the server render has no window).
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => '')

  return <>
    <div className={st.card}>
      <div className={k.head}>
        <div className={st.cardHead}><h2>Chaves de API</h2><p>Dê uma chave a um agente (Claude, ChatGPT, n8n ou o seu) para ele usar o OttoSocial e os conectores deste workspace em seu nome.</p></div>
        {remoteMode && <button className={s.primary} onClick={() => setCreating(true)}><Plus size={15} />Nova chave</button>}
      </div>
      {!remoteMode ? <p className={st.muted}>As chaves de API ficam disponíveis quando você entra com a sua conta.</p>
        : keys === null ? <p className={k.loading}><Loader2 size={16} className={a.spin} />Carregando…</p>
        : !keys.length ? <div className={k.empty}><KeyRound size={28} strokeWidth={1.5} /><b>Nenhuma chave ainda</b><span>Crie uma e cole no seu agente.</span></div>
        : <ul className={k.list}>{keys.map(key => <li key={key.id}>
          <KeyRound size={18} className={k.icon} />
          <span className={k.info}>
            <b>{key.name}</b>
            <small><code>{key.prefix}…</code> · criada em {formatDate(key.created_at.slice(0, 10))} · {key.last_used_at ? `último uso ${formatDateTime(key.last_used_at)}` : 'nunca usada'}</small>
            <span className={k.scopes}>{key.scopes.map(sc => <em key={sc}>{scopeInfo[sc].label}</em>)}</span>
          </span>
          <button className={s.ghost} onClick={() => setRevoke(key)}><Trash2 size={15} />Revogar</button>
        </li>)}</ul>}
    </div>

    <div className={st.card}>
      <div className={st.cardHead}><h2>Como usar</h2><p>O agente envia a chave no cabeçalho de cada pedido. A lista completa de rotas fica em <code>{origin}/api/v1</code>.</p></div>
      <pre className={k.code}>{`curl ${origin}/api/v1/conectores \\
  -H "Authorization: Bearer otto_sk_…"`}</pre>
      <ul className={k.howto}>
        <li><b>Ver conectores:</b> <code>GET /api/v1/conectores</code></li>
        <li><b>Conectar um serviço:</b> <code>POST /api/v1/conectores/googledrive/conectar</code> devolve um link. Uma pessoa abre e autoriza; o agente não faz login sozinho.</li>
        <li><b>Ver as ações de um serviço:</b> <code>GET /api/v1/conectores/gmail/acoes</code></li>
        <li><b>Executar uma ação:</b> <code>POST /api/v1/conectores/gmail/executar</code> com <code>{`{ "acao": "GMAIL_FETCH_EMAILS", "argumentos": { … } }`}</code>. Ações que enviam, publicam, alteram ou apagam pedem a permissão “Agir nos serviços”.</li>
        <li><b>Limites por chave:</b> 60 pedidos por minuto, 5.000 por dia e 500 ações executadas por dia.</li>
      </ul>
      <p className={k.warn}><ShieldAlert size={15} />A chave age em seu nome. Não compartilhe nem coloque em código público. Se vazar, revogue e crie outra.</p>
    </div>

    {creating && <CreateDialog admin={admin} onClose={() => setCreating(false)} onCreated={key => { setCreating(false); setCreated(key); load() }} />}
    {created && <ShowOnce keyValue={created} onClose={() => setCreated(null)} />}
    {revoke && <div className={a.backdrop} onPointerDown={e => { if (e.target === e.currentTarget) setRevoke(null) }}><div className={a.dialog} role="dialog" aria-modal="true" aria-label="Revogar chave">
      <h2>Revogar &quot;{revoke.name}&quot;?</h2>
      <p>Os agentes que usam esta chave param de funcionar na hora. Não dá para desfazer.</p>
      <div className={a.dialogActions}><button className={s.secondary} onClick={() => setRevoke(null)}>Cancelar</button><button className={a.danger} onClick={() => void doRevoke(revoke)}>Revogar</button></div>
    </div></div>}
  </>
}

function CreateDialog({ admin, onClose, onCreated }: { admin: boolean; onClose: () => void; onCreated: (key: string) => void }) {
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<Scope[]>(['ler'])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const toggle = (sc: Scope) => setScopes(v => v.includes(sc) ? v.filter(x => x !== sc) : [...v, sc])
  const submit = async () => {
    setBusy(true); setError('')
    const res = await fetch('/api/chaves', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nome: name, permissoes: scopes }) }).catch(() => null)
    const data = await res?.json().catch(() => ({})) ?? {}
    setBusy(false)
    if (!res?.ok) { setError(data.error ?? 'Não foi possível criar a chave. Tente de novo.'); return }
    onCreated(data.chave)
  }
  return <div className={a.backdrop} onPointerDown={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
    <div className={a.dialog} role="dialog" aria-modal="true" aria-label="Nova chave de API">
      <button className={a.close} onClick={onClose} aria-label="Fechar"><X size={18} /></button>
      <h2>Nova chave de API</h2>
      <label className={a.handleField}>Nome<input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Meu agente do Claude" maxLength={60} autoFocus /></label>
      <fieldset className={k.scopeList}>
        <legend>Permissões</legend>
        {(Object.keys(scopeInfo) as Scope[]).map(sc => {
          const locked = sc === 'conectar' && !admin
          return <label key={sc} className={`${k.scope} ${locked ? k.locked : ''}`}>
            <input type="checkbox" checked={scopes.includes(sc)} disabled={locked} onChange={() => toggle(sc)} />
            <span><b>{scopeInfo[sc].label}</b><small>{locked ? 'Só administradores do workspace.' : scopeInfo[sc].text}</small></span>
          </label>
        })}
      </fieldset>
      {error && <p className={k.error}>{error}</p>}
      <div className={a.dialogActions}><button className={s.secondary} onClick={onClose} disabled={busy}>Cancelar</button><button className={s.primary} onClick={() => void submit()} disabled={busy || !name.trim() || !scopes.length}>{busy ? <Loader2 size={15} className={a.spin} /> : <KeyRound size={15} />}Criar chave</button></div>
    </div>
  </div>
}

/** The whole key, once. */
function ShowOnce({ keyValue, onClose }: { keyValue: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(keyValue); setCopied(true) } catch { /* select it by hand */ } }
  return <div className={a.backdrop}>
    <div className={a.dialog} role="dialog" aria-modal="true" aria-label="Sua nova chave">
      <h2>Sua nova chave</h2>
      <p className={k.warn}><ShieldAlert size={15} />Copie agora. Por segurança ela não aparece de novo: se perder, revogue e crie outra.</p>
      <div className={k.reveal}><code>{keyValue}</code><button className={s.secondary} onClick={() => void copy()}>{copied ? <><Check size={15} />Copiada</> : <><Copy size={15} />Copiar</>}</button></div>
      <div className={a.dialogActions}><button className={s.primary} onClick={onClose}>Já copiei</button></div>
    </div>
  </div>
}
