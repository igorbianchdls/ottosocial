// Pure edits on a project. The timeline, the properties panel and the AI all go through these.
import { media } from './data'
import { FPS, kindRank, localStamp, type Clip, type ClipProps, type Project, type Track, type TrackKind } from './types'

export const MIN_CLIP = 5
export const uid = (p = 'c') => p + Math.random().toString(36).slice(2, 9)
export const clipEnd = (c: Clip) => c.start + c.duration
export const projectDuration = (p: Project) => Math.max(FPS, ...p.tracks.flatMap(t => t.clips.map(clipEnd)))

export function findClip(p: Project, id: string | null): { track: Track; clip: Clip } | null {
  if (!id) return null
  for (const track of p.tracks) { const clip = track.clips.find(c => c.id === id); if (clip) return { track, clip } }
  return null
}

/** Longest a media clip can be, from its trim point to the end of the file. Infinity for text, shapes and images. */
export function maxDuration(kind: TrackKind, c: Clip) {
  if (kind !== 'video' && kind !== 'audio') return Infinity
  const m = media(c.props.fileId)
  return m?.duration ? Math.round(m.duration * FPS) - c.trimStart : Infinity
}

const touch = (p: Project): Project => ({ ...p, updatedAt: localStamp() })
const mapTracks = (p: Project, fn: (t: Track) => Track) => touch({ ...p, tracks: p.tracks.map(fn) })
export const mapClip = (p: Project, id: string, fn: (c: Clip, t: Track) => Clip) =>
  mapTracks(p, t => t.clips.some(c => c.id === id) ? { ...t, clips: t.clips.map(c => c.id === id ? fn(c, t) : c) } : t)

export const updateProps = (p: Project, id: string, patch: Partial<ClipProps>) => mapClip(p, id, c => ({ ...c, props: { ...c.props, ...patch } }))
export const updateTrack = (p: Project, id: string, patch: Partial<Track>) => mapTracks(p, t => t.id === id ? { ...t, ...patch } : t)

export function overlaps(t: Track, start: number, duration: number, ignoreId?: string) {
  return t.clips.some(c => c.id !== ignoreId && start < clipEnd(c) && c.start < start + duration)
}

/** Closest start to `start` where the clip fits on the track without overlapping. */
export function freeStart(t: Track, start: number, duration: number, ignoreId?: string) {
  const others = t.clips.filter(c => c.id !== ignoreId)
  const candidates = [start, ...others.map(clipEnd), ...others.map(c => c.start - duration)].filter(x => x >= 0 && !overlaps(t, x, duration, ignoreId))
  return candidates.sort((a, b) => Math.abs(a - start) - Math.abs(b - start))[0] ?? Math.max(start, ...others.map(clipEnd))
}

/** Drops empty tracks and sorts clips. */
export const normalize = (p: Project): Project => ({ ...p, tracks: p.tracks.filter(t => t.clips.length).map(t => ({ ...t, clips: [...t.clips].sort((a, b) => a.start - b.start) })) })

/** Adds a clip on the first track of its kind that has room, or on a new track. */
export function addClip(p: Project, kind: TrackKind, clip: Omit<Clip, 'id'>, trackId?: string): { project: Project; id: string } {
  const id = uid()
  const c: Clip = { ...clip, id, start: Math.max(0, Math.round(clip.start)) }
  const preferred = p.tracks.find(t => t.id === trackId && t.kind === kind)
  const target = (preferred && !overlaps(preferred, c.start, c.duration) ? preferred : undefined)
    ?? p.tracks.find(t => t.kind === kind && !overlaps(t, c.start, c.duration))
  if (target) return { project: touch({ ...p, tracks: p.tracks.map(t => t === target ? { ...t, clips: [...t.clips, c] } : t) }), id }
  const at = p.tracks.findIndex(t => kindRank[t.kind] > kindRank[kind])
  const tracks = [...p.tracks]
  tracks.splice(at === -1 ? tracks.length : at, 0, { id: uid('t'), kind, clips: [c] })
  return { project: touch({ ...p, tracks }), id }
}

