'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, CalendarClock, FolderClosed, House, LogOut, PanelLeft, Send, Settings, Sparkles, UsersRound } from 'lucide-react'
import { folders, projects } from '@/lib/data'
import s from './ui.module.css'

export function Sidebar() {
  const path = usePathname()
  const inProjects = path.startsWith('/projetos') || path.startsWith('/pastas')
  const folderProject = path.startsWith('/pastas/') ? folders.find(f => f.id === path.split('/')[2])?.projectId : undefined
  const item = (href: string, label: string, Icon: typeof House, on: boolean, extra?: React.ReactNode) =>
    <Link href={href} className={`${s.navItem} ${on ? s.navOn : ''}`} aria-current={on ? 'page' : undefined}><Icon size={18} />{label}{extra}</Link>
  return <aside className={s.sidebar}>
    <div className={s.logo}><Link href="/"><span className={s.logoMark}><Sparkles size={16} /></span>OttoSocial</Link><button className={s.iconBtn} aria-label="Recolher menu"><PanelLeft size={18} /></button></div>
    {item('/', 'Início', House, path === '/')}
    {item('/projetos/otto', 'Projetos', FolderClosed, inProjects)}
    {inProjects && <div className={s.subNav}>{projects.map(p => { const on = path === `/projetos/${p.id}` || folderProject === p.id; return <Link key={p.id} href={`/projetos/${p.id}`} className={`${s.subItem} ${on ? s.subOn : ''}`}>{p.name}</Link> })}</div>}
    {item('/postar', 'Postar', Send, path === '/postar')}
    {item('/posts', 'Agendados', CalendarClock, path === '/posts', <span className={s.countBadge}>3</span>)}
    {item('/contas', 'Contas', UsersRound, path === '/contas')}
    <div className={s.spacer} />
    <div className={s.sidebarFoot}>
      {item('/configuracoes', 'Configurações', Settings, path === '/configuracoes')}
      {item('/notificacoes', 'Notificações', Bell, path === '/notificacoes', <span className={s.badge}>5</span>)}
    </div>
    <div className={s.user}><span className={s.avatar}>I</span><span><b>Igor</b><small>Workspace Otto ERP</small></span><Link href="/login" className={s.iconBtn} aria-label="Sair"><LogOut size={17} /></Link></div>
  </aside>
}
