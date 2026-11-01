import { NetworkIcon } from './badges'
import { accounts, networkLabel } from './data'
import s from '@/components/ui.module.css'

export function AccountsView() {
  return <section className={s.content}>
    <div className={s.pageHead}><div><h1>Contas</h1><p>As redes sociais onde o OttoSocial publica.</p></div></div>
    <div className={s.card}><ul className={s.rows}>{accounts.map(a => <li key={a.id}>
      <NetworkIcon network={a.network} size={32} />
      <span className={s.rowText}><b>{a.handle}</b><small>{networkLabel[a.network]} · {a.name}</small></span>
      {a.connected ? <em className={`${s.pill} ${s.pill_publicado}`} style={{ fontStyle: 'normal' }}>Conectada</em> : <button className={s.secondary}>Conectar</button>}
    </li>)}</ul></div>
  </section>
}
