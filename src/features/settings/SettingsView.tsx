'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Bell, Building2, Check, Download, HardDrive, KeyRound, Keyboard, Monitor, Moon, Palette, RotateCcw, Send, Sun, Upload, UserRound, Database } from 'lucide-react'
import { formatSize } from '@/lib/format'
import { STORAGE_LIMIT } from '@/features/spaces/data'
import { useDrive } from '@/features/spaces/hooks'
import { liveFiles, trashed } from '@/features/spaces/store'
import { formatLabel, type PostFormat } from '@/features/posts/data'
import { useAccounts } from '@/features/posts/accounts'
import { NetworkIcon } from '@/features/posts/badges'
import { kindInfo, type NotificationKind } from '../notifications/data'
import { startTour } from '@/components/Tour'
import { ManageAccountButton, ManageMembersButton } from '@/features/auth/AccountControls'
import { useAccount } from '@/features/auth/account'
import { remoteMode } from '@/lib/sync'
import { getDrive } from '@/features/spaces/store'
import { getPosts } from '@/features/posts/store'
import { getAccounts } from '@/features/posts/accounts'
import { getProjectList } from '@/features/editor/project/store'
import { getNotifications } from '@/features/notifications/store'
import { ApiKeysSection } from '@/features/apikeys/ApiKeysSection'
import { APP_KEYS, getSettings, resetSettings, updateSettings, useSettings, type Theme } from './store'
import s from '@/components/ui.module.css'
import c from './settings.module.css'

const sections = [
  { id: 'perfil', label: 'Perfil', Icon: UserRound },
  { id: 'workspace', label: 'Workspace', Icon: Building2 },
  { id: 'aparencia', label: 'Aparência', Icon: Palette },
  { id: 'notificacoes', label: 'Notificações', Icon: Bell },
  { id: 'publicacao', label: 'Publicação', Icon: Send },
  { id: 'armazenamento', label: 'Armazenamento', Icon: HardDrive },
  { id: 'atalhos', label: 'Atalhos', Icon: Keyboard },
  { id: 'api', label: 'Chaves de API', Icon: KeyRound },
  { id: 'dados', label: 'Dados e backup', Icon: Database },
] as const
type SectionId = (typeof sections)[number]['id']

const colors = ['#1c1915', '#d9502c', '#8a9a6b', '#c49a4a', '#5f6f86', '#8c5a6e']
const timezones = [['America/Sao_Paulo', 'Brasília (GMT−3)'], ['America/Manaus', 'Manaus (GMT−4)'], ['America/Rio_Branco', 'Rio Branco (GMT−5)'], ['America/Noronha', 'Fernando de Noronha (GMT−2)'], ['Europe/Lisbon', 'Lisboa'], ['UTC', 'UTC']]

export function SettingsView({ initial }: { initial?: string }) {
  const [current, setCurrent] = useState<SectionId>(sections.some(x => x.id === initial) ? initial as SectionId : 'perfil')
  const [toast, setToast] = useState('')
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t) }, [toast])
  const saved = () => setToast('Salvo.')
  return <section className={s.content}>
    <div className={s.pageHead}><div><h1>Configurações</h1><p>Perfil, workspace, aparência, notificações e como você publica. Tudo é salvo na hora.</p></div></div>
    <div className={c.layout}>
      <nav className={c.nav} aria-label="Seções">{sections.map(x => <button key={x.id} className={current === x.id ? c.navOn : ''} onClick={() => { setCurrent(x.id); history.replaceState(null, '', `?secao=${x.id}`) }}><x.Icon size={17} />{x.label}</button>)}</nav>
      <div className={c.panel}>
        {current === 'perfil' && <Profile onSave={saved} />}
        {current === 'workspace' && <Workspace onSave={saved} />}
        {current === 'aparencia' && <Appearance onSave={saved} />}
        {current === 'notificacoes' && <Notifications onSave={saved} />}
        {current === 'publicacao' && <Posting onSave={saved} />}
        {current === 'armazenamento' && <Storage />}
        {current === 'atalhos' && <Shortcuts />}
        {current === 'api' && <ApiKeysSection onToast={setToast} />}
        {current === 'dados' && <Data onToast={setToast} />}
      </div>
    </div>
    {toast && <div className={s.toast} role="status"><Check size={15} />{toast}</div>}
  </section>
}

