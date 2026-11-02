'use client'

import { Captions, Film, Image as ImageIcon, Music, Shapes, Type } from 'lucide-react'
import { media } from '../project/data'
import type { Clip, TrackKind } from '../project/types'
import e from '../editor.module.css'

export const kindIcon: Record<TrackKind, typeof Film> = { texto: Type, legenda: Captions, forma: Shapes, imagem: ImageIcon, video: Film, audio: Music }
export type DragMode = 'move' | 'left' | 'right'

const noise = (seed: string, i: number) => {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  h = Math.imul(h ^ i, 2654435761)
  return ((h >>> 0) % 1000) / 1000
}

/** Fake waveform until real audio files exist; follows trim and speed so cuts look right. */
function Waveform({ clip, ppf, width }: { clip: Clip; ppf: number; width: number }) {
  const bars = Math.max(1, Math.floor(width / 4))
  const framesPerBar = 4 / ppf * (clip.speed ?? 1)
  const seed = clip.props.fileId ?? clip.id
  return <svg className={e.wave} width={width} height="100%" viewBox={`0 0 ${width} 30`} preserveAspectRatio="none" aria-hidden>
    {Array.from({ length: bars }, (_, i) => {
      const bucket = Math.floor((clip.trimStart + i * framesPerBar) / 4)
      const h = 4 + 24 * (0.35 * noise(seed, bucket) + 0.65 * Math.abs(Math.sin(bucket / 9 + noise(seed, bucket >> 3) * 3)))
      return <rect key={i} x={i * 4} y={(30 - h) / 2} width={2} height={h} rx={1} />
    })}
  </svg>
}

type Props = { clip: Clip; kind: TrackKind; ppf: number; on: boolean; onDrag: (ev: React.PointerEvent, c: Clip, mode: DragMode) => void; onSeek: (frame: number) => void }

export function ClipView({ clip, kind, ppf, on, onDrag, onSeek }: Props) {
  const width = Math.max(4, clip.duration * ppf)
  const m = media(clip.props.fileId)
  const label = kind === 'texto' || kind === 'legenda' ? clip.props.text : kind === 'forma' ? (clip.props.shape === 'circulo' ? 'Círculo' : 'Retângulo') : m?.name
  const Icon = kindIcon[kind]
  const { transIn, transOut, keyframes } = clip.props
  return <div className={`${e.clip} ${e[`clip_${kind}`]} ${kind === 'video' || kind === 'imagem' ? e[`tone_${m?.tone ?? 'blue'}`] : ''} ${on ? e.clipOn : ''}`}
    style={{ left: clip.start * ppf, width }} onPointerDown={ev => onDrag(ev, clip, 'move')} title={label} data-clip-id={clip.id}>
    {kind === 'audio' && <Waveform clip={clip} ppf={ppf} width={width} />}
    {transIn && <span className={`${e.trans} ${e.transIn}`} style={{ width: Math.min(width / 2, transIn.frames * ppf) }} title={`Entrada: ${transIn.type}`} />}
    {transOut && <span className={`${e.trans} ${e.transOut}`} style={{ width: Math.min(width / 2, transOut.frames * ppf) }} title={`Saída: ${transOut.type}`} />}
    <span className={e.clipLabel}><Icon size={12} />{label}{clip.speed && clip.speed !== 1 && <em className={e.speedTag}>{clip.speed}x</em>}</span>
    {keyframes?.map(k => <button key={k.frame} className={e.diamond} style={{ left: k.frame * ppf }} aria-label="Ir para o keyframe"
      onPointerDown={ev => { ev.stopPropagation(); onSeek(clip.start + k.frame) }} />)}
    <span className={`${e.edge} ${e.edgeL}`} onPointerDown={ev => onDrag(ev, clip, 'left')} />
    <span className={`${e.edge} ${e.edgeR}`} onPointerDown={ev => onDrag(ev, clip, 'right')} />
  </div>
}
