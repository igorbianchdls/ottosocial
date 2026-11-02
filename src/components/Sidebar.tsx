'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Blocks, CalendarClock, Clapperboard, Clock, FolderClosed, House, LogOut, PanelLeft, Send, Search, Settings, Sparkles, Star, Trash2, UsersRound } from 'lucide-react'
import { useDrive } from '@/features/spaces/hooks'
import { openPalette } from './CommandPalette'
import s from './ui.module.css'

export function Sidebar() {
  const path = usePathname()
  const { folders, spaces } = useDrive()
  const inSpaces = path.startsWith('/spaces') || path.startsWith('/pastas')
  const folderSpace = path.startsWith('/pastas/') ? folders.find(f => f.id === path.split('/')[2])?.spaceId : undefined
  const item = (href: string, label: string, Icon: typeof House, on: boolean, extra?: React.ReactNode) =>
    <Link href={href} className={`${s.navItem} ${on ? s.navOn : ''}`} aria-current={on ? 'page' : undefined}><Icon size={18} />{label}{extra}</Link>
  return <aside className={s.sidebar}>
    <div className={s.logo}><Link href="/"><span className={s.logoMark}><Sparkles size={16} /></span>OttoSocial</Link><button className={s.iconBtn} aria-label="Recolher menu"><PanelLeft size={18} /></button></div>
    <button className={s.searchBtn} onClick={openPalette}><Search size={16} />Buscar<kbd>Ctrl K</kbd></button>
    {item('/', 'Início', House, path === '/')}
    {item('/spaces', 'Spaces', FolderClosed, inSpaces)}
    {inSpaces && <div className={s.subNav}>
      {spaces.map(p => { const on = path === `/spaces/${p.id}` || folderSpace === p.id; return <Link key={p.id} href={`/spaces/${p.id}`} className={`${s.subItem} ${on ? s.subOn : ''}`}>{p.name}</Link> })}
      <span className={s.subDivider} />
      {([['/spaces/recentes', 'Recentes', Clock], ['/spaces/favoritos', 'Favoritos', Star], ['/spaces/lixeira', 'Lixeira', Trash2]] as const).map(([href, label, Icon]) =>
        <Link key={href} href={href} className={`${s.subItem} ${path === href ? s.subOn : ''}`}><Icon size={15} className={s.subIcon} />{label}</Link>)}
    </div>}
    {item('/editor', 'Editor', Clapperboard, path.startsWith('/editor'))}
    {item('/postar', 'Postar', Send, path === '/postar')}
    {item('/posts', 'Agendados', CalendarClock, path === '/posts', <span className={s.countBadge}>3</span>)}
    {item('/contas', 'Contas', UsersRound, path === '/contas')}
    {item('/plugin', 'Plugin', Blocks, path === '/plugin')}
    <div className={s.spacer} />
    <div className={s.sidebarFoot}>
      {item('/configuracoes', 'Configurações', Settings, path === '/configuracoes')}
      {item('/notificacoes', 'Notificações', Bell, path === '/notificacoes', <span className={s.badge}>5</span>)}
    </div>
    <div className={s.user}><span className={s.avatar}>I</span><span><b>Igor</b><small>Workspace Otto ERP</small></span><Link href="/login" className={s.iconBtn} aria-label="Sair"><LogOut size={17} /></Link></div>
  </aside>
}
