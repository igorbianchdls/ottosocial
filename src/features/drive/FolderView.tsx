'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Check, FolderClosed, LayoutGrid, List, Search, Send, Upload } from 'lucide-react'
import { formatDate, formatDuration, formatSize } from '@/lib/format'
import { folderFiles, folders, projects } from './data'
import { Thumb } from './Thumb'
import s from '@/components/ui.module.css'

export function FolderView({ folderId }: { folderId: string }) {
  const router = useRouter()
  const folder = folders.find(f => f.id === folderId) ?? folders[0]
  const project = projects.find(p => p.id === folder.projectId)!
  const [mode, setMode] = useState<'grid' | 'list'>('grid')
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const list = folderFiles(folder.id).filter(f => f.name.toLowerCase().includes(q.trim().toLowerCase()))
  const toggle = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const post = () => router.push(`/postar?arquivos=${picked.join(',')}`)
  return <section className={s.content}>
    <div className={s.topRow}>
      <Link href={`/projetos/${project.id}`} className={s.iconBtn} aria-label="Voltar"><ArrowLeft size={18} /></Link>
      <nav className={s.crumbs} aria-label="Caminho"><Link href="/projetos/otto"><FolderClosed size={16} />Projetos</Link><span>›</span><Link href={`/projetos/${project.id}`}>{project.name}</Link><span>›</span><span>{folder.name}</span></nav>
    </div>
    <div className={s.pageHead}>
      <div><h1>{folder.name}</h1><p>{folder.description}</p></div>
      <div className={s.row}>
        {picked.length > 0 && <button className={s.primary} onClick={post}><Send size={15} />Postar {picked.length} {picked.length === 1 ? 'arquivo' : 'arquivos'}</button>}
        <button className={s.secondary}><Upload size={15} />Enviar arquivos</button>
      </div>
    </div>
    <div className={s.dropzone}><Upload size={18} /><span><b>Arraste arquivos aqui</b> ou clique em “Enviar arquivos”. Vídeos, imagens e textos.</span></div>
    <div className={s.toolbar}>
      <label className={s.search}><Search size={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar nesta pasta" aria-label="Buscar arquivos" /></label>
      <div className={s.toolbarEnd}><span className={s.muted}>{list.length} {list.length === 1 ? 'arquivo' : 'arquivos'}</span>
        <div className={s.segment}><button className={mode === 'grid' ? s.segOn : ''} onClick={() => setMode('grid')} aria-label="Grade" aria-pressed={mode === 'grid'}><LayoutGrid size={15} /></button><button className={mode === 'list' ? s.segOn : ''} onClick={() => setMode('list')} aria-label="Lista" aria-pressed={mode === 'list'}><List size={15} /></button></div>
      </div>
    </div>
    {mode === 'grid' ? <div className={s.fileGrid}>{list.map(f => { const on = picked.includes(f.id); return <button key={f.id} className={`${s.fileCard} ${on ? s.fileSelected : ''}`} onClick={() => toggle(f.id)} aria-pressed={on}>
      <span className={`${s.check} ${on ? s.checkOn : ''}`}>{on && <Check size={14} strokeWidth={3} />}</span>
      <Thumb file={f} />
      <span className={s.fileMeta}><b title={f.name}>{f.name}</b><small>{formatSize(f.size)}{f.duration !== undefined ? ` · ${formatDuration(f.duration)}` : ''} · {f.width}×{f.height}</small></span>
    </button> })}</div>
      : <table className={s.table}><thead><tr><th>Nome</th><th>Tipo</th><th>Dimensões</th><th>Enviado em</th><th className={s.num}>Tamanho</th></tr></thead>
        <tbody>{list.map(f => <tr key={f.id} onClick={() => toggle(f.id)} aria-selected={picked.includes(f.id)}><td><span className={s.cell}><Thumb file={f} className={s.miniThumb} showKind={false} />{f.name}{picked.includes(f.id) && <Check size={15} color="var(--blue)" />}</span></td><td>{f.kind === 'video' ? 'Vídeo' : f.kind === 'image' ? 'Imagem' : 'Texto'}</td><td>{f.width}×{f.height}</td><td>{formatDate(f.createdAt)}</td><td className={s.num}>{formatSize(f.size)}</td></tr>)}</tbody></table>}
    {!list.length && <p className={s.empty}>Nenhum arquivo encontrado.</p>}
  </section>
}
