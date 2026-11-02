'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Check, Eye, EyeOff, Instagram, Loader2, MailCheck } from 'lucide-react'
import { TikTokIcon } from '../posts/badges'
import { emailOk, finishSignup, passwordScore, scoreLabel, signIn } from './session'
import a from './auth.module.css'

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

function GoogleIcon() {
  return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
}

function Social({ onPick, busy }: { onPick: (p: string) => void; busy: string | null }) {
  return <div className={a.social}>
    <button type="button" onClick={() => onPick('Google')} disabled={!!busy}>{busy === 'Google' ? <Loader2 size={18} className={a.spin} /> : <GoogleIcon />}Continuar com Google</button>
  </div>
}

function PasswordInput({ value, onChange, autoComplete, id, invalid }: { value: string; onChange: (v: string) => void; autoComplete: string; id: string; invalid?: boolean }) {
  const [show, setShow] = useState(false)
  return <span className={`${a.passWrap} ${invalid ? a.invalid : ''}`}>
    <input id={id} type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} autoComplete={autoComplete} placeholder="••••••••" aria-invalid={invalid} />
    <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Esconder senha' : 'Mostrar senha'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
  </span>
}

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const emailErr = tried && !emailOk(email) ? (email ? 'Confira o e-mail: falta algo, como o @ ou o domínio.' : 'Digite seu e-mail.') : ''
  const passErr = tried && password.length < 8 ? (password ? 'A senha tem pelo menos 8 caracteres.' : 'Digite sua senha.') : ''

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setTried(true); setError('')
    if (!emailOk(email) || password.length < 8) return
    setBusy('email'); await wait(700)
    signIn({ name: email.split('@')[0], email: email.trim() }, remember)
    router.push('/')
  }
  const social = async (p: string) => { setBusy(p); await wait(800); signIn({ name: `Conta ${p}`, email: '' }, true); router.push('/') }

  return <>
    <h1 className={a.title}>Entrar</h1>
    <p className={a.sub}>Bem-vindo de volta. Entre para ver seus spaces e posts.</p>
    <Social onPick={social} busy={busy} />
    <div className={a.or}><span>ou com e-mail</span></div>
    <form className={a.form} onSubmit={submit} noValidate>
      <label htmlFor="email">E-mail</label>
      <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="voce@empresa.com" className={emailErr ? a.invalid : ''} aria-invalid={!!emailErr} autoFocus />
      {emailErr && <small className={a.err}>{emailErr}</small>}
      <div className={a.labelRow}><label htmlFor="senha">Senha</label><Link href="/recuperar-senha">Esqueci a senha</Link></div>
      <PasswordInput id="senha" value={password} onChange={setPassword} autoComplete="current-password" invalid={!!passErr} />
      {passErr && <small className={a.err}>{passErr}</small>}
      <label className={a.check}><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Manter conectado neste computador</label>
      {error && <p className={a.alert}>{error}</p>}
      <button className={a.primary} disabled={!!busy}>{busy === 'email' ? <><Loader2 size={17} className={a.spin} />Entrando…</> : 'Entrar'}</button>
    </form>
    <p className={a.switch}>Ainda não tem conta? <Link href="/cadastro">Criar conta grátis</Link></p>
    <p className={a.demo}>Demonstração: qualquer e-mail válido e senha com 8 caracteres entram. O login de verdade vem com o Supabase.</p>
  </>
}

const businessTypes = ['Empresa de software', 'Loja ou e-commerce', 'Agência de marketing', 'Criador de conteúdo', 'Serviços (clínica, escritório…)', 'Hotel, restaurante ou turismo', 'Outro']
const teamSizes = ['Só eu', '2 a 5', '6 a 20', 'Mais de 20']

