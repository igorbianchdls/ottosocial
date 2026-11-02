'use client'

// Global search (Ctrl/Cmd+K): files, folders, spaces, posts and editor projects, plus quick actions.
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell, Blocks, CalendarClock, Clapperboard, Clock, CornerDownLeft, FileText, Film, Folder, FolderClosed, House, Image as ImageIcon,
  Music, Search, Send, Star, Trash2, UsersRound,
} from 'lucide-react'
import { useDrive } from '@/features/spaces/hooks'
import { fileGone, folderGone, folderLabel, markOpened } from '@/features/spaces/store'
import { usePosts } from '@/features/posts/store'
import { formatLabel } from '@/features/posts/data'
import { sampleProjects } from '@/features/editor/project/data'
import { readSaved } from '@/features/editor/project/useEditor'
import type { Project } from '@/features/editor/project/types'
import { formatDate, formatDateTime } from '@/lib/format'
import c from './palette.module.css'

type Result = { id: string; group: string; title: string; sub?: string; icon: typeof Search; run: () => void; keywords?: string }

/** Lowercase without accents, so "acao" finds "Ação". */
const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
/** Every word of the query must appear; earlier and title matches rank higher. */
function score(r: Result, words: string[]) {
  const title = fold(r.title), all = fold(`${r.title} ${r.sub ?? ''} ${r.keywords ?? ''}`)
  if (!words.every(w => all.includes(w))) return -1
  return words.reduce((v, w) => v + (title.startsWith(w) ? 6 : title.includes(w) ? 3 : 1), 0)
}

export const PALETTE_EVENT = 'ottosocial:palette'
export const openPalette = () => window.dispatchEvent(new Event(PALETTE_EVENT))

const newProjectHref = () => `/editor/p-${Date.now().toString(36)}`
const fileIcon = { video: Film, image: ImageIcon, audio: Music, text: FileText }
const groupOrder = ['Ações', 'Recentes', 'Arquivos', 'Pastas', 'Spaces', 'Posts', 'Projetos do editor', 'Ir para']

