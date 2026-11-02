import { interpolate, useCurrentFrame } from 'remotion'
import { Film, Image as ImageIcon } from 'lucide-react'
import { media } from '../../project/data'
import { FPS, type Clip } from '../../project/types'
import { filterCss } from '../animate'

const tones: Record<string, [string, string]> = {
  sand: ['#e9cfae', '#8a5f3b'], blue: ['#9cc3fa', '#1f4fa8'], rose: ['#f5aabd', '#9b2f52'],
  green: ['#9ddcb8', '#1f6e47'], violet: ['#c5b3f6', '#4b34a3'], amber: ['#f6d08a', '#97650f'],
}
const clock = (frames: number) => { const sec = Math.floor(frames / FPS); return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}` }

/** Stands in for the real file until files come from storage: gradient, name and the file timecode. */
export function MediaBlock({ clip, video }: { clip: Clip; video?: boolean }) {
  const frame = useCurrentFrame()
  const m = media(clip.props.fileId)
  const [a, b] = tones[m?.tone ?? 'blue'] ?? tones.blue
  const speed = clip.speed ?? 1
  const zoom = interpolate(frame, [0, clip.duration], [1, 1.08])
  const Icon = video ? Film : ImageIcon
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: video ? 0 : 28, filter: filterCss(clip.props.filter) }}>
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 30% 20%, ${a}, ${b} 75%)`, transform: `scale(${zoom})` }} />
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, color: 'rgba(255,255,255,.9)', textAlign: 'center', padding: 40 }}>
      <Icon size={video ? 120 : 90} strokeWidth={1.2} />
      <div style={{ fontSize: video ? 40 : 34, fontWeight: 600, maxWidth: '90%' }}>{m?.name ?? 'Arquivo'}</div>
      {video && <div style={{ fontSize: 30, padding: '6px 16px', borderRadius: 999, background: 'rgba(0,0,0,.28)', fontVariantNumeric: 'tabular-nums' }}>{clock(clip.trimStart + Math.round(frame * speed))}{speed !== 1 ? ` · ${speed}x` : ''}</div>}
    </div>
  </div>
}
