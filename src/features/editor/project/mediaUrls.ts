'use client'

// Real content for the editor's clips: a signed link (signed in) or the uploaded copy in this browser (demo).
// Kept outside React state so every frame of the player can read it synchronously.
import { useSyncExternalStore } from 'react'
import { getBlob } from '@/features/spaces/blobs'
import { signedUrl } from '@/features/spaces/remote'
import { getDrive, remoteDrive } from '@/features/spaces/store'

const urls = new Map<string, string | null>()
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

function load(fileId: string) {
  if (urls.has(fileId) || typeof window === 'undefined') return
  const f = getDrive().files.find(x => x.id === fileId)
  if (!f?.uploaded) return // sample files and the audio library have no content: the block draws a stand-in
  urls.set(fileId, null)
  const done = (u: string | null | undefined) => { urls.set(fileId, u ?? null); listeners.forEach(l => l()) }
  if (remoteDrive) { if (f.storagePath) void signedUrl(f.storagePath).then(done); else done(null) }
  else void getBlob(fileId).then(b => done(b ? URL.createObjectURL(b) : null))
}

/** URL of a Spaces file's content, or null while it loads / when there is none. */
export function useMediaUrl(fileId: string | undefined) {
  const get = () => (fileId ? urls.get(fileId) ?? null : null)
  const url = useSyncExternalStore(subscribe, get, () => null)
  if (fileId && !urls.has(fileId)) load(fileId)
  return url
}