function Card({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return <div className={c.card}><div className={c.cardHead}><h2>{title}</h2>{text && <p>{text}</p>}</div>{children}</div>
}
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div className={c.row}><span className={c.label}><b>{label}</b>{hint && <small>{hint}</small>}</span><span className={c.control}>{children}</span></div>
}
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} className={`${c.switch} ${on ? c.switchOn : ''}`} onClick={() => onChange(!on)}><i /></button>
}

function Profile({ onSave }: { onSave: () => void }) {
  const { profile } = useSettings()
  return <Card title="Perfil" text="Como você aparece no OttoSocial.">
    <div className={c.avatarRow}><span className={c.avatar} style={{ background: profile.color }}>{profile.name.trim()[0]?.toUpperCase() ?? '?'}</span>
      <div className={c.swatches}>{colors.map(col => <button key={col} className={`${c.swatch} ${profile.color === col ? c.swatchOn : ''}`} style={{ background: col }} onClick={() => { updateSettings('profile', { color: col }); onSave() }} aria-label={`Cor ${col}`} />)}</div>
    </div>
    <Row label="Nome"><input className={c.input} value={profile.name} onChange={e => updateSettings('profile', { name: e.target.value })} onBlur={onSave} /></Row>
    <Row label="Cargo" hint="Aparece para quem trabalha com você no workspace."><input className={c.input} value={profile.role} onChange={e => updateSettings('profile', { role: e.target.value })} onBlur={onSave} /></Row>
    <Row label="Conta" hint="E-mail, senha, login com Google, aparelhos conectados e excluir a conta."><ManageAccountButton className={s.secondary} fallback={<span className={c.muted}>Disponível com login</span>} /></Row>
  </Card>
}

