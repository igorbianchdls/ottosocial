'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Activity, ArrowLeft, ChevronsRight, FolderClosed, FolderPlus, MoreHorizontal, MoreVertical, Pin, Plus, Search, Settings2, Share2, SlidersHorizontal } from 'lucide-react'
import { files, folderFiles, folderSize, folders, formatDate, formatSize, projects, tagTone } from '@/lib/data'
import s from './ui.module.css'

export function ProjectView({ projectId }: { projectId: string }) {
  const project = projects.find(p => p.id === projectId) ?? projects[0]
  const list = folders.filter(f => f.projectId === project.id)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(list[1]?.id ?? list[0]?.id)
  const visible = list.filter(f => f.name.toLowerCase().includes(q.trim().toLowerCase()))
  const folder = list.find(f => f.id === selected)
  const projectFiles = files.filter(f => list.some(x => x.id === f.folderId))
  const videos = projectFiles.filter(f => f.kind === 'video').reduce((v, f) => v + f.size, 0)
  const images = projectFiles.filter(f => f.kind !== 'video').reduce((v, f) => v + f.size, 0)
  const peak = Math.max(videos, images, 1)
  return <>
    <section className={s.content}>
      <div className={s.topRow}>
        <Link href="/" className={s.iconBtn} aria-label="Voltar"><ArrowLeft size={18} /></Link>
        <nav className={s.crumbs} aria-label="Caminho"><Link href="/projetos/otto"><FolderClosed size={16} />Projetos</Link><span>›</span><span>{project.name}</span></nav>
        <div className={s.topActions}><button className={s.ghost}><Settings2 size={16} />Gerenciar</button><button className={s.ghost}><Share2 size={16} />Compartilhar</button><button className={s.iconBtn} aria-label="Mais opções"><MoreHorizontal size={18} /></button></div>
      </div>
      <div className={s.pageHead}><h1>{project.name}</h1><Link href="/postar" className={s.primary}><Plus size={16} />Novo post</Link></div>
      <div className={s.toolbar}>
        <label className={s.search}><Search size={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar" aria-label="Buscar pastas" /></label>
        <div className={s.toolbarEnd}><button className={s.secondary}><SlidersHorizontal size={15} />Filtro</button></div>
      </div>
      <div className={s.folderGrid}>
        {visible.map(f => {
          const count = folderFiles(f.id).length, on = f.id === selected
          return <Link key={f.id} href={`/pastas/${f.id}`} className={`${s.folderCard} ${on ? s.folderActive : ''}`} onMouseEnter={() => setSelected(f.id)} onFocus={() => setSelected(f.id)}>
            <span className={s.paper}>{on && <span className={s.paperText}>{f.description}</span>}</span><span className={s.paper} />
            <span className={s.folderFront} />
            <span className={s.folderText}><b>{f.name}</b><small>{count} {count === 1 ? 'arquivo' : 'arquivos'}</small><em>{formatSize(folderSize(f.id))}</em></span>
          </Link>
        })}
        <button className={s.newFolder}><FolderPlus size={24} strokeWidth={1.6} />Nova pasta</button>
      </div>
      {!visible.length && <p className={s.empty}>Nenhuma pasta com esse nome.</p>}
    </section>
    <aside className={s.info} aria-label="Informações">
      <div className={s.infoHead}><h2>Info</h2><button className={s.iconBtn} aria-label="Fechar painel"><ChevronsRight size={18} /></button></div>
      <div className={s.statCard}><small>Vídeos</small><b>{formatSize(videos)}</b><span className={s.bar}><i style={{ width: `${Math.max(4, videos / peak * 70)}%`, background: 'linear-gradient(90deg, #93c5fd, #3b82f6)' }} /></span><button className={s.iconBtn} aria-label="Opções"><MoreVertical size={16} /></button></div>
      <div className={s.statCard}><small>Imagens e textos</small><b>{formatSize(images)}</b><span className={s.bar}><i style={{ width: `${Math.max(4, images / peak * 70)}%`, background: 'linear-gradient(90deg, #fca5a5, #e5484d)' }} /></span><button className={s.iconBtn} aria-label="Opções"><MoreVertical size={16} /></button></div>
      {folder && <>
        <section className={s.infoSection}><h3>Propriedades</h3><div className={s.props}>
          <div>Pasta<b>{folder.name}</b></div>
          <div>Tamanho<b>{formatSize(folderSize(folder.id))}</b></div>
          <div>Arquivos<b>{folderFiles(folder.id).length}</b></div>
          <div>Criada em<b>{formatDate(folder.createdAt)}</b></div>
          <div>Última alteração<b>{formatDate(folder.updatedAt)}</b></div>
        </div></section>
        {folder.tags.length > 0 && <section className={s.infoSection}><h3>Tags</h3><div className={s.tags}>{folder.tags.map(t => <span key={t} className={`${s.tag} ${s[`tag_${tagTone[t] ?? 'gray'}`] ?? ''}`}><i />{t}</span>)}</div></section>}
      </>}
      <div className={s.infoLinks}><button className={s.navItem}><Pin size={17} />Itens fixados</button><button className={s.navItem}><Activity size={17} />Atividade</button></div>
    </aside>
  </>
}
