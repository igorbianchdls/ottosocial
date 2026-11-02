'use client'

import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion'
import type { Clip, Project, TrackKind } from '../project/types'
import { fonts, layerStyle } from './animate'
import { CaptionBlock } from './blocks/CaptionBlock'
import { MediaBlock } from './blocks/MediaBlock'
import { ShapeBlock } from './blocks/ShapeBlock'
import { TextBlock } from './blocks/TextBlock'

export type CompositionProps = { project: Project }

/** Draws the whole project. The last track is the bottom layer, like in the timeline. */
export function EditorComposition({ project }: CompositionProps) {
  return <AbsoluteFill style={{ background: project.background, fontFamily: fonts.geist.family, overflow: 'hidden' }}>
    {[...project.tracks].reverse().filter(t => !t.hidden && t.kind !== 'audio').map(t => t.clips.map(c =>
      <Sequence key={c.id} from={c.start} durationInFrames={c.duration} layout="none"><Layer kind={t.kind} clip={c} /></Sequence>))}
  </AbsoluteFill>
}

/** Places the clip in its box and applies keyframes, transitions and opacity. */
function Layer({ kind, clip }: { kind: TrackKind; clip: Clip }) {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const b = clip.props.box ?? { x: 0, y: 0, w: 100, h: 100 }
  return <div style={{ position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%`, ...layerStyle(clip, frame, width, height) }}>
    {kind === 'video' ? <MediaBlock clip={clip} video /> : kind === 'imagem' ? <MediaBlock clip={clip} /> : kind === 'texto' ? <TextBlock clip={clip} /> : kind === 'legenda' ? <CaptionBlock clip={clip} /> : <ShapeBlock clip={clip} />}
  </div>
}
