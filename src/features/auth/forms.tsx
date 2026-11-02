'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Check, Eye, EyeOff, Instagram, Loader2, MailCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { TikTokIcon } from '../posts/badges'
import { updateSettings } from '../settings/store'
import { authMessage, callbackUrl, emailOk, passwordScore, scoreLabel } from './session'
import a from './auth.module.css'

function PasswordInput({ value, onChange, autoComplete, id, invalid }: { value: string; onChange: (v: string) => void; autoComplete: string; id: string; invalid?: boolean }) {
  const [show, setShow] = useState(false)
  return <span className={`${a.passWrap} ${invalid ? a.invalid : ''}`}>
    <input id={id} type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} autoComplete={autoComplete} placeholder="••••••••" aria-invalid={invalid} />
    <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Esconder senha' : 'Mostrar senha'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
  </span>
}

export function LoginForm({ next = '/', linkError = false }: { next?: string; linkError?: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(linkError ? 'O link expirou ou já foi usado. Entre com sua senha ou peça outro link.' : '')
  const emailErr = tried && !emailOk(email) ? (email ? 'Confira o e-mail: falta algo, como o @ ou o domínio.' : 'Digite seu e-mail.') : ''
  const passErr = tried && !password ? 'Digite sua senha.' : ''

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setTried(true); setError('')
    if (!emailOk(email) || !password) return
    setBusy(true)
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password })
    if (error) { setBusy(false); setError(authMessage(error)); return }
    router.replace(next.startsWith('/') && !next.startsWith('//') ? next : '/')
  }

  return <>
    <h1 className={a.title}>Entrar</h1>
    <p className={a.sub}>Bem-vindo de volta. Entre para ver seus spaces e posts.</p>
    <form className={a.form} onSubmit={submit} noValidate>
      <label htmlFor="email">E-mail</label>
      <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="voce@empresa.com" className={emailErr ? a.invalid : ''} aria-invalid={!!emailErr} autoFocus />
      {emailErr && <small className={a.err}>{emailErr}</small>}
      <div className={a.labelRow}><label htmlFor="senha">Senha</label><Link href="/recuperar-senha">Esqueci a senha</Link></div>
      <PasswordInput id="senha" value={password} onChange={setPassword} autoComplete="current-password" invalid={!!passErr} />
      {passErr && <small className={a.err}>{passErr}</small>}
      {error && <p className={a.alert} role="alert">{error}</p>}
      <button className={a.primary} disabled={busy}>{busy ? <><Loader2 size={17} className={a.spin} />Entrando…</> : 'Entrar'}</button>
    </form>
    <p className={a.switch}>Ainda não tem conta? <Link href="/cadastro">Criar conta grátis</Link></p>
  </>
}

const businessTypes = ['Empresa de software', 'Loja ou e-commerce', 'Agência de marketing', 'Criador de conteúdo', 'Serviços (clínica, escritório…)', 'Hotel, restaurante ou turismo', 'Outro']
const teamSizes = ['Só eu', '2 a 5', '6 a 20', 'Mais de 20']

export function SignupFlow() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [confirmEmail, setConfirmEmail] = useState(false)
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
  // The account, profile and workspace are created together (the database trigger reads this metadata).
  const createAccount = async () => {
    setTried(true); setError('')
    if (Object.values(errs2).some(Boolean)) return
    setBusy('create')
    const role = form.role.trim() || 'Fundador'
    const { data, error } = await supabase().auth.signUp({
      email: form.email.trim(), password: form.password,
      options: {
        data: { name: form.name.trim(), role, workspace: form.workspace.trim(), business: form.business, team_size: form.team },
        emailRedirectTo: callbackUrl('/?bemvindo=1'),
      },
    })
    setBusy(null)
    if (error) { setError(authMessage(error)); if (error.code === 'user_already_exists') setStep(1); return }
    // Supabase answers an existing e-mail with a user that has no identities (so accounts can't be probed).
    if (data.user && data.user.identities?.length === 0) { setError(authMessage({ code: 'user_already_exists' })); setStep(1); return }
    updateSettings('profile', { name: form.name.trim(), role })
    updateSettings('workspace', { name: form.workspace.trim() })
    setTried(false)
    if (data.session) setStep(3)
    else setConfirmEmail(true)
  }
  const finish = () => { setBusy('finish'); router.replace('/?bemvindo=1') }
  const connect = (net: string) => setConnected(c => [...c, net])
  const err = (k: string, e: string) => tried && e ? <small className={a.err} key={k}>{e}</small> : null

  if (confirmEmail) return <div className={a.sent}>
    <span className={a.sentIcon}><MailCheck size={26} /></span>
    <h1 className={a.title}>Confirme seu e-mail</h1>
    <p className={a.sub}>Enviamos um link para <b>{form.email.trim()}</b>. Abra o e-mail neste aparelho e clique no link para entrar no OttoSocial. Não chegou? Veja o spam.</p>
    <p className={a.switch}>Já confirmou? <Link href="/login">Entrar</Link></p>
  </div>

  return <>
    <ol className={a.steps} aria-label="Etapas">{['Sua conta', 'Seu workspace', 'Suas redes'].map((l, i) => <li key={l} className={step > i + 1 ? a.stepDone : step === i + 1 ? a.stepOn : ''}><i>{step > i + 1 ? <Check size={12} /> : i + 1}</i>{l}</li>)}</ol>

    {step === 1 && <>
      <h1 className={a.title}>Criar conta</h1>
      <p className={a.sub}>Grátis para começar. Leva menos de um minuto.</p>
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
        {error && <p className={a.alert} role="alert">{error}</p>}
        <button className={a.primary}>Continuar</button>
      </form>
      <p className={a.switch}>Já tem conta? <Link href="/login">Entrar</Link></p>
    </>}

    {step === 2 && <>
      <h1 className={a.title}>Seu workspace</h1>
      <p className={a.sub}>O workspace guarda os spaces, posts e contas de uma marca. Dá para mudar depois.</p>
      <form className={a.form} onSubmit={e => { e.preventDefault(); createAccount() }} noValidate>
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
        {error && <p className={a.alert} role="alert">{error}</p>}
        <div className={a.row}><button type="button" className={a.back} onClick={() => setStep(1)} disabled={busy === 'create'}><ArrowLeft size={16} />Voltar</button><button className={a.primary} disabled={busy === 'create'}>{busy === 'create' ? <><Loader2 size={17} className={a.spin} />Criando conta…</> : 'Criar conta'}</button></div>
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
      <div className={a.row}>
        <button className={a.primary} onClick={finish} disabled={busy === 'finish'}>{busy === 'finish' ? <><Loader2 size={17} className={a.spin} />Abrindo…</> : connected.length ? 'Começar a usar' : 'Pular e começar'}</button></div>
      <p className={a.demo}>Conectar o Instagram e o TikTok de verdade chega na próxima etapa. Por enquanto a conexão é de demonstração.</p>
    </>}
  </>
}

