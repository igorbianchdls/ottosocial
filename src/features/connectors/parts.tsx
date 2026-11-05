'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Check, CircleCheck, ExternalLink, Loader2, X } from 'lucide-react'
import { NetworkIcon } from '@/features/posts/badges'
import type { AccountState } from '@/features/posts/accounts'
import { useAccount } from '@/features/auth/account'
import { remoteMode } from '@/lib/sync'
import type { Connector } from './catalog'
import type { Connection } from './store'
import s from '@/components/ui.module.css'
import a from '@/features/posts/accounts.module.css'
import c from './connectors.module.css'

/** The connector's mark: the network icon the app already uses, else its initial on its color (no brand logos). */
export function ConnectorBadge({ connector, size = 44 }: { connector: Connector; size?: number }) {
  if (connector.network) return <NetworkIcon network={connector.network} size={size} />
  return <span className={c.badge} style={{ width: size, height: size, background: connector.color, fontSize: size * .42 }} aria-hidden="true">{connector.name[0]}</span>
}

export type Status = 'conectado' | 'reconectar' | 'erro' | 'desconectado'
export function StatusPill({ status }: { status: Status }) {
  return <span className={`${a.status} ${c[`st_${status}`]}`}>
    {status === 'conectado' ? <><CircleCheck size={14} />Conectado</> : status === 'reconectar' ? <><AlertTriangle size={14} />Reconectar</> : status === 'erro' ? <><AlertTriangle size={14} />Com erro</> : 'Não conectado'}
  </span>
}

/**
 * Where a connector stands. A social network also counts the account Postar uses (social_accounts),
 * which may have been connected before Composio (the demo connection).
 */
export function statusOf(connection: Connection | undefined, account: AccountState | undefined): Status {
  if (connection?.status === 'conectado' || connection?.status === 'reconectar' || connection?.status === 'erro') return connection.status
  if (account?.status === 'conectada') return 'conectado'
  if (account?.status === 'reconectar') return 'reconectar'
  return 'desconectado'
}
export const labelOf = (connection: Connection | undefined, account: AccountState | undefined) => connection?.label || account?.handle || ''

/** Only workspace admins connect and disconnect (the offline demo has no roles). */
export function useIsAdmin() {
  const account = useAccount()
  return !remoteMode || account?.role === 'admin'
}

/**
 * The demo connection of a social network while Composio is not set up for it: explains the permissions,
 * "opens" the network's login and comes back connected, asking for the account's @ the first time.
 */
export function DemoConnectDialog({ connector, account, onClose, onDone }: { connector: Connector; account: AccountState; onClose: () => void; onDone: (handle: string) => void }) {
  const [step, setStep] = useState<'info' | 'wait' | 'ok'>('info')
  const [handle, setHandle] = useState(account.handle)
  const asking = !account.handle
  const cleanHandle = connector.network === 'linkedin' ? handle.trim() : handle.trim() ? '@' + handle.trim().replace(/^@+/, '') : ''
  useEffect(() => {
    if (step !== 'wait') return
    const t = setTimeout(() => setStep('ok'), 1400)
    return () => clearTimeout(t)
  }, [step])
  return <div className={a.backdrop} onPointerDown={e => { if (e.target === e.currentTarget && step !== 'wait') onClose() }}>
    <div className={a.dialog} role="dialog" aria-modal="true" aria-label={`Conectar ${connector.name}`}>
      <button className={a.close} onClick={onClose} aria-label="Fechar"><X size={18} /></button>
      <div className={a.pair}><span className={a.logoMark}>O</span><span className={a.dots}><i /><i /><i /></span><ConnectorBadge connector={connector} /></div>
      {step === 'info' && <>
        <h2>Conectar {connector.name}</h2>
        <p>Você vai entrar no {connector.name} e autorizar o OttoSocial a:</p>
        <ul className={a.perms}>{connector.permissions.map(p => <li key={p}><Check size={14} />{p}</li>)}</ul>
        {asking && <label className={a.handleField}>{connector.network === 'linkedin' ? 'Nome da página' : 'Usuário da conta'}<input value={handle} onChange={e => setHandle(e.target.value)} placeholder={connector.network === 'linkedin' ? 'Minha Empresa' : '@suamarca'} autoFocus /></label>}
        <p className={c.demoNote}>Demonstração: a conexão real pelo Composio ainda não foi ativada para o {connector.name}.</p>
        <div className={a.dialogActions}><button className={s.secondary} onClick={onClose}>Cancelar</button><button className={s.primary} disabled={asking && !cleanHandle} onClick={() => setStep('wait')}><ExternalLink size={15} />Continuar no {connector.name}</button></div>
      </>}
      {step === 'wait' && <div className={a.waiting}><Loader2 size={26} className={a.spin} /><b>Aguardando autorização…</b><span>Na versão real, a página de login do {connector.name} abre aqui.</span></div>}
      {step === 'ok' && <div className={a.waiting}><CircleCheck size={30} className={a.okIcon} /><b>{cleanHandle || account.handle} conectado</b><span>Já dá para publicar e agendar nesta conta.</span><button className={s.primary} onClick={() => onDone(cleanHandle || account.handle)}>Concluir</button></div>}
    </div>
  </div>
}
