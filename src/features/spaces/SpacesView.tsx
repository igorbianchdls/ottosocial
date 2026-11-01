'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronsRight, FolderPlus, Plus, Search } from 'lucide-react'
import { formatDate, formatSize } from '@/lib/format'
import { STORAGE_LIMIT, files, folders, spaces } from './data'
import { Thumb } from './Thumb'
import s from '@/components/ui.module.css'

const spaceFolders = (id: string) => folders.filter(f => f.spaceId === id)
const spaceFiles = (id: string) => files.filter(f => spaceFolders(id).some(x => x.id === f.folderId))
const sum = (list: typeof files) => list.reduce((v, f) => v + f.size, 0)

export function SpacesView() {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(spaces[0].id)
  const visible = spaces.filter(sp => sp.name.toLowerCase().includes(q.trim().toLowerCase()))
  const used = sum(files)
  const byKind = [
    { label: 'Vídeos', value: sum(files.filter(f => f.kind === 'video')), color: 'linear-gradient(90deg, #93c5fd, #3b82f6)' },
    { label: 'Imagens', value: sum(files.filter(f => f.kind === 'image')), color: 'linear-gradient(90deg, #fca5a5, #e5484d)' },
    { label: 'Textos', value: sum(files.filter(f => f.kind === 'text')), color: 'linear-gradient(90deg, #fcd34d, #e3a12f)' },
  ]
  const sel = spaces.find(sp => sp.id === selected)!
  const recent = [...files].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)).slice(0, 5)
  return <>
    <section className={s.content}>
      <div className={s.pageHead}><div><h1>Spaces</h1><p>Cada space guarda as pastas e os arquivos de uma marca ou projeto.</p></div><button className={s.primary}><Plus size={16} />Novo space</button></div>
      <div className={s.toolbar}><label className={s.search}><Search size={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar space" aria-label="Buscar space" /></label></div>
      <div className={s.folderGrid}>
        {visible.map(sp => {
          const n = spaceFolders(sp.id).length, on = sp.id === selected
          return <Link key={sp.id} href={`/spaces/${sp.id}`} className={`${s.folderCard} ${on ? s.folderActive : ''}`} onMouseEnter={() => setSelected(sp.id)} onFocus={() => setSelected(sp.id)}>
            <span className={s.paper} /><span className={s.paper} /><span className={s.folderFront} />
            <span className={s.folderText}><b>{sp.name}</b><small>{n} {n === 1 ? 'pasta' : 'pastas'} · {spaceFiles(sp.id).length} arquivos</small><em>{formatSize(sum(spaceFiles(sp.id)))}</em></span>
          </Link>
        })}
        <button className={s.newFolder}><FolderPlus size={24} strokeWidth={1.6} />Novo space</button>
      </div>
      {!visible.length && <p className={s.empty}>Nenhum space com esse nome.</p>}
    </section>
    <aside className={s.info} aria-label="Informações">
      <div className={s.infoHead}><h2>Armazenamento</h2><button className={s.iconBtn} aria-label="Fechar painel"><ChevronsRight size={18} /></button></div>
      <div className={s.statCard}><small>Usado</small><b>{formatSize(used)} <span className={s.muted} style={{ fontSize: 14, fontWeight: 500 }}>de {formatSize(STORAGE_LIMIT)}</span></b><span className={s.bar}><i style={{ width: `${Math.max(2, used / STORAGE_LIMIT * 100)}%`, background: 'linear-gradient(90deg, #93c5fd, #3b82f6)' }} /></span></div>
      <section className={s.infoSection}><h3>Por tipo</h3><div className={s.props}>{byKind.map(k => <div key={k.label} style={{ flexDirection: 'column', gap: 6 }}>
        <span style={{ display: 'flex', justifyContent: 'space-between' }}>{k.label}<b>{formatSize(k.value)}</b></span>
        <span className={s.bar}><i style={{ width: `${Math.max(2, k.value / Math.max(used, 1) * 100)}%`, background: k.color }} /></span>
      </div>)}</div></section>
      <section className={s.infoSection}><h3>{sel.name}</h3><div className={s.props}>
        <div>Pastas<b>{spaceFolders(sel.id).length}</b></div>
        <div>Arquivos<b>{spaceFiles(sel.id).length}</b></div>
        <div>Tamanho<b>{formatSize(sum(spaceFiles(sel.id)))}</b></div>
      </div></section>
      <section className={s.infoSection}><h3>Recentes</h3><ul className={s.rows}>{recent.map(f => <li key={f.id}><Thumb file={f} className={s.miniThumb} showKind={false} /><Link href={`/pastas/${f.folderId}`} className={s.rowText}><b>{f.name}</b><small>{formatDate(f.createdAt)} · {formatSize(f.size)}</small></Link></li>)}</ul></section>
    </aside>
  </>
}
