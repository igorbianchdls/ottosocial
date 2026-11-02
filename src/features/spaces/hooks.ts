'use client'

// React hooks over the Spaces store and the uploaded files.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { getBlob } from './blobs'
import { getDrive, seedDrive, subscribeDrive } from './store'

/** The server and the first client render see the seed; the saved copy takes over right after. */
export const useDrive = () => useSyncExternalStore(subscribeDrive, getDrive, seedDrive)

/** Object URL for an uploaded file, or null while loading or when there is none. */
export function useBlobUrl(id: string | undefined, enabled = true) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!id || !enabled) return
    let live = true, made: string | null = null
    getBlob(id).then(b => { if (live && b) { made = URL.createObjectURL(b); setUrl(made) } })
    // Revoked a bit later, so a <video> still loading never hits a dead URL.
    return () => { live = false; const u = made; if (u) setTimeout(() => URL.revokeObjectURL(u), 4000) }
  }, [id, enabled])
  return enabled ? url : null
}

