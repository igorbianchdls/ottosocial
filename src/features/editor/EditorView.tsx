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
import { addClip, clipEnd, duplicateClip, projectDuration, removeClips, rippleDelete, splitAt } from './project/ops'
import { copyClips, pasteClips, type ClipboardItem } from './project/clipboard'
import { createFrameStore, useEditor } from './project/useEditor'
import { FPS, type ClipProps, type Project, type TrackKind } from './project/types'
import e from './editor.module.css'

export function EditorView({ initial }: { initial: Project }) {
  const { project, apply, transient, commit, undo, redo, canUndo, canRedo } = useEditor(initial)
  const [selection, setSelection] = useState<string[]>([])
  const clipboard = useRef<ClipboardItem[]>([])
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
    setSelection([r.id])
  }, [apply, frames, project])

  const addPreset = useCallback((kind: TrackKind, props: ClipProps, seconds: number) => {
    const r = addClip(project, kind, { start: frames.get(), duration: seconds * FPS, trimStart: 0, props })
    apply(() => r.project)
    setSelection([r.id])
  }, [apply, frames, project])

  // Ids that still exist (undo can remove a selected clip).
  const allIds = useMemo(() => new Set(project.tracks.flatMap(t => t.clips.map(c => c.id))), [project])
  const selected = useMemo(() => selection.filter(id => allIds.has(id)), [selection, allIds])
  const select = useCallback((id: string | null, toggleIt = false) => {
    if (!id) return setSelection([])
    setSelection(s => toggleIt ? (s.includes(id) ? s.filter(x => x !== id) : [...s, id]) : [id])
  }, [])

  const split = useCallback(() => {
    if (selected.length !== 1) return
    const r = splitAt(project, selected[0], frames.get())
    if (!r) return setToast('Posicione a agulha dentro do clipe para dividir.')
    apply(() => r.project)
    setSelection([r.id])
  }, [apply, frames, project, selected])
  const remove = useCallback(() => { if (selected.length) { apply(p => removeClips(p, selected)); setSelection([]) } }, [apply, selected])
  const ripple = useCallback(() => { if (selected.length) { apply(p => rippleDelete(p, selected)); setSelection([]) } }, [apply, selected])
  const copy = useCallback(() => {
    if (!selected.length) return
    clipboard.current = copyClips(project, selected)
    setToast(`${selected.length} ${selected.length === 1 ? 'clipe copiado' : 'clipes copiados'}. Ctrl+V cola na agulha.`)
  }, [project, selected])
  const paste = useCallback(() => {
    if (!clipboard.current.length) return
    const r = pasteClips(project, clipboard.current, frames.get())
    apply(() => r.project)
    setSelection(r.ids)
  }, [apply, frames, project])
  const duplicate = useCallback(() => {
    if (selected.length === 1) {
      const r = duplicateClip(project, selected[0])
      if (r) { apply(() => r.project); setSelection([r.id]) }
    } else if (selected.length > 1) {
      const items = copyClips(project, selected)
      const r = pasteClips(project, items, Math.max(...items.map(i => clipEnd(i.clip))))
      apply(() => r.project)
      setSelection(r.ids)
    }
  }, [apply, project, selected])

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
      else if (mod && ev.key.toLowerCase() === 'c') copy()
      else if (mod && ev.key.toLowerCase() === 'x') { copy(); remove() }
      else if (mod && ev.key.toLowerCase() === 'v') { ev.preventDefault(); paste() }
      else if (mod && ev.key.toLowerCase() === 'a') { ev.preventDefault(); setSelection([...allIds]) }
      else if (!mod && ev.key.toLowerCase() === 's') split()
      else if (ev.key === 'Delete' || ev.key === 'Backspace') { if (ev.shiftKey) ripple(); else remove() }
      else if (ev.key === 'Escape') setSelection([])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, seek, frames, undo, redo, duplicate, split, remove, ripple, copy, paste, allIds])

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t) }, [toast])

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
      <Preview project={project} playerRef={playerRef} frames={frames} selectedId={selected.length === 1 ? selected[0] : null} onSelect={id => select(id)} transient={transient} commit={commit} onPlaying={setPlaying} />
      <Properties project={project} selectedIds={selected} frames={frames} apply={apply} seek={seek} onDuplicate={duplicate} onSplit={split} onDelete={remove} onRipple={ripple} onCopy={copy} />
    </div>
    <Timeline project={project} frames={frames} duration={duration} selectedIds={selected} playing={playing} onSelect={select} seek={seek} toggle={toggle}
      apply={apply} transient={transient} commit={commit} onSplit={split} onDelete={remove} onRipple={ripple} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
      onDropMedia={(id, frame, trackId) => { const m = media(id); if (m) addMedia(m, frame, trackId) }} />
    {toast && <div className={e.toast} role="status"><Check size={15} />{toast}</div>}
  </div>
}