export function SignupFlow() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', terms: false, workspace: '', business: '', team: '', role: '' })
  const [connected, setConnected] = useState<string[]>([])
  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }))
  const score = passwordScore(form.password)
  const errs1 = {
    name: form.name.trim().length < 2 ? 'Digite seu nome.' : '',
    email: !emailOk(form.email) ? (form.email ? 'Confira o e-mail.' : 'Digite seu e-mail.') : '',
    password: form.password.length < 8 ? 'Use pelo menos 8 caracteres.' : score < 2 ? 'Misture letras e números para deixar mais segura.' : '',
    terms: !form.terms ? 'Aceite os termos para continuar.' : '',
  }
  const errs2 = { workspace: form.workspace.trim().length < 2 ? 'Dê um nome ao workspace (sua marca ou empresa).' : '', business: !form.business ? 'Escolha o que mais se parece com você.' : '' }
  const next = (errs: Record<string, string>) => { setTried(true); if (Object.values(errs).some(Boolean)) return; setTried(false); setStep(s => s + 1) }
  const finish = async () => {
    setBusy('finish'); await wait(800)
    finishSignup({ name: form.name.trim(), email: form.email.trim(), workspace: form.workspace.trim(), role: form.role.trim() || 'Fundador' })
    router.push('/?bemvindo=1')
  }
  const connect = async (net: string) => { setBusy(net); await wait(900); setConnected(c => [...c, net]); setBusy(null) }
  const err = (k: string, e: string) => tried && e ? <small className={a.err} key={k}>{e}</small> : null

  return <>
    <ol className={a.steps} aria-label="Etapas">{['Sua conta', 'Seu workspace', 'Suas redes'].map((l, i) => <li key={l} className={step > i + 1 ? a.stepDone : step === i + 1 ? a.stepOn : ''}><i>{step > i + 1 ? <Check size={12} /> : i + 1}</i>{l}</li>)}</ol>

    {step === 1 && <>
      <h1 className={a.title}>Criar conta</h1>
      <p className={a.sub}>Grátis para começar. Leva menos de um minuto.</p>
      <Social onPick={async p => { setBusy(p); await wait(800); set({ name: form.name || 'Você', email: form.email }); setBusy(null); setStep(2) }} busy={busy} />
      <div className={a.or}><span>ou com e-mail</span></div>
      <form className={a.form} onSubmit={e => { e.preventDefault(); next(errs1) }} noValidate>
        <label htmlFor="nome">Nome</label>
        <input id="nome" value={form.name} onChange={e => set({ name: e.target.value })} autoComplete="name" placeholder="Como você quer ser chamado" className={tried && errs1.name ? a.invalid : ''} autoFocus />
        {err('name', errs1.name)}
        <label htmlFor="email">E-mail de trabalho</label>
        <input id="email" type="email" value={form.email} onChange={e => set({ email: e.target.value })} autoComplete="email" placeholder="voce@empresa.com" className={tried && errs1.email ? a.invalid : ''} />
        {err('email', errs1.email)}
        <label htmlFor="senha">Senha</label>
        <PasswordInput id="senha" value={form.password} onChange={v => set({ password: v })} autoComplete="new-password" invalid={tried && !!errs1.password} />
        {form.password && <div className={a.meter}><span>{[0, 1, 2, 3].map(i => <i key={i} className={i < score ? a[`m${score}`] : ''} />)}</span><small>{scoreLabel[score]}</small></div>}
        {err('password', errs1.password)}
        <label className={a.check}><input type="checkbox" checked={form.terms} onChange={e => set({ terms: e.target.checked })} />Li e aceito os <a href="#termos">Termos</a> e a <a href="#privacidade">Política de privacidade</a></label>
        {err('terms', errs1.terms)}
        <button className={a.primary}>Continuar</button>
      </form>
      <p className={a.switch}>Já tem conta? <Link href="/login">Entrar</Link></p>
    </>}

    {step === 2 && <>
      <h1 className={a.title}>Seu workspace</h1>
      <p className={a.sub}>O workspace guarda os spaces, posts e contas de uma marca. Dá para mudar depois.</p>
      <form className={a.form} onSubmit={e => { e.preventDefault(); next(errs2) }} noValidate>
        <label htmlFor="ws">Nome da marca ou empresa</label>
        <input id="ws" value={form.workspace} onChange={e => set({ workspace: e.target.value })} placeholder="Ex.: Otto ERP" className={tried && errs2.workspace ? a.invalid : ''} autoFocus />
        {err('ws', errs2.workspace)}
        <label>O que descreve melhor seu negócio?</label>
        <div className={a.chips}>{businessTypes.map(b => <button type="button" key={b} className={form.business === b ? a.chipOn : ''} onClick={() => set({ business: b })} aria-pressed={form.business === b}>{b}</button>)}</div>
        {err('biz', errs2.business)}
        <label>Quantas pessoas vão usar?</label>
        <div className={a.chips}>{teamSizes.map(t => <button type="button" key={t} className={form.team === t ? a.chipOn : ''} onClick={() => set({ team: t })} aria-pressed={form.team === t}>{t}</button>)}</div>
        <label htmlFor="cargo">Seu cargo <span className={a.optional}>(opcional)</span></label>
        <input id="cargo" value={form.role} onChange={e => set({ role: e.target.value })} placeholder="Ex.: Fundador, Social media" />
        <div className={a.row}><button type="button" className={a.back} onClick={() => setStep(1)}><ArrowLeft size={16} />Voltar</button><button className={a.primary}>Continuar</button></div>
      </form>
    </>}

    {step === 3 && <>
      <h1 className={a.title}>Conecte suas redes</h1>
      <p className={a.sub}>Para publicar e agendar direto do OttoSocial. Você pode pular e conectar depois em Contas.</p>
      <div className={a.nets}>
        {[['Instagram', <Instagram key="i" size={20} />, a.ig], ['TikTok', <TikTokIcon key="t" size={18} />, a.tt]].map(([n, icon, cls]) => { const on = connected.includes(n as string); return <button key={n as string} type="button" className={`${a.net} ${on ? a.netOn : ''}`} onClick={() => !on && connect(n as string)} disabled={!!busy}>
          <span className={`${a.netIcon} ${cls}`}>{icon}</span><span className={a.netText}><b>{n}</b><small>{on ? 'Conectado (demonstração)' : 'Reels, Feed e Stories'}</small></span>
          {busy === n ? <Loader2 size={18} className={a.spin} /> : on ? <Check size={18} className={a.ok} /> : <span className={a.netBtn}>Conectar</span>}
        </button> })}
      </div>
      <div className={a.row}><button type="button" className={a.back} onClick={() => setStep(2)}><ArrowLeft size={16} />Voltar</button>
        <button className={a.primary} onClick={finish} disabled={busy === 'finish'}>{busy === 'finish' ? <><Loader2 size={17} className={a.spin} />Preparando…</> : connected.length ? 'Começar a usar' : 'Pular e começar'}</button></div>
      <p className={a.demo}>Demonstração: nenhuma conta é conectada de verdade nesta versão.</p>
    </>}
  </>
}