export function CommandPalette() {
  const router = useRouter()
  const drive = useDrive()
  const { posts } = usePosts()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [projects, setProjects] = useState<Project[]>(sampleProjects)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o) } }
    const ev = () => setOpen(true)
    window.addEventListener('keydown', key)
    window.addEventListener(PALETTE_EVENT, ev)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener(PALETTE_EVENT, ev) }
  }, [])
  useEffect(() => {
    if (!open) return
    setQ(''); setActive(0)
    const saved = readSaved()
    setProjects([...Object.values(saved).filter(p => !sampleProjects.some(x => x.id === p.id)), ...sampleProjects.map(p => saved[p.id] ?? p)])
    setTimeout(() => input.current?.focus(), 0)
  }, [open])

  const go = (href: string) => { setOpen(false); router.push(href) }
  const all = useMemo<Result[]>(() => {
    const out: Result[] = []
    const actions: [string, () => string, typeof Search, string?][] = [
      ['Novo post', () => '/postar', Send, 'postar publicar agendar'],
      ['Novo projeto no editor', newProjectHref, Clapperboard, 'video editar'],
      ['Novo space', () => '/spaces', FolderClosed, 'criar'],
    ]
    actions.forEach(([title, href, icon, kw]) => out.push({ id: `a:${title}`, group: 'Ações', title, icon, keywords: kw, run: () => go(href()) }))
    const pages: [string, string, typeof Search][] = [
      ['Início', '/', House], ['Spaces', '/spaces', FolderClosed], ['Editor', '/editor', Clapperboard], ['Postar', '/postar', Send],
      ['Agendados', '/posts', CalendarClock], ['Contas', '/contas', UsersRound], ['Plugin', '/plugin', Blocks], ['Notificações', '/notificacoes', Bell],
      ['Recentes', '/spaces/recentes', Clock], ['Favoritos', '/spaces/favoritos', Star], ['Lixeira', '/spaces/lixeira', Trash2],
    ]
    pages.forEach(([title, href, icon]) => out.push({ id: `p:${href}`, group: 'Ir para', title, icon, run: () => go(href) }))
    drive.spaces.forEach(sp => out.push({ id: `s:${sp.id}`, group: 'Spaces', title: sp.name, sub: 'Space', icon: FolderClosed, run: () => go(`/spaces/${sp.id}`) }))
    drive.folders.filter(f => !folderGone(drive, f.id)).forEach(f => out.push({
      id: `d:${f.id}`, group: 'Pastas', title: f.name, icon: Folder,
      sub: [drive.spaces.find(x => x.id === f.spaceId)?.name, folderLabel(drive, f.parentId)].filter(Boolean).join(' / '),
      run: () => { markOpened({ type: 'folder', folder: f }); go(`/pastas/${f.id}`) },
    }))
    drive.files.filter(f => !fileGone(drive, f)).forEach(f => out.push({
      id: `f:${f.id}`, group: 'Arquivos', title: f.name, icon: fileIcon[f.kind],
      sub: [drive.spaces.find(x => x.id === f.spaceId)?.name, folderLabel(drive, f.folderId)].filter(Boolean).join(' / '),
      run: () => go(`${f.folderId ? `/pastas/${f.folderId}` : `/spaces/${f.spaceId}`}?arquivo=${f.id}`),
    }))
    posts.forEach(p => out.push({
      id: `t:${p.id}`, group: 'Posts', title: p.caption || 'Post sem legenda', icon: Send,
      sub: `${formatLabel[p.format]} · ${p.status} · ${formatDateTime(p.date)}`,
      run: () => go(`/posts?post=${p.id}`),
    }))
    projects.forEach(p => out.push({ id: `e:${p.id}`, group: 'Projetos do editor', title: p.name, sub: `${p.format} · editado em ${formatDate(p.updatedAt.slice(0, 10))}`, icon: Clapperboard, run: () => go(`/editor/${p.id}`) }))
    return out
    // `go` only closes the palette and navigates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drive, posts, projects])

  const results = useMemo(() => {
    const words = fold(q.trim()).split(/\s+/).filter(Boolean)
    if (!words.length) {
      const recent = drive.files.filter(f => f.openedAt && !fileGone(drive, f)).sort((a, b) => b.openedAt!.localeCompare(a.openedAt!)).slice(0, 5)
        .map(f => ({ ...all.find(r => r.id === `f:${f.id}`)!, group: 'Recentes' }))
      return [...all.filter(r => r.group === 'Ações'), ...recent, ...all.filter(r => r.group === 'Ir para').slice(0, 6)]
    }
    const scored = all.map(r => ({ r, s: score(r, words) })).filter(x => x.s >= 0).sort((a, b) => b.s - a.s)
    const perGroup = new Map<string, Result[]>()
    for (const { r } of scored) { const g = perGroup.get(r.group) ?? []; if (g.length < 6) perGroup.set(r.group, [...g, r]) }
    return groupOrder.flatMap(g => perGroup.get(g) ?? [])
  }, [q, all, drive])

  useEffect(() => { list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }) }, [active])
  if (!open) return null

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(results.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); results[active].run() }
  }
  const words = fold(q.trim()).split(/\s+/).filter(Boolean)
  /** Bold the parts of the title that match the query. */
  const mark = (text: string) => {
    if (!words.length) return text
    const f = fold(text), hits = new Array(text.length).fill(false)
    for (const w of words) { let i = f.indexOf(w); while (i >= 0) { for (let k = i; k < i + w.length; k++) hits[k] = true; i = f.indexOf(w, i + w.length) } }
    const out: React.ReactNode[] = []
    let i = 0
    while (i < text.length) { const on = hits[i]; let j = i; while (j < text.length && hits[j] === on) j++; out.push(on ? <mark key={i}>{text.slice(i, j)}</mark> : text.slice(i, j)); i = j }
    return out
  }

  let lastGroup = ''
  return <div className={c.backdrop} onPointerDown={e => { if (e.target === e.currentTarget) setOpen(false) }}>
    <div className={c.panel} role="dialog" aria-modal="true" aria-label="Busca">
      <label className={c.search}><Search size={18} /><input ref={input} value={q} onChange={e => { setQ(e.target.value); setActive(0) }} onKeyDown={onKey} placeholder="Buscar arquivos, pastas, posts, projetos…" aria-label="Buscar em tudo" /><kbd>Esc</kbd></label>
      <div className={c.list} ref={list} role="listbox">
        {results.map((r, i) => {
          const head = r.group !== lastGroup ? <div className={c.group} key={`g:${r.group}`}>{r.group}</div> : null
          lastGroup = r.group
          return [head, <button key={r.id + r.group} data-index={i} role="option" aria-selected={i === active} className={`${c.item} ${i === active ? c.active : ''}`} onMouseMove={() => setActive(i)} onClick={r.run}>
            <span className={c.icon}><r.icon size={16} /></span>
            <span className={c.text}><b>{mark(r.title)}</b>{r.sub && <small>{r.sub}</small>}</span>
            {i === active && <CornerDownLeft size={14} className={c.enter} />}
          </button>]
        })}
        {!results.length && <p className={c.empty}>Nada encontrado para “{q.trim()}”.</p>}
      </div>
      <footer className={c.foot}><span><kbd>↑</kbd><kbd>↓</kbd>navegar</span><span><kbd>Enter</kbd>abrir</span><span><kbd>Esc</kbd>fechar</span><span className={c.grow} /><span>Busca em todos os spaces</span></footer>
    </div>
  </div>
}