/** Moves a clip in time and, if the target track has the same kind, to that track. Overlaps are resolved by `settle`. */
export function moveClip(p: Project, id: string, start: number, targetTrackId?: string): Project {
  const found = findClip(p, id)
  if (!found) return p
  const target = p.tracks.find(t => t.id === targetTrackId && t.kind === found.track.kind) ?? found.track
  const c = { ...found.clip, start: Math.max(0, Math.round(start)) }
  return touch({ ...p, tracks: p.tracks.map(t => {
    const clips = t.clips.filter(x => x.id !== id)
    return t === target ? { ...t, clips: [...clips, c] } : t === found.track ? { ...t, clips } : t
  }) })
}

/** After a drop: pushes the clip to the closest free spot on its track and drops empty tracks. */
export function settle(p: Project, id: string): Project {
  const found = findClip(p, id)
  if (!found) return normalize(p)
  const start = freeStart(found.track, found.clip.start, found.clip.duration, id)
  return normalize(start === found.clip.start ? p : mapClip(p, id, c => ({ ...c, start })))
}

export function trimLeft(p: Project, id: string, newStart: number): Project {
  const found = findClip(p, id)
  if (!found) return p
  const { clip, track } = found
  const isMedia = track.kind === 'video' || track.kind === 'audio'
  const lowest = isMedia ? clip.start - clip.trimStart : 0
  const start = Math.round(Math.min(clipEnd(clip) - MIN_CLIP, Math.max(lowest, 0, newStart)))
  const delta = start - clip.start
  return mapClip(p, id, c => ({ ...c, start, duration: c.duration - delta, trimStart: isMedia ? c.trimStart + delta : c.trimStart }))
}

export function trimRight(p: Project, id: string, newEnd: number): Project {
  const found = findClip(p, id)
  if (!found) return p
  const { clip, track } = found
  const duration = Math.round(Math.min(maxDuration(track.kind, clip), Math.max(MIN_CLIP, newEnd - clip.start)))
  return mapClip(p, id, c => ({ ...c, duration }))
}

export function splitAt(p: Project, id: string, frame: number): { project: Project; id: string } | null {
  const found = findClip(p, id)
  if (!found) return null
  const { clip, track } = found
  if (frame <= clip.start + 1 || frame >= clipEnd(clip) - 1) return null
  const isMedia = track.kind === 'video' || track.kind === 'audio'
  const rightId = uid()
  const left: Clip = { ...clip, duration: frame - clip.start }
  const right: Clip = { ...clip, id: rightId, start: frame, duration: clipEnd(clip) - frame, trimStart: isMedia ? clip.trimStart + frame - clip.start : clip.trimStart }
  return { project: touch({ ...p, tracks: p.tracks.map(t => t === track ? { ...t, clips: t.clips.flatMap(c => c.id === id ? [left, right] : [c]) } : t) }), id: rightId }
}

export const removeClip = (p: Project, id: string) => normalize(touch({ ...p, tracks: p.tracks.map(t => ({ ...t, clips: t.clips.filter(c => c.id !== id) })) }))

export function duplicateClip(p: Project, id: string): { project: Project; id: string } | null {
  const found = findClip(p, id)
  if (!found) return null
  const copy = { ...found.clip, start: freeStart(found.track, clipEnd(found.clip), found.clip.duration) }
  return addClip(p, found.track.kind, copy, found.track.id)
}

/** Removes the first `frames` of the whole video and pulls everything back. */
export function cutHead(p: Project, frames: number): Project {
  return normalize(touch({ ...p, tracks: p.tracks.map(t => ({ ...t, clips: t.clips.flatMap(c => {
    if (clipEnd(c) <= frames) return []
    if (c.start >= frames) return [{ ...c, start: c.start - frames }]
    const cut = frames - c.start
    const isMedia = t.kind === 'video' || t.kind === 'audio'
    return [{ ...c, start: 0, duration: c.duration - cut, trimStart: isMedia ? c.trimStart + cut : c.trimStart }]
  }) })) }))
}

/** Ends the whole video at `frames`. */
export function limitTo(p: Project, frames: number): Project {
  return normalize(touch({ ...p, tracks: p.tracks.map(t => ({ ...t, clips: t.clips.filter(c => c.start < frames - MIN_CLIP).map(c => ({ ...c, duration: Math.min(c.duration, frames - c.start) })) })) }))
}
