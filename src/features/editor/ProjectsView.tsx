'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Thumbnail } from '@remotion/player'
import { Plus } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { EditorComposition } from './remotion/Composition'
import { sampleProjects } from './project/data'
import { projectDuration } from './project/ops'
import { readSaved } from './project/useEditor'
import { FPS, canvasSize, type Project } from './project/types'
import { timecode } from './timeline/Timeline'
import s from '@/components/ui.module.css'
import e from './editor.module.css'

export function ProjectsView() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>(sampleProjects)
  useEffect(() => {
    const saved = readSaved()
    const merged = [...Object.values(saved).filter(p => !sampleProjects.some(x => x.id === p.id)), ...sampleProjects.map(p => saved[p.id] ?? p)]
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjects(merged.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
  }, [])
  const create = () => router.push(`/editor/p-${Date.now().toString(36)}`)
  return <section className={s.content}>
    <div className={s.pageHead}><div><h1>Editor</h1><p>Monte vídeos com linha do tempo e peça edições para a IA.</p></div><button className={s.primary} onClick={create}><Plus size={16} />Novo projeto</button></div>
    <div className={e.projectGrid}>
      <button className={e.newProject} onClick={create}><Plus size={22} />Novo projeto</button>
      {projects.map(p => {
        const { width, height } = canvasSize[p.format]
        const d = projectDuration(p)
        return <Link key={p.id} href={`/editor/${p.id}`} className={e.projectCard}>
          <span className={e.projectThumb}>
            <Thumbnail component={EditorComposition} inputProps={{ project: p }} compositionWidth={width} compositionHeight={height} durationInFrames={d} fps={FPS} frameToDisplay={Math.min(d - 1, Math.round(FPS * 1.5))} style={{ width: '100%', height: '100%' }} />
            <i>{timecode(d).slice(0, 5)}</i>
          </span>
          <b>{p.name}</b>
          <small>{p.format} · editado em {formatDateTime(p.updatedAt)}</small>
        </Link>
      })}
    </div>
  </section>
}
