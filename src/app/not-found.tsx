import Link from 'next/link'
import { ArrowLeft, Compass, Sparkles } from 'lucide-react'
import s from './not-found.module.css'

export const metadata = { title: 'Página não encontrada · OttoSocial' }

export default function NotFound() {
  return <main className={s.page}>
    <Link href="/" className={s.logo}><span><Sparkles size={16} /></span>OttoSocial</Link>
    <div className={s.box}>
      <span className={s.icon}><Compass size={30} /></span>
      <b className={s.code}>404</b>
      <h1>Essa página não existe</h1>
      <p>O link pode estar errado ou o item foi apagado. Se for um arquivo ou pasta, veja na lixeira dos Spaces.</p>
      <div className={s.actions}>
        <Link href="/" className={s.primary}><ArrowLeft size={16} />Voltar ao início</Link>
        <Link href="/spaces" className={s.secondary}>Abrir Spaces</Link>
        <Link href="/spaces/lixeira" className={s.secondary}>Ver lixeira</Link>
      </div>
      <small>Dica: dentro do app, Ctrl+K busca em tudo.</small>
    </div>
  </main>
}