export function RecoverForm() {
  const [email, setEmail] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const bad = tried && !emailOk(email)
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setTried(true); setError('')
    if (!emailOk(email)) return
    setBusy(true)
    const { error } = await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: callbackUrl('/nova-senha') })
    setBusy(false)
    if (error) setError(authMessage(error))
    else setSent(true)
  }
  if (sent) return <div className={a.sent}>
    <span className={a.sentIcon}><MailCheck size={26} /></span>
    <h1 className={a.title}>Confira seu e-mail</h1>
    <p className={a.sub}>Se existir uma conta com <b>{email.trim()}</b>, enviamos um link para criar uma senha nova. O link vale por 1 hora.</p>
    <button className={a.secondary} onClick={() => setSent(false)}>Usar outro e-mail</button>
    <p className={a.switch}><Link href="/login">Voltar para o login</Link></p>
      </div>
  return <>
    <Link href="/login" className={a.backLink}><ArrowLeft size={15} />Voltar</Link>
    <h1 className={a.title}>Esqueceu a senha?</h1>
    <p className={a.sub}>Digite o e-mail da sua conta e mandamos um link para criar outra.</p>
    <form className={a.form} onSubmit={send} noValidate>
      <label htmlFor="email">E-mail</label>
      <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="voce@empresa.com" className={bad ? a.invalid : ''} autoFocus />
      {bad && <small className={a.err}>{email ? 'Confira o e-mail.' : 'Digite seu e-mail.'}</small>}
      {error && <p className={a.alert} role="alert">{error}</p>}
      <button className={a.primary} disabled={busy}>{busy ? <><Loader2 size={17} className={a.spin} />Enviando…</> : 'Enviar link'}</button>
    </form>
  </>
}

/** Opened from the reset e-mail: the link already signed the person in, so they only pick the new password. */
export function NewPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const score = passwordScore(password)
  const bad = password.length < 8 ? 'Use pelo menos 8 caracteres.' : score < 2 ? 'Misture letras e números para deixar mais segura.' : ''
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setTried(true); setError('')
    if (bad) return
    setBusy(true)
    const { error } = await supabase().auth.updateUser({ password })
    if (error) { setBusy(false); setError(authMessage(error)); return }
    router.replace('/')
  }
  return <>
    <h1 className={a.title}>Criar senha nova</h1>
    <p className={a.sub}>Escolha a senha que você vai usar para entrar daqui em diante.</p>
    <form className={a.form} onSubmit={save} noValidate>
      <label htmlFor="senha">Senha nova</label>
      <PasswordInput id="senha" value={password} onChange={setPassword} autoComplete="new-password" invalid={tried && !!bad} />
      {password && <div className={a.meter}><span>{[0, 1, 2, 3].map(i => <i key={i} className={i < score ? a[`m${score}`] : ''} />)}</span><small>{scoreLabel[score]}</small></div>}
      {tried && bad && <small className={a.err}>{bad}</small>}
      {error && <p className={a.alert} role="alert">{error}</p>}
      <button className={a.primary} disabled={busy}>{busy ? <><Loader2 size={17} className={a.spin} />Salvando…</> : 'Salvar e entrar'}</button>
    </form>
  </>
}
