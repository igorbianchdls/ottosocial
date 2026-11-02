'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronsRight, FolderOpen, FolderPlus, MoreVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { formatDate, formatSize } from '@/lib/format'
import { STORAGE_LIMIT } from './data'
import { createSpace, deleteSpace, liveFiles, renameSpace, spaceStats } from './store'
import { useDrive } from './hooks'
import { Thumb } from './Thumb'
import { ContextMenu, NameDialog, type MenuState } from './drive/ui'
import s from '@/components/ui.module.css'
import d from './drive/drive.module.css'

export function SpacesView() {
  const router = useRouter()
  const drive = useDrive()
  const [q, setQ] = useState('')
  const [hover, setHover] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuState>(null)
  const [naming, setNaming] = useState<{ id?: string; name: string } | null>(null)
  const [toast, setToast] = useState('')
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2800); return () => clearTimeout(t) }, [toast])
  const visible = drive.spaces.filter(sp => sp.name.toLowerCase().includes(q.trim().toLowerCase()))
  const files = liveFiles(drive)
  const used = files.reduce((v, f) => v + f.size, 0)
  const sum = (kind: string) => files.filter(f => f.kind === kind).reduce((v, f) => v + f.size, 0)
  const byKind = [
    { label: 'Vídeos', value: sum('video'), color: 'linear-gradient(90deg, #93c5fd, #3b82f6)' },
    { label: 'Imagens', value: sum('image'), color: 'linear-gradient(90deg, #fca5a5, #e5484d)' },
    { label: 'Áudios', value: sum('audio'), color: 'linear-gradient(90deg, #86efac, #16a34a)' },
    { label: 'Textos', value: sum('text'), color: 'linear-gradient(90deg, #fcd34d, #e3a12f)' },
  ]
  const sel = drive.spaces.find(sp => sp.id === hover) ?? drive.spaces[0]
  const recent = [...files].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)).slice(0, 5)
  const spaceMenu = (ev: React.MouseEvent, id: string) => {
    ev.preventDefault(); ev.stopPropagation()
    const sp = drive.spaces.find(x => x.id === id)!
    setMenu({ x: ev.clientX, y: ev.clientY, items: [
      { label: 'Abrir', icon: FolderOpen, onClick: () => router.push(`/spaces/${id}`) },
      { label: 'Renomear', icon: Pencil, onClick: () => setNaming({ id, name: sp.name }) },
      { label: '', divider: true },
      { label: 'Excluir space', icon: Trash2, danger: true, onClick: () => setToast(deleteSpace(id) ? 'Space excluído.' : 'Só dá para excluir um space vazio. Mova ou apague as pastas antes.') },
    ] })
  }
  return <>
    <section className={s.content} onContextMenu={ev => { if (!(ev.target as HTMLElement).closest('a, button')) { ev.preventDefault(); setMenu({ x: ev.clientX, y: ev.clientY, items: [{ label: 'Novo space', icon: FolderPlus, onClick: () => setNaming({ name: 'Novo space' }) }] }) } }}>
      <div className={s.pageHead}><div><h1>Spaces</h1><p>Cada space guarda as pastas e os arquivos de uma marca ou projeto.</p></div><button className={s.primary} onClick={() => setNaming({ name: 'Novo space' })}><Plus size={16} />Novo space</button></div>
      <div className={s.toolbar}><label className={s.search}><Search size={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar space" aria-label="Buscar space" /></label></div>
      <div className={s.folderGrid}>
        {visible.map(sp => {
          const st = spaceStats(drive, sp.id), on = sp.id === sel?.id
          return <Link key={sp.id} href={`/spaces/${sp.id}`} className={`${s.folderCard} ${on ? s.folderActive : ''}`} onMouseEnter={() => setHover(sp.id)} onFocus={() => setHover(sp.id)} onContextMenu={ev => spaceMenu(ev, sp.id)}>
            <span className={s.paper} /><span className={s.paper} /><span className={s.folderFront} />
            <button className={d.cardMore} onClick={ev => { ev.preventDefault(); spaceMenu(ev, sp.id) }} aria-label="Mais ações"><MoreVertical size={16} /></button>
            <span className={s.folderText}><b>{sp.name}</b><small>{st.folders} {st.folders === 1 ? 'pasta' : 'pastas'} · {st.files} arquivos</small><em>{formatSize(st.size)}</em></span>
          </Link>
        })}
        <button className={s.newFolder} onClick={() => setNaming({ name: 'Novo space' })}><FolderPlus size={24} strokeWidth={1.6} />Novo space</button>
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
      {sel && <section className={s.infoSection}><h3>{sel.name}</h3><div className={s.props}>
        <div>Pastas<b>{spaceStats(drive, sel.id).folders}</b></div>
        <div>Arquivos<b>{spaceStats(drive, sel.id).files}</b></div>
        <div>Tamanho<b>{formatSize(spaceStats(drive, sel.id).size)}</b></div>
      </div></section>}
      <section className={s.infoSection}><h3>Recentes</h3><ul className={s.rows}>{recent.map(f => <li key={f.id}><Thumb file={f} className={s.miniThumb} showKind={false} /><Link href={f.folderId ? `/pastas/${f.folderId}` : `/spaces/${f.spaceId}`} className={s.rowText}><b>{f.name}</b><small>{formatDate((f.updatedAt ?? f.createdAt).slice(0, 10))} · {formatSize(f.size)}</small></Link></li>)}</ul></section>
    </aside>
    <ContextMenu menu={menu} onClose={() => setMenu(null)} />
    {naming && <NameDialog title={naming.id ? 'Renomear space' : 'Novo space'} initial={naming.name} confirm={naming.id ? 'Salvar' : 'Criar'} onClose={() => setNaming(null)}
      onSubmit={name => { if (naming.id) renameSpace(naming.id, name); else router.push(`/spaces/${createSpace(name)}`) }} />}
    {toast && <div className={d.toast} role="status">{toast}</div>}
  </>
}
