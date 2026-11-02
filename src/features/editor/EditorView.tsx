'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, CloudCheck, Download } from 'lucide-react'
import type { PlayerRef } from '@remotion/player'
import { Preview } from './preview/Preview'
import { Timeline } from './timeline/Timeline'
import { LeftPanel, type ChatMessage } from './panels/LeftPanel'
import { Properties } from './panels/Properties'
import { runCommand } from './ai/commands'
import { defaultBox, fullBox, media, type MediaItem } from './project/data'
import { addClip, duplicateClip, findClip, projectDuration, removeClip, splitAt } from './project/ops'
import { createFrameStore, useEditor } from './project/useEditor'
import { FPS, type ClipProps, type Project, type TrackKind } from './project/types'
import e from './editor.module.css'

export function EditorView({ initial }: { initial: Project }) {
  const { project, apply, transient, commit, undo, redo, canUndo, canRedo } = useEditor(initial)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [toast, setToast] = useState('')
  const playerRef = useRef<PlayerRef>(null)
  const frames = useMemo(() => createFrameStore(), [])
  const duration = projectDuration(project)

  const seek = useCallback((f: number) => {
    const frame = Math.max(0, Math.min(duration - 1, Math.round(f)))
    frames.set(frame)
    playerRef.current?.seekTo(frame)
  }, [duration, frames])
  const toggle = useCallback(() => playerRef.current?.toggle(), [])

  const addMedia = useCallback((m: MediaItem, frame = frames.get(), trackId?: string) => {
    const kind: TrackKind = m.kind
    const seconds = m.kind === 'imagem' ? 3 : Math.min(m.duration ?? 5, m.kind === 'audio' ? 30 : 10)
    const props: ClipProps = m.kind === 'audio' ? { fileId: m.id, volume: m.id === 'a-narr' ? 1 : 0.4 } : { fileId: m.id, box: m.kind === 'video' ? fullBox : defaultBox.imagem, opacity: 1, volume: 1 }
    const r = addClip(project, kind, { start: frame, duration: Math.round(seconds * FPS), trimStart: 0, props }, trackId)
    apply(() => r.project)
    setSelectedId(r.id)
  }, [apply, frames, project])

  const addPreset = useCallback((kind: TrackKind, props: ClipProps, seconds: number) => {
    const r = addClip(project, kind, { start: frames.get(), duration: seconds * FPS, trimStart: 0, props })
    apply(() => r.project)
    setSelectedId(r.id)
  }, [apply, frames, project])

  const split = useCallback(() => {
    if (!selectedId) return
    const r = splitAt(project, selectedId, frames.get())
    if (!r) return setToast('Posicione a agulha dentro do clipe para dividir.')
    apply(() => r.project)
    setSelectedId(r.id)
  }, [apply, frames, project, selectedId])
  const remove = useCallback(() => { if (selectedId) { apply(p => removeClip(p, selectedId)); setSelectedId(null) } }, [apply, selectedId])
  const duplicate = useCallback(() => {
    if (!selectedId) return
    const r = duplicateClip(project, selectedId)
    if (!r) return
    apply(() => r.project)
    setSelectedId(r.id)
  }, [apply, project, selectedId])

  const ask = (text: string) => {
    const r = runCommand(project, text, frames.get())
    if (r.project) { const next = r.project; apply(() => next) }
    setChat(c => [...c, { from: 'voce', text }, { from: 'ia', text: r.reply }])
  }

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return
      const mod = ev.ctrlKey || ev.metaKey
      if (ev.key === ' ') { ev.preventDefault(); toggle() }
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') { ev.preventDefault(); seek(frames.get() + (ev.key === 'ArrowLeft' ? -1 : 1) * (ev.shiftKey ? FPS : 1)) }
      else if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); if (ev.shiftKey) redo(); else undo() }
      else if (mod && ev.key.toLowerCase() === 'y') { ev.preventDefault(); redo() }
      else if (mod && ev.key.toLowerCase() === 'd') { ev.preventDefault(); duplicate() }
      else if (!mod && ev.key.toLowerCase() === 's') split()
      else if (ev.key === 'Delete' || ev.key === 'Backspace') remove()
      else if (ev.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, seek, frames, undo, redo, duplicate, split, remove])

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t) }, [toast])

  const selected = findClip(project, selectedId) ? selectedId : null
  return <div className={e.editor}>
    <header className={e.top}>
      <Link href="/editor" className={e.back} aria-label="Voltar aos projetos"><ArrowLeft size={18} /></Link>
      <input className={e.name} value={project.name} onChange={ev => apply(p => ({ ...p, name: ev.target.value }), 'name')} aria-label="Nome do projeto" />
      <span className={e.saved}><CloudCheck size={15} />Salvo neste navegador</span>
      <span className={e.grow} />
      <span className={e.format}>{project.format}</span>
      <button className={e.export} onClick={() => setToast('A exportação para MP4 entra na próxima fase (Remotion Lambda). O vídeo vai direto para o seu Space.')}><Download size={16} />Exportar</button>
    </header>
    <div className={e.body}>
      <LeftPanel onAddMedia={m => addMedia(m)} onAddPreset={addPreset} chat={chat} onAsk={ask} />
      <Preview project={project} playerRef={playerRef} frames={frames} selectedId={selected} onSelect={setSelectedId} transient={transient} commit={commit} onPlaying={setPlaying} />
      <Properties project={project} selectedId={selected} apply={apply} onDuplicate={duplicate} onSplit={split} onDelete={remove} />
    </div>
    <Timeline project={project} frames={frames} duration={duration} selectedId={selected} playing={playing} onSelect={setSelectedId} seek={seek} toggle={toggle}
      apply={apply} transient={transient} commit={commit} onSplit={split} onDelete={remove} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
      onDropMedia={(id, frame, trackId) => { const m = media(id); if (m) addMedia(m, frame, trackId) }} />
    {toast && <div className={e.toast} role="status"><Check size={15} />{toast}</div>}
  </div>
}
