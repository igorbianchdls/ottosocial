import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { Clip } from '../../project/types'
import { fonts } from '../animate'

export function TextBlock({ clip }: { clip: Clip }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = clip.props
  const text = p.text ?? ''
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 160 } })
  let transform = 'none', opacity = 1, shown = text
  if (p.anim === 'pop') transform = `scale(${0.6 + 0.4 * pop})`
  if (p.anim === 'surgir') { const t = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }); transform = `translateY(${(1 - t) * 40}px)`; opacity = t }
  if (p.anim === 'digitar') shown = text.slice(0, Math.floor(interpolate(frame, [0, Math.max(8, text.length * 1.6)], [0, text.length], { extrapolateRight: 'clamp' })))
  const justify = p.align === 'left' ? 'flex-start' : p.align === 'right' ? 'flex-end' : 'center'
  return <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: justify, opacity, transform }}>
    <span style={{ fontFamily: fonts[p.font ?? 'geist'].family, fontSize: p.fontSize ?? 64, fontWeight: p.weight ?? 800, color: p.color ?? '#fff', background: p.bg, padding: p.bg ? '0.18em 0.45em' : 0, borderRadius: 18, lineHeight: 1.15, textAlign: p.align ?? 'center', letterSpacing: p.font === 'bebas' ? '0.02em' : '-0.01em', textShadow: p.bg ? 'none' : '0 4px 24px rgba(0,0,0,.45)', whiteSpace: 'pre-wrap' }}>{shown}</span>
  </div>
}
