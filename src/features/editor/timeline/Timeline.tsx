'use client'

import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, Film, Image as ImageIcon, Magnet, Music, Pause, Play, Redo2, Scissors, Shapes, SkipBack, SkipForward, Captions, Trash2, Type, Undo2, Volume2, VolumeX, ZoomIn, ZoomOut } from 'lucide-react'
import { media } from '../project/data'
import { clipEnd, findClip, moveClip, settle, trimLeft, trimRight, updateTrack } from '../project/ops'
import { useFrame, type FrameStore } from '../project/useEditor'
import { FPS, kindLabel, type Clip, type Project, type Track, type TrackKind } from '../project/types'
import e from '../editor.module.css'

export const MEDIA_MIME = 'application/x-ottosocial-media'
const HEAD = 132
const SNAP_PX = 8

export const kindIcon: Record<TrackKind, typeof Film> = { texto: Type, legenda: Captions, forma: Shapes, imagem: ImageIcon, video: Film, audio: Music }

export function timecode(frame: number) {
  const sec = Math.floor(frame / FPS)
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}.${String(frame % FPS).padStart(2, '0')}`
}

type Props = {
  project: Project; frames: FrameStore; duration: number; selectedId: string | null; playing: boolean
  onSelect: (id: string | null) => void; seek: (frame: number) => void; toggle: () => void
  apply: (fn: (p: Project) => Project) => void; transient: (p: Project) => void; commit: (before: Project) => void
  onSplit: () => void; onDelete: () => void; undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean
  onDropMedia: (mediaId: string, frame: number, trackId?: string) => void
}

export function Timeline(props: Props) {
  const { project, frames, duration, selectedId, playing, onSelect, seek, toggle, apply, transient, commit } = props
  const [pps, setPps] = useState(60)
  const [snap, setSnap] = useState(true)
  const [guide, setGuide] = useState<number | null>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const ppf = pps / FPS
  const width = (duration + 10 * FPS) * ppf

  const frameAt = (clientX: number, el: Element) => Math.max(0, Math.round((clientX - el.getBoundingClientRect().left) / ppf))

  const scrub = (ev: React.PointerEvent<HTMLDivElement>) => {
    const el = ev.currentTarget
    el.setPointerCapture(ev.pointerId)
    seek(frameAt(ev.clientX, el))
    const move = (m: PointerEvent) => seek(frameAt(m.clientX, el))
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up) }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }

  /** Drag a clip body (move, also to another track of the same kind) or one of its edges (trim). */
  const dragClip = (ev: React.PointerEvent, clip: Clip, mode: 'move' | 'left' | 'right') => {
    ev.stopPropagation()
    if (ev.button !== 0) return
    onSelect(clip.id)
    const before = project, x0 = ev.clientX
    const el = ev.currentTarget as HTMLElement
    el.setPointerCapture(ev.pointerId)
    const points = snap ? [0, frames.get(), ...project.tracks.flatMap(t => t.clips.filter(c => c.id !== clip.id).flatMap(c => [c.start, clipEnd(c)]))] : []
    const snapTo = (f: number) => {
      let best: number | null = null
      for (const p of points) if (Math.abs(p - f) * ppf <= SNAP_PX && (best === null || Math.abs(p - f) < Math.abs(best - f))) best = p
      return best
    }
    let moved = false, last = before
    const show = (p: Project) => { last = p; transient(p) }
    const move = (m: PointerEvent) => {
      const df = Math.round((m.clientX - x0) / ppf)
      if (!moved && Math.abs(m.clientX - x0) < 3) return
      moved = true
      if (mode === 'move') {
        let start = clip.start + df, g: number | null = null
        const s1 = snapTo(start), s2 = snapTo(start + clip.duration)
        if (s1 !== null && (s2 === null || Math.abs(s1 - start) <= Math.abs(s2 - start - clip.duration))) { start = s1; g = s1 }
        else if (s2 !== null) { start = s2 - clip.duration; g = s2 }
        const lane = document.elementsFromPoint(m.clientX, m.clientY).find(x => (x as HTMLElement).dataset?.trackId) as HTMLElement | undefined
        show(moveClip(before, clip.id, start, lane?.dataset.trackId))
        setGuide(g)
      } else {
        const edge = (mode === 'left' ? clip.start : clipEnd(clip)) + df
        const s = snapTo(edge)
        show(mode === 'left' ? trimLeft(before, clip.id, s ?? edge) : trimRight(before, clip.id, s ?? edge))
        setGuide(s)
      }
    }
    const up = () => {
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up)
      setGuide(null)
      if (!moved) return
      transient(settle(last, clip.id))
      commit(before)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  const drop = (ev: React.DragEvent<HTMLDivElement>, trackId?: string) => {
    const id = ev.dataTransfer.getData(MEDIA_MIME)
    if (!id) return
    ev.preventDefault()
    props.onDropMedia(id, frameAt(ev.clientX, ev.currentTarget), trackId)
  }
  const allowDrop = (ev: React.DragEvent) => { if (ev.dataTransfer.types.includes(MEDIA_MIME)) ev.preventDefault() }

  const counts: Partial<Record<TrackKind, number>> = {}
  const selected = findClip(project, selectedId)
  return <div className={e.timeline}>
    <div className={e.tlBar}>
      <button className={e.tool} onClick={() => seek(0)} aria-label="Voltar ao início"><SkipBack size={16} /></button>
      <button className={`${e.tool} ${e.play}`} onClick={toggle} aria-label={playing ? 'Pausar' : 'Tocar'}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
      <button className={e.tool} onClick={() => seek(duration - 1)} aria-label="Ir para o fim"><SkipForward size={16} /></button>
      <TimeDisplay frames={frames} duration={duration} />
      <span className={e.sep} />
      <button className={e.tool} onClick={props.onSplit} disabled={!selected} title="Dividir na agulha (S)"><Scissors size={16} />Dividir</button>
      <button className={e.tool} onClick={props.onDelete} disabled={!selected} title="Excluir (Delete)"><Trash2 size={16} /></button>
      <button className={e.tool} onClick={props.undo} disabled={!props.canUndo} title="Desfazer (Ctrl+Z)"><Undo2 size={16} /></button>
      <button className={e.tool} onClick={props.redo} disabled={!props.canRedo} title="Refazer (Ctrl+Shift+Z)"><Redo2 size={16} /></button>
      <span className={e.grow} />
      <button className={`${e.tool} ${snap ? e.toolOn : ''}`} onClick={() => setSnap(!snap)} aria-pressed={snap} title="Ímã: gruda nos cortes e na agulha"><Magnet size={16} /></button>
      <span className={e.zoom}><ZoomOut size={15} /><input type="range" min={15} max={300} value={pps} onChange={ev => setPps(+ev.target.value)} aria-label="Zoom da linha do tempo" /><ZoomIn size={15} /></span>
    </div>
    <div className={e.tlScroll} ref={scroll}>
      <div className={e.tlInner} style={{ width: HEAD + width }}>
        <div className={e.rulerRow}>
          <div className={e.corner} />
          <div className={e.ruler} onPointerDown={scrub}><Ruler pps={pps} width={width} /></div>
        </div>
        {project.tracks.map((t: Track) => {
          const Icon = kindIcon[t.kind]
          counts[t.kind] = (counts[t.kind] ?? 0) + 1
          const sound = t.kind === 'video' || t.kind === 'audio'
          return <div key={t.id} className={e.row}>
            <div className={e.head}>
              <Icon size={15} /><span>{kindLabel[t.kind]} {counts[t.kind]}</span>
              {sound ? <button className={e.mini} onClick={() => apply(p => updateTrack(p, t.id, { muted: !t.muted }))} aria-label={t.muted ? 'Ativar som' : 'Silenciar'}>{t.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}</button>
                : <button className={e.mini} onClick={() => apply(p => updateTrack(p, t.id, { hidden: !t.hidden }))} aria-label={t.hidden ? 'Mostrar faixa' : 'Ocultar faixa'}>{t.hidden ? <EyeOff size={14} /> : <Eye size={14} />}</button>}
            </div>
            <div className={`${e.lane} ${t.hidden || t.muted ? e.laneOff : ''}`} data-track-id={t.id} onPointerDown={ev => { if (ev.target === ev.currentTarget) { onSelect(null); seek(frameAt(ev.clientX, ev.currentTarget)) } }} onDragOver={allowDrop} onDrop={ev => drop(ev, t.id)}>
              {t.clips.map(c => <ClipView key={c.id} clip={c} kind={t.kind} ppf={ppf} on={c.id === selectedId} onDrag={dragClip} />)}
            </div>
          </div>
        })}
        <div className={e.row}>
          <div className={e.head} />
          <div className={`${e.lane} ${e.dropLane}`} onDragOver={allowDrop} onDrop={ev => drop(ev)}>
            {project.tracks.length ? 'Solte aqui para criar uma faixa nova' : 'Arraste vídeos, imagens ou áudios da esquerda para começar'}
          </div>
        </div>
        {guide !== null && <span className={e.guide} style={{ left: HEAD + guide * ppf }} />}
        <Playhead frames={frames} ppf={ppf} scroll={scroll} playing={playing} />
      </div>
    </div>
  </div>
}

function TimeDisplay({ frames, duration }: { frames: FrameStore; duration: number }) {
  const frame = useFrame(frames)
  return <span className={e.time}><b>{timecode(frame)}</b> / {timecode(duration)}</span>
}

function Playhead({ frames, ppf, scroll, playing }: { frames: FrameStore; ppf: number; scroll: React.RefObject<HTMLDivElement | null>; playing: boolean }) {
  const frame = useFrame(frames)
  const x = HEAD + frame * ppf
  useEffect(() => {
    const el = scroll.current
    if (playing && el && (x > el.scrollLeft + el.clientWidth - 40 || x < el.scrollLeft + HEAD)) el.scrollTo({ left: x - HEAD - 60 })
  }, [x, playing, scroll])
  return <span className={e.playhead} style={{ left: x }}><i /></span>
}

function Ruler({ pps, width }: { pps: number; width: number }) {
  const step = [1, 2, 5, 10, 15, 30, 60].find(s => s * pps >= 70) ?? 60
  const minor = step >= 10 ? step / 5 : step / 2
  const ticks: React.ReactNode[] = []
  for (let t = 0; t * pps <= width; t += minor) {
    const major = Math.abs(t / step - Math.round(t / step)) < 1e-6
    ticks.push(<span key={t} className={major ? e.tickMajor : e.tick} style={{ left: t * pps }}>{major && <em>{Math.floor(t / 60)}:{String(Math.round(t % 60)).padStart(2, '0')}</em>}</span>)
  }
  return <>{ticks}</>
}

const noise = (seed: string, i: number) => {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  h = Math.imul(h ^ i, 2654435761)
  return ((h >>> 0) % 1000) / 1000
}

function Waveform({ clip, ppf, width }: { clip: Clip; ppf: number; width: number }) {
  const bars = Math.max(1, Math.floor(width / 4))
  const framesPerBar = 4 / ppf
  const seed = clip.props.fileId ?? clip.id
  return <svg className={e.wave} width={width} height="100%" viewBox={`0 0 ${width} 30`} preserveAspectRatio="none" aria-hidden>
    {Array.from({ length: bars }, (_, i) => {
      const bucket = Math.floor((clip.trimStart + i * framesPerBar) / 4)
      const h = 4 + 24 * (0.35 * noise(seed, bucket) + 0.65 * Math.abs(Math.sin(bucket / 9 + noise(seed, bucket >> 3) * 3)))
      return <rect key={i} x={i * 4} y={(30 - h) / 2} width={2} height={h} rx={1} />
    })}
  </svg>
}

function ClipView({ clip, kind, ppf, on, onDrag }: { clip: Clip; kind: TrackKind; ppf: number; on: boolean; onDrag: (ev: React.PointerEvent, c: Clip, mode: 'move' | 'left' | 'right') => void }) {
  const width = Math.max(4, clip.duration * ppf)
  const m = media(clip.props.fileId)
  const label = kind === 'texto' || kind === 'legenda' ? clip.props.text : kind === 'forma' ? (clip.props.shape === 'circulo' ? 'Círculo' : 'Retângulo') : m?.name
  const Icon = kindIcon[kind]
  return <div className={`${e.clip} ${e[`clip_${kind}`]} ${kind === 'video' || kind === 'imagem' ? e[`tone_${m?.tone ?? 'blue'}`] : ''} ${on ? e.clipOn : ''}`}
    style={{ left: clip.start * ppf, width }} onPointerDown={ev => onDrag(ev, clip, 'move')} title={label}>
    {kind === 'audio' && <Waveform clip={clip} ppf={ppf} width={width} />}
    <span className={e.clipLabel}><Icon size={12} />{label}</span>
    <span className={`${e.edge} ${e.edgeL}`} onPointerDown={ev => onDrag(ev, clip, 'left')} />
    <span className={`${e.edge} ${e.edgeR}`} onPointerDown={ev => onDrag(ev, clip, 'right')} />
  </div>
}
