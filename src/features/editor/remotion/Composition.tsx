'use client'

import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Film, Image as ImageIcon } from 'lucide-react'
import { media } from '../project/data'
import { FPS, type Box, type Clip, type Project, type TrackKind } from '../project/types'

export type CompositionProps = { project: Project }

const tones: Record<string, [string, string]> = {
  sand: ['#e9cfae', '#8a5f3b'], blue: ['#9cc3fa', '#1f4fa8'], rose: ['#f5aabd', '#9b2f52'],
  green: ['#9ddcb8', '#1f6e47'], violet: ['#c5b3f6', '#4b34a3'], amber: ['#f6d08a', '#97650f'],
}
const font = 'var(--font-geist-sans), system-ui, sans-serif'
const boxStyle = (b: Box = { x: 0, y: 0, w: 100, h: 100 }): React.CSSProperties => ({ position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` })
const clock = (frames: number) => { const sec = Math.floor(frames / FPS); return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}` }

/** Draws the whole project. The last track is the bottom layer, like in the timeline. */
export function EditorComposition({ project }: CompositionProps) {
  return <AbsoluteFill style={{ background: project.background, fontFamily: font, overflow: 'hidden' }}>
    {[...project.tracks].reverse().filter(t => !t.hidden && t.kind !== 'audio').map(t => t.clips.map(c =>
      <Sequence key={c.id} from={c.start} durationInFrames={c.duration} layout="none"><Block kind={t.kind} clip={c} /></Sequence>))}
  </AbsoluteFill>
}

function Block({ kind, clip }: { kind: TrackKind; clip: Clip }) {
  switch (kind) {
    case 'video': return <MediaPlaceholder clip={clip} video />
    case 'imagem': return <MediaPlaceholder clip={clip} />
    case 'texto': return <TextBlock clip={clip} />
    case 'legenda': return <CaptionBlock clip={clip} />
    case 'forma': return <ShapeBlock clip={clip} />
    default: return null
  }
}

/** Stands in for the real file until files come from storage: gradient, name and the file timecode. */
function MediaPlaceholder({ clip, video }: { clip: Clip; video?: boolean }) {
  const frame = useCurrentFrame()
  const m = media(clip.props.fileId)
  const [a, b] = tones[m?.tone ?? 'blue'] ?? tones.blue
  const zoom = interpolate(frame, [0, clip.duration], [1, 1.08])
  const Icon = video ? Film : ImageIcon
  return <div style={{ ...boxStyle(clip.props.box), opacity: clip.props.opacity ?? 1, overflow: 'hidden', borderRadius: video ? 0 : 28 }}>
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 30% 20%, ${a}, ${b} 75%)`, transform: `scale(${zoom})` }} />
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, color: 'rgba(255,255,255,.9)', textAlign: 'center', padding: 40 }}>
      <Icon size={video ? 120 : 90} strokeWidth={1.2} />
      <div style={{ fontSize: video ? 40 : 34, fontWeight: 600, maxWidth: '90%' }}>{m?.name ?? 'Arquivo'}</div>
      {video && <div style={{ fontSize: 30, padding: '6px 16px', borderRadius: 999, background: 'rgba(0,0,0,.28)', fontVariantNumeric: 'tabular-nums' }}>{clock(clip.trimStart + frame)}</div>}
    </div>
  </div>
}

function TextBlock({ clip }: { clip: Clip }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = clip.props
  const text = p.text ?? ''
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 160 } })
  const fadeOut = interpolate(frame, [clip.duration - 6, clip.duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  let transform = 'none', opacity = fadeOut, shown = text
  if (p.anim === 'pop') transform = `scale(${0.6 + 0.4 * pop})`
  if (p.anim === 'surgir') { const t = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }); transform = `translateY(${(1 - t) * 40}px)`; opacity = Math.min(t, fadeOut) }
  if (p.anim === 'digitar') shown = text.slice(0, Math.floor(interpolate(frame, [0, Math.max(8, text.length * 1.6)], [0, text.length], { extrapolateRight: 'clamp' })))
  const justify = p.align === 'left' ? 'flex-start' : p.align === 'right' ? 'flex-end' : 'center'
  return <div style={{ ...boxStyle(p.box), display: 'flex', alignItems: 'center', justifyContent: justify, opacity, transform }}>
    <span style={{ fontSize: p.fontSize ?? 64, fontWeight: p.weight ?? 800, color: p.color ?? '#fff', background: p.bg, padding: p.bg ? '0.18em 0.45em' : 0, borderRadius: 18, lineHeight: 1.15, textAlign: p.align ?? 'center', letterSpacing: '-0.01em', textShadow: p.bg ? 'none' : '0 4px 24px rgba(0,0,0,.45)', whiteSpace: 'pre-wrap' }}>{shown}</span>
  </div>
}

/** Karaoke-style caption: words light up as the clip plays. */
function CaptionBlock({ clip }: { clip: Clip }) {
  const frame = useCurrentFrame()
  const words = (clip.props.text ?? '').split(/\s+/).filter(Boolean)
  const current = Math.min(words.length - 1, Math.floor(frame / Math.max(1, clip.duration / Math.max(1, words.length))))
  const style = clip.props.captionStyle ?? 'amarela'
  const box = style === 'caixa'
  return <div style={{ ...boxStyle(clip.props.box), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.2, textAlign: 'center', padding: box ? '14px 26px' : 0, borderRadius: 20, background: box ? 'rgba(0,0,0,.78)' : 'none' }}>
      {words.map((w, i) => {
        const on = i === current
        const color = style === 'amarela' ? (on ? '#facc15' : '#ffffff') : style === 'branca' ? (i <= current ? '#ffffff' : 'rgba(255,255,255,.55)') : (on ? '#93c5fd' : '#ffffff')
        return <span key={i} style={{ color, display: 'inline-block', marginRight: '0.28em', transform: on ? 'scale(1.08)' : 'none', WebkitTextStroke: box ? 0 : '3px #000', paintOrder: 'stroke fill', textShadow: box ? 'none' : '0 4px 14px rgba(0,0,0,.5)' }}>{w}</span>
      })}
    </div>
  </div>
}

function ShapeBlock({ clip }: { clip: Clip }) {
  const frame = useCurrentFrame()
  const p = clip.props
  const t = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' })
  return <div style={{ ...boxStyle(p.box), background: p.bg ?? '#3b82f6', opacity: (p.opacity ?? 1) * t, borderRadius: p.shape === 'circulo' ? '50%' : p.radius ?? 0 }} />
}