function Workspace({ onSave }: { onSave: () => void }) {
  const { workspace } = useSettings()
  const account = useAccount()
  const readOnly = !!account && account.role !== 'admin'
  return <Card title="Workspace" text="A marca ou empresa que usa este OttoSocial.">
    <Row label="Nome do workspace" hint={readOnly ? 'Só admins mudam o nome.' : undefined}><input className={c.input} value={workspace.name} disabled={readOnly} onChange={e => updateSettings('workspace', { name: e.target.value })} onBlur={onSave} /></Row>
    <Row label="Fuso horário" hint="Usado nos agendamentos e no calendário."><select className={c.input} value={workspace.timezone} onChange={e => { updateSettings('workspace', { timezone: e.target.value }); onSave() }}>{timezones.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Row>
    <Row label="Idioma"><select className={c.input} value={workspace.language} onChange={e => { updateSettings('workspace', { language: e.target.value }); onSave() }}><option value="pt-BR">Português (Brasil)</option><option value="en" disabled>English (em breve)</option><option value="es" disabled>Español (em breve)</option></select></Row>
    <Row label="Membros" hint="Convide pessoas por e-mail e escolha quem é admin."><ManageMembersButton className={s.secondary} fallback={<span className={c.muted}>Disponível com login</span>} /></Row>
  </Card>
}

function Appearance({ onSave }: { onSave: () => void }) {
  const { appearance } = useSettings()
  const themes: { id: Theme; label: string; Icon: typeof Sun }[] = [{ id: 'claro', label: 'Claro', Icon: Sun }, { id: 'escuro', label: 'Escuro', Icon: Moon }, { id: 'sistema', label: 'Igual ao sistema', Icon: Monitor }]
  return <Card title="Aparência">
    <div className={c.themes}>{themes.map(t => <button key={t.id} className={`${c.theme} ${appearance.theme === t.id ? c.themeOn : ''}`} onClick={() => { updateSettings('appearance', { theme: t.id }); onSave() }} aria-pressed={appearance.theme === t.id}>
      <span className={`${c.mock} ${c[`mock_${t.id}`]}`}><i /><span><b /><b /><b /></span></span>
      <span className={c.themeLabel}><t.Icon size={15} />{t.label}{appearance.theme === t.id && <Check size={15} className={c.check} />}</span>
    </button>)}</div>
    <Row label="Modo compacto" hint="Letras e espaços um pouco menores, para caber mais na tela."><Toggle on={appearance.compact} onChange={v => { updateSettings('appearance', { compact: v }); onSave() }} label="Modo compacto" /></Row>
  </Card>
}

function Notifications({ onSave }: { onSave: () => void }) {
  const { notifications: prefs } = useSettings()
  const byGroup = Object.entries(kindInfo).reduce<Record<string, [NotificationKind, string][]>>((acc, [k, v]) => { (acc[v.group] ??= []).push([k as NotificationKind, v.label]); return acc }, {})
  const set = (patch: Partial<typeof prefs>) => { updateSettings('notifications', patch); onSave() }
  return <>
    <Card title="Me avise sobre" text="O que desligar aqui some da tela de notificações e do contador no menu.">
      {Object.entries(byGroup).map(([g, kinds]) => <div key={g} className={c.group}><h3>{g}</h3>
        {kinds.map(([k, label]) => <Row key={k} label={label}><Toggle on={prefs.kinds[k]} onChange={v => set({ kinds: { ...prefs.kinds, [k]: v } })} label={label} /></Row>)}
      </div>)}
    </Card>
    <Card title="Onde avisar" text="Notificações no celular e por e-mail entram junto com o login.">
      <Row label="No app" hint="Contador no menu e lista de notificações."><Toggle on={prefs.push} onChange={v => set({ push: v })} label="No app" /></Row>
      <Row label="Por e-mail"><Toggle on={prefs.email} onChange={v => set({ email: v })} label="Por e-mail" /></Row>
      <Row label="Resumo diário" hint="Um e-mail por dia com posts publicados e agendados."><Toggle on={prefs.daily} onChange={v => set({ daily: v })} label="Resumo diário" /></Row>
      <Row label="Horário silencioso" hint="Sem avisos neste intervalo."><span className={c.inline}><input type="time" className={c.input} value={prefs.quietFrom} onChange={e => set({ quietFrom: e.target.value })} aria-label="Início" />até<input type="time" className={c.input} value={prefs.quietTo} onChange={e => set({ quietTo: e.target.value })} aria-label="Fim" /></span></Row>
    </Card>
  </>
}

function Posting({ onSave }: { onSave: () => void }) {
  const { posting } = useSettings()
  const accounts = useAccounts()
  const set = (patch: Partial<typeof posting>) => { updateSettings('posting', patch); onSave() }
  return <Card title="Publicação" text="Valores que já vêm preenchidos quando você cria um post.">
    <Row label="Contas padrão"><span className={c.inline}>{accounts.filter(a => a.connected).map(a => { const on = posting.accountIds.includes(a.id); return <button key={a.id} className={`${c.pill} ${on ? c.pillOn : ''}`} onClick={() => set({ accountIds: on ? posting.accountIds.filter(x => x !== a.id) : [...posting.accountIds, a.id] })} aria-pressed={on}><NetworkIcon network={a.network} size={18} />{a.handle}</button> })}</span></Row>
    <Row label="Formato padrão"><span className={c.seg}>{(['reel', 'story', 'feed'] as PostFormat[]).map(f => <button key={f} className={posting.format === f ? c.segOn : ''} onClick={() => set({ format: f })}>{formatLabel[f]}</button>)}</span></Row>
    <Row label="Horário padrão de agendamento" hint="O próximo dia com este horário vem sugerido."><input type="time" className={c.input} value={posting.time} onChange={e => set({ time: e.target.value })} /></Row>
    <Row label="Hashtags padrão" hint="Um botão no composer coloca estas hashtags na legenda."><input className={c.input} value={posting.hashtags} placeholder="#ottoerp #gestao" onChange={e => updateSettings('posting', { hashtags: e.target.value })} onBlur={onSave} /></Row>
    <Row label="Confirmar antes de publicar agora" hint="Pede confirmação no botão “Publicar agora”."><Toggle on={posting.confirm} onChange={v => set({ confirm: v })} label="Confirmar antes de publicar" /></Row>
  </Card>
}

function Storage() {
  const drive = useDrive()
  const files = liveFiles(drive)
  const used = files.reduce((v, f) => v + f.size, 0)
  const trash = trashed(drive)
  const trashSize = trash.reduce((v, i) => v + (i.type === 'file' ? i.file.size : 0), 0)
  const [browser, setBrowser] = useState<{ usage: number; quota: number } | null>(null)
  useEffect(() => { navigator.storage?.estimate?.().then(e => setBrowser({ usage: e.usage ?? 0, quota: e.quota ?? 0 })).catch(() => {}) }, [])
  const kinds = [['Vídeos', 'video', 'var(--ink)'], ['Imagens', 'image', 'var(--accent)'], ['Áudios', 'audio', '#8a9a6b'], ['Textos', 'text', '#c49a4a']] as const
  return <Card title="Armazenamento" text="Espaço usado pelos arquivos dos seus spaces.">
    <div className={c.storageBig}><b>{formatSize(used)}</b><span>de {formatSize(STORAGE_LIMIT)} usados</span></div>
    <div className={c.stack}>{kinds.map(([l, k, col]) => { const v = files.filter(f => f.kind === k).reduce((a, f) => a + f.size, 0); return <i key={k} style={{ width: `${v / STORAGE_LIMIT * 100}%`, background: col }} title={`${l}: ${formatSize(v)}`} /> })}</div>
    <div className={c.legend}>{kinds.map(([l, k, col]) => <span key={k}><i style={{ background: col }} />{l} · {formatSize(files.filter(f => f.kind === k).reduce((a, f) => a + f.size, 0))}</span>)}</div>
    <Row label="Lixeira" hint="Itens na lixeira ainda ocupam espaço até você esvaziar."><span className={c.inline}><span className={c.muted}>{trash.length} {trash.length === 1 ? 'item' : 'itens'} · {formatSize(trashSize)}</span><Link href="/spaces/lixeira" className={s.secondary}>Abrir lixeira</Link></span></Row>
    {!remoteMode && <Row label="Neste navegador" hint="Os arquivos que você envia ficam guardados no navegador até o Supabase entrar."><span className={c.muted}>{browser ? `${formatSize(browser.usage)} usados${browser.quota ? ` de ${formatSize(browser.quota)} disponíveis` : ''}` : '—'}</span></Row>}
    <Row label="Plano"><span className={c.muted}>{remoteMode ? 'Grátis' : 'Demonstração'} · 5 GB</span></Row>
  </Card>
}

function Shortcuts() {
  const list: [string, [string, string][]][] = [
    ['Geral', [['Ctrl K', 'Buscar em tudo']]],
    ['Spaces', [['Delete', 'Mover para a lixeira'], ['F2', 'Renomear'], ['Enter', 'Abrir'], ['Ctrl A', 'Selecionar tudo'], ['Ctrl / Shift + clique', 'Selecionar vários'], ['← →', 'Navegar no visualizador']]],
    ['Editor', [['Espaço', 'Tocar / pausar'], ['J K L', 'Voltar, pausar, tocar (2x, 4x)'], ['S', 'Dividir na agulha'], ['M', 'Marcador'], ['Delete / Shift+Delete', 'Excluir / fechando o buraco'], ['Ctrl C X V D', 'Copiar, recortar, colar, duplicar'], ['Ctrl G', 'Agrupar'], ['Ctrl Z / Ctrl Shift Z', 'Desfazer / refazer'], ['F', 'Tela cheia']]],
  ]
  return <Card title="Atalhos de teclado" text="No Mac, use ⌘ no lugar de Ctrl.">
    <Row label="Tour do OttoSocial" hint="Mostra de novo as dicas da primeira visita."><button className={s.secondary} onClick={startTour}>Ver o tour</button></Row>
    {list.map(([g, items]) => <div key={g} className={c.group}><h3>{g}</h3>{items.map(([k, v]) => <div key={k} className={c.shortcut}><span>{v}</span><span className={c.keys}>{k.split(' ').map((x, i) => <kbd key={i}>{x}</kbd>)}</span></div>)}</div>)}
  </Card>
}

/** Signed in: the data is the workspace's, in the database. Backup exports it; this browser only keeps a cache. */
function WorkspaceData({ onToast }: { onToast: (t: string) => void }) {
  const { workspace } = useSettings()
  const exportAll = () => {
    const data = {
      spaces: getDrive(), posts: getPosts(), accounts: getAccounts().filter(a => a.handle), projects: getProjectList(),
      notifications: getNotifications(), settings: getSettings(),
    }
    const blob = new Blob([JSON.stringify({ app: 'ottosocial', version: 2, workspace: workspace.name, exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ottosocial-${workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    onToast('Backup baixado.')
  }
  const clearBrowser = () => {
    for (const k of APP_KEYS) localStorage.removeItem(k)
    indexedDB.deleteDatabase('ottosocial-files')
    location.reload()
  }
  return <Card title="Dados e backup" text={`Tudo do workspace ${workspace.name} fica salvo na nuvem e aparece em qualquer computador em que você entrar.`}>
    <Row label="Exportar dados" hint="Spaces, pastas e arquivos (só os dados), posts, contas, projetos do editor, notificações e configurações, em JSON."><button className={s.secondary} onClick={exportAll}><Download size={15} />Baixar backup</button></Row>
    <Row label="Limpar este navegador" hint="Apaga só o que este navegador guarda (preferências e dados da demonstração). Nada do workspace é apagado."><button className={s.secondary} onClick={clearBrowser}><RotateCcw size={15} />Limpar</button></Row>
  </Card>
}

function Data({ onToast }: { onToast: (t: string) => void }) {
  if (remoteMode) return <WorkspaceData onToast={onToast} />
  return <DemoData onToast={onToast} />
}

function DemoData({ onToast }: { onToast: (t: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [confirming, setConfirming] = useState(false)
  const exportAll = () => {
    const data: Record<string, unknown> = {}
    for (const k of APP_KEYS) { const v = localStorage.getItem(k); if (v) data[k] = JSON.parse(v) }
    const blob = new Blob([JSON.stringify({ app: 'ottosocial', version: 1, exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ottosocial-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    onToast('Backup baixado.')
  }
  const importFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text())
      if (parsed.app !== 'ottosocial' || typeof parsed.data !== 'object') throw new Error('formato')
      for (const [k, v] of Object.entries(parsed.data)) if (APP_KEYS.includes(k)) localStorage.setItem(k, JSON.stringify(v))
      location.reload()
    } catch { onToast('Este arquivo não é um backup do OttoSocial.') }
  }
  const resetAll = () => {
    for (const k of APP_KEYS) localStorage.removeItem(k)
    resetSettings()
    indexedDB.deleteDatabase('ottosocial-files')
    location.reload()
  }
  return <Card title="Dados e backup" text="Enquanto não há login, tudo fica só neste navegador. Faça um backup para não perder.">
    <Row label="Exportar backup" hint="Spaces, posts, projetos do editor, notificações e configurações. Os arquivos enviados não entram (só os dados)."><button className={s.secondary} onClick={exportAll}><Download size={15} />Baixar backup</button></Row>
    <Row label="Importar backup" hint="Substitui os dados deste navegador pelos do arquivo."><button className={s.secondary} onClick={() => input.current?.click()}><Upload size={15} />Escolher arquivo</button><input ref={input} type="file" accept="application/json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = '' }} /></Row>
    <Row label="Voltar aos dados de exemplo" hint="Apaga tudo o que você criou neste navegador, inclusive os arquivos enviados.">
      {confirming ? <span className={c.inline}><button className={s.secondary} onClick={() => setConfirming(false)}>Cancelar</button><button className={c.dangerBtn} onClick={resetAll}><RotateCcw size={15} />Apagar e recomeçar</button></span>
        : <button className={c.dangerOutline} onClick={() => setConfirming(true)}><RotateCcw size={15} />Recomeçar</button>}
    </Row>
  </Card>
}
