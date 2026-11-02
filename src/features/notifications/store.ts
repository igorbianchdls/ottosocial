'use client'

// Notifications with read state, kept in this browser until the backend exists.
import { useSyncExternalStore } from 'react'
import { seedNotifications, type AppNotification } from './data'

const KEY = 'ottosocial-notifications-v1'
let list: AppNotification[] = seedNotifications
let loaded = false
const listeners = new Set<() => void>()

function ensure() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try { const raw = localStorage.getItem(KEY); if (raw) list = JSON.parse(raw) } catch { /* keeps the samples */ }
}
function commit(next: AppNotification[]) {
  list = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage blocked */ }
  listeners.forEach(l => l())
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const get = () => { ensure(); return list }
export const useNotifications = () => useSyncExternalStore(subscribe, get, () => seedNotifications)

const stamp = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }

/** Adds a notification from something that just happened in the app. */
export function notify(n: Omit<AppNotification, 'id' | 'date' | 'read'>) {
  commit([{ ...n, id: `n${Date.now().toString(36)}`, date: stamp(), read: false }, ...get()])
}
export const setRead = (ids: string[], read: boolean) => commit(get().map(n => ids.includes(n.id) ? { ...n, read } : n))
export const removeNotifications = (ids: string[]) => commit(get().filter(n => !ids.includes(n.id)))
export const restoreNotifications = (items: AppNotification[]) => commit([...items, ...get()].sort((a, b) => b.date.localeCompare(a.date)))
