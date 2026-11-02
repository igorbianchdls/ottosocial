import type { Clip } from '../../project/types'

export function ShapeBlock({ clip }: { clip: Clip }) {
  const p = clip.props
  return <div style={{ position: 'absolute', inset: 0, background: p.bg ?? '#3b82f6', borderRadius: p.shape === 'circulo' ? '50%' : p.radius ?? 0 }} />
}
