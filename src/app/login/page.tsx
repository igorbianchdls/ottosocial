import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import s from './login.module.css'

export default function LoginPage() {
  return <main className={s.page}>
    <div className={s.card}>
      <div className={s.logo}><span><Sparkles size={18} /></span>OttoSocial</div>
      <h1>Entrar na sua conta</h1>
      <p className={s.sub}>Seus spaces de mídias e as suas redes sociais em um só lugar.</p>
      <form className={s.form} action="/">
        <label>E-mail<input type="email" name="email" placeholder="voce@empresa.com" autoComplete="email" /></label>
        <label>Senha<input type="password" name="senha" placeholder="••••••••" autoComplete="current-password" /></label>
        <button type="submit" className={s.primary}>Entrar</button>
      </form>
      <div className={s.or}><span>ou</span></div>
      <Link href="/" className={s.google}>Continuar com Google</Link>
      <p className={s.foot}>Ainda não tem conta? <Link href="/">Criar conta</Link></p>
      <p className={s.demo}>Demonstração: o login ainda não valida, ele só abre o app.</p>
    </div>
  </main>
}