export function RecoverForm() {
  const [email, setEmail] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const bad = tried && !emailOk(email)
  if (sent) return <div className={a.sent}>
    <span className={a.sentIcon}><MailCheck size={26} /></span>
    <h1 className={a.title}>Confira seu e-mail</h1>
    <p className={a.sub}>Se existir uma conta com <b>{email.trim()}</b>, enviamos um link para criar uma senha nova. O link vale por 1 hora.</p>
    <button className={a.secondary} onClick={() => setSent(false)}>Usar outro e-mail</button>
    <p className={a.switch}><Link href="/login">Voltar para o login</Link></p>
    <p className={a.demo}>Demonstração: nenhum e-mail é enviado nesta versão.</p>
  </div>
  return <>
    <Link href="/login" className={a.backLink}><ArrowLeft size={15} />Voltar</Link>
    <h1 className={a.title}>Esqueceu a senha?</h1>
    <p className={a.sub}>Digite o e-mail da sua conta e mandamos um link para criar outra.</p>
    <form className={a.form} onSubmit={async e => { e.preventDefault(); setTried(true); if (!emailOk(email)) return; setBusy(true); await wait(800); setBusy(false); setSent(true) }} noValidate>
      <label htmlFor="email">E-mail</label>
      <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="voce@empresa.com" className={bad ? a.invalid : ''} autoFocus />
      {bad && <small className={a.err}>{email ? 'Confira o e-mail.' : 'Digite seu e-mail.'}</small>}
      <button className={a.primary} disabled={busy}>{busy ? <><Loader2 size={17} className={a.spin} />Enviando…</> : 'Enviar link'}</button>
    </form>
  </>
}
