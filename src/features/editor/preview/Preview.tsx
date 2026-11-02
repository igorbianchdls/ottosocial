'use client'

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { Player, type PlayerRef } from '@remotion/player'
import { EditorComposition } from '../remotion/Composition'
import { clipEnd, findClip, projectDuration, updateProps } from '../project/ops'
import { useFrame, type FrameStore } from '../project/useEditor'
import { FPS, canvasSize, kindLabel, type Box, type Project } from '../project/types'
import e from '../editor.module.css'

type Props = {
  project: Project; playerRef: RefObject<PlayerRef | null>; frames: FrameStore; selectedId: string | null
  onSelect: (id: string | null) => void; transient: (p: Project) => void; commit: (before: Project) => void
  onPlaying: (playing: boolean) => void
}

/** Fits a w:h box inside the element and returns its size. */
function useFit(ref: RefObject<HTMLDivElement | null>, ratio: number) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      const cs = getComputedStyle(el)
      const width = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const height = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      const w = Math.max(0, Math.min(width, height * ratio))
      setSize({ width: Math.floor(w), height: Math.floor(w / ratio) })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, ratio])
  return size
}

export function Preview({ project, playerRef, frames, selectedId, onSelect, transient, commit, onPlaying }: Props) {
  const area = useRef<HTMLDivElement>(null)
  const { width, height } = canvasSize[project.format]
  const size = useFit(area, width / height)
  const duration = projectDuration(project)

  useEffect(() => {
    const p = playerRef.current
    if (!p) return
    const onFrame = (ev: { detail: { frame: number } }) => frames.set(ev.detail.frame)
    const onPlay = () => onPlaying(true), onPause = () => onPlaying(false)
    p.addEventListener('frameupdate', onFrame)
    p.addEventListener('seeked', onFrame)
    p.addEventListener('play', onPlay)
    p.addEventListener('pause', onPause)
    p.addEventListener('ended', onPause)
    return () => {
      p.removeEventListener('frameupdate', onFrame); p.removeEventListener('seeked', onFrame)
      p.removeEventListener('play', onPlay); p.removeEventListener('pause', onPause); p.removeEventListener('ended', onPause)
    }
  }, [playerRef, frames, onPlaying, size.width])

  return <div className={e.previewArea} ref={area}>
    {size.width > 0 && <div className={e.canvas} style={{ width: size.width, height: size.height }}>
      <Player ref={playerRef} component={EditorComposition} inputProps={{ project }} durationInFrames={duration} fps={FPS}
        compositionWidth={width} compositionHeight={height} style={{ width: '100%', height: '100%' }}
        controls={false} clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} acknowledgeRemotionLicense />
      <Overlay project={project} frames={frames} selectedId={selectedId} onSelect={onSelect} transient={transient} commit={commit} size={size} />
    </div>}
  </div>
}

/** Click and drag elements right on the video. Only clips under the playhead are shown. */
function Overlay({ project, frames, selectedId, onSelect, transient, commit, size }: Pick<Props, 'project' | 'frames' | 'selectedId' | 'onSelect' | 'transient' | 'commit'> & { size: { width: number; height: number } }) {
  const frame = useFrame(frames)
  const visible = [...project.tracks].reverse().filter(t => t.kind !== 'audio' && !t.hidden)
    .flatMap(t => t.clips.filter(c => frame >= c.start && frame < clipEnd(c)).map(c => ({ track: t, clip: c })))
  const selected = findClip(project, selectedId)

  const drag = (ev: React.PointerEvent, id: string, mode: 'move' | 'resize') => {
    ev.stopPropagation()
    onSelect(id)
    const found = findClip(project, id)
    if (!found?.clip.props.box) return
    const before = project, origin = found.clip.props.box, x0 = ev.clientX, y0 = ev.clientY
    const el = ev.currentTarget as HTMLElement
    el.setPointerCapture(ev.pointerId)
    let moved = false
    const move = (m: PointerEvent) => {
      const dx = (m.clientX - x0) / size.width * 100, dy = (m.clientY - y0) / size.height * 100
      if (!moved && Math.abs(m.clientX - x0) + Math.abs(m.clientY - y0) < 3) return
      moved = true
      const box: Box = mode === 'move'
        ? { ...origin, x: Math.round((origin.x + dx) * 10) / 10, y: Math.round((origin.y + dy) * 10) / 10 }
        : { ...origin, w: Math.max(3, Math.round((origin.w + dx) * 10) / 10), h: Math.max(3, Math.round((origin.h + dy) * 10) / 10) }
      transient(updateProps(before, id, { box }))
    }
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); if (moved) commit(before) }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  const boxCss = (b: Box) => ({ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` })
  return <div className={e.overlay} onPointerDown={() => onSelect(null)}>
    {visible.map(({ track, clip }) => clip.props.box && <div key={clip.id} className={`${e.hit} ${clip.id === selectedId ? e.hitOn : ''}`} style={boxCss(clip.props.box)}
      onPointerDown={ev => drag(ev, clip.id, 'move')} title={kindLabel[track.kind]} />)}
    {selected?.clip.props.box && frame >= selected.clip.start && frame < clipEnd(selected.clip) && <div className={e.selBox} style={boxCss(selected.clip.props.box)}>
      <span className={e.selTag}>{kindLabel[selected.track.kind]}</span>
      <span className={e.resize} onPointerDown={ev => drag(ev, selected.clip.id, 'resize')} />
    </div>}
  </div>
}
