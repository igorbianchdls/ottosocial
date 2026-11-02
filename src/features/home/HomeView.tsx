'use client'

import Link from 'next/link'
import { ArrowRight, Plus, Upload } from 'lucide-react'
import { STORAGE_LIMIT } from '@/features/spaces/data'
import { folderLabel, liveFiles, liveFolders } from '@/features/spaces/store'
import { useDrive } from '@/features/spaces/hooks'
import { Thumb } from '@/features/spaces/Thumb'
import { PostRow } from '@/features/posts/PostsView'
import { usePosts } from '@/features/posts/store'
import { formatDate, formatSize } from '@/lib/format'
import s from '@/components/ui.module.css'

export function HomeView() {
  const { posts } = usePosts()
  const drive = useDrive()
  const files = liveFiles(drive), folders = liveFolders(drive)
  const used = files.reduce((v, f) => v + f.size, 0)
  const upcoming = posts.filter(p => p.status === 'agendado').sort((a, b) => a.date.localeCompare(b.date))
  const published = posts.filter(p => p.status === 'publicado').sort((a, b) => b.date.localeCompare(a.date))
  const recent = [...files].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt) || b.id.localeCompare(a.id)).slice(0, 6)
  return <section className={s.content}>
    <div className={s.pageHead}><div><h1>Olá, Igor</h1><p>Seus spaces de mídias e as próximas publicações.</p></div><div className={s.row}><Link href="/spaces" className={s.secondary}><Upload size={15} />Enviar arquivos</Link><Link href="/postar" className={s.primary}><Plus size={16} />Novo post</Link></div></div>
    <div className={s.statsRow}>
      <div className={s.stat}><small>Armazenamento</small><b>{formatSize(used)}</b><span className={s.bar} style={{ marginTop: 8 }}><i style={{ width: `${used / STORAGE_LIMIT * 100}%`, background: 'linear-gradient(90deg, #93c5fd, #3b82f6)' }} /></span></div>
      <div className={s.stat}><small>Arquivos</small><b>{files.length}</b><em>em {folders.length} pastas</em></div>
      <div className={s.stat}><small>Agendados</small><b>{upcoming.length}</b></div>
      <div className={s.stat}><small>Publicados</small><b>{published.length}</b></div>
    </div>
    <div className={s.grid2}>
      <div className={s.card}><div className={s.cardHead}><h2>Próximos posts</h2><Link href="/posts" className={s.link}>Ver todos<ArrowRight size={14} /></Link></div><ul className={s.rows}>{upcoming.slice(0, 4).map(p => <PostRow key={p.id} post={p} />)}{!upcoming.length && <li className={s.empty}>Nada agendado.</li>}</ul></div>
      <div className={s.card}><div className={s.cardHead}><h2>Arquivos recentes</h2><Link href="/spaces" className={s.link}>Abrir spaces<ArrowRight size={14} /></Link></div><ul className={s.rows}>{recent.map(f => <li key={f.id}><Thumb file={f} className={s.miniThumb} showKind={false} /><Link href={f.folderId ? `/pastas/${f.folderId}` : `/spaces/${f.spaceId}`} className={s.rowText}><b>{f.name}</b><small>{folderLabel(drive, f.folderId) || drive.spaces.find(x => x.id === f.spaceId)?.name} · {formatSize(f.size)} · {formatDate((f.updatedAt ?? f.createdAt).slice(0, 10))}</small></Link></li>)}</ul></div>
    </div>
    <div className={s.card} style={{ marginTop: 18 }}><div className={s.cardHead}><h2>Publicados recentemente</h2></div><ul className={s.rows}>{published.slice(0, 5).map(p => <PostRow key={p.id} post={p} />)}</ul></div>
  </section>
}
