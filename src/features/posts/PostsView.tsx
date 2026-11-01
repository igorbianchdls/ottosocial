'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Eye, Heart, List, MessageCircle, Plus, Repeat2, Trash2 } from 'lucide-react'
import { files } from '@/features/spaces/data'
import { Thumb } from '@/features/spaces/Thumb'
import { formatDateTime } from '@/lib/format'
import { NetworkIcon, StatusPill } from './badges'
import { accounts, formatLabel, type Post, type PostStatus } from './data'
import { usePosts } from './store'
import s from '@/components/ui.module.css'

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const tone: Record<PostStatus, string> = { agendado: 'var(--blue-soft)', publicado: 'var(--green-soft)', erro: 'var(--red-soft)', rascunho: '#f1f3f6' }

export function PostRow({ post, onDelete }: { post: Post; onDelete?: () => void }) {
  const f = files.find(x => x.id === post.fileIds[0])
  return <li>
    {f && <Thumb file={f} className={s.miniThumb} showKind={false} />}
    <span className={s.rowText}><b>{post.caption}</b><small>{formatLabel[post.format]}{post.fileIds.length > 1 ? ` · ${post.fileIds.length} arquivos` : ''} · {formatDateTime(post.date)}</small></span>
    <span className={s.netIcons}>{post.accountIds.map(id => { const a = accounts.find(x => x.id === id); return a && <NetworkIcon key={id} network={a.network} /> })}</span>
    {post.metrics && <span className={s.metrics}><span><Eye size={14} />{post.metrics.views.toLocaleString('pt-BR')}</span><span><Heart size={14} />{post.metrics.likes}</span><span><MessageCircle size={14} />{post.metrics.comments}</span><span><Repeat2 size={14} />{post.metrics.shares}</span></span>}
    <StatusPill status={post.status} />
    {post.url && <a className={s.iconBtn} href={post.url} target="_blank" rel="noreferrer" aria-label="Abrir no Instagram"><ExternalLink size={16} /></a>}
    {onDelete && post.status !== 'publicado' && <button className={s.iconBtn} onClick={onDelete} aria-label="Excluir"><Trash2 size={16} /></button>}
  </li>
}

export function PostsView() {
  const { posts, save } = usePosts()
  const [mode, setMode] = useState<'lista' | 'calendario'>('lista')
  const [status, setStatus] = useState<PostStatus | 'todos'>('todos')
  const [offset, setOffset] = useState(0)
  const list = posts.filter(p => status === 'todos' || p.status === status).sort((a, b) => (status === 'publicado' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))
  const base = new Date(2026, 10 + offset, 1)
  const first = new Date(base); first.setDate(1 - base.getDay())
  const days = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i))
  const monthName = base.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const count = (st: PostStatus) => posts.filter(p => p.status === st).length
  return <section className={s.content}>
    <div className={s.pageHead}><div><h1>Posts</h1><p>Agendados, publicados e rascunhos em todas as contas.</p></div><Link href="/postar" className={s.primary}><Plus size={16} />Novo post</Link></div>
    <div className={s.statsRow}>
      <div className={s.stat}><small>Agendados</small><b>{count('agendado')}</b></div>
      <div className={s.stat}><small>Publicados</small><b>{count('publicado')}</b></div>
      <div className={s.stat}><small>Visualizações</small><b>{posts.reduce((v, p) => v + (p.metrics?.views ?? 0), 0).toLocaleString('pt-BR')}</b><em>nos posts publicados</em></div>
      <div className={s.stat}><small>Comentários</small><b>{posts.reduce((v, p) => v + (p.metrics?.comments ?? 0), 0).toLocaleString('pt-BR')}</b></div>
    </div>
    <div className={s.toolbar}>
      <div className={s.segment}><button className={mode === 'lista' ? s.segOn : ''} onClick={() => setMode('lista')}><List size={15} />Lista</button><button className={mode === 'calendario' ? s.segOn : ''} onClick={() => setMode('calendario')}><CalendarDays size={15} />Calendário</button></div>
      {mode === 'lista' ? <div className={s.segment}>{(['todos', 'agendado', 'publicado', 'rascunho'] as const).map(st => <button key={st} className={status === st ? s.segOn : ''} onClick={() => setStatus(st)}>{st === 'todos' ? 'Todos' : st[0].toUpperCase() + st.slice(1) + 's'}</button>)}</div>
        : <div className={s.row}><button className={s.iconBtn} onClick={() => setOffset(offset - 1)} aria-label="Mês anterior"><ChevronLeft size={18} /></button><b style={{ minWidth: 140, textAlign: 'center', textTransform: 'capitalize' }}>{monthName}</b><button className={s.iconBtn} onClick={() => setOffset(offset + 1)} aria-label="Próximo mês"><ChevronRight size={18} /></button></div>}
    </div>
    {mode === 'lista' ? <div className={s.card}><ul className={s.rows}>{list.map(p => <PostRow key={p.id} post={p} onDelete={() => save(posts.filter(x => x.id !== p.id))} />)}{!list.length && <li className={s.empty}>Nenhum post aqui.</li>}</ul></div>
      : <div className={s.calendar}>{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <b key={d}>{d}</b>)}
        {days.map(d => { const k = dayKey(d), items = posts.filter(p => p.date.startsWith(k)); return <div key={k} className={`${s.day} ${d.getMonth() !== base.getMonth() ? s.dayOut : ''} ${k === '2026-11-01' ? s.dayToday : ''}`}>
          <span className={s.dayNum}>{d.getDate()}</span>
          {items.map(p => <span key={p.id} className={s.calPost} style={{ background: tone[p.status] }} title={p.caption}>{p.date.slice(11, 16)} {formatLabel[p.format]}</span>)}
        </div> })}
      </div>}
  </section>
}
