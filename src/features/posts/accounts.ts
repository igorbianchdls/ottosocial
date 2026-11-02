'use client'

// Connection state of each social account, kept in this browser until real OAuth (phase 3).
import { useSyncExternalStore } from 'react'
import { accounts as base, type Account } from './data'

export type AccountState = Account & { status: 'conectada' | 'reconectar' | 'desconectada'; connectedAt?: string }
type Overrides = Record<string, { status: AccountState['status']; connectedAt?: string }>

const KEY = 'ottosocial-accounts-v1'
// The TikTok session "expired" in the sample data, matching the notification about it.
const seed: Overrides = { 'ig-otto': { status: 'conectada', connectedAt: '2026-09-02' }, 'tt-otto': { status: 'reconectar', connectedAt: '2026-09-15' } }
let overrides: Overrides = seed
let loaded = false
const listeners = new Set<() => void>()
function ensure() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try { const raw = localStorage.getItem(KEY); if (raw) overrides = JSON.parse(raw) } catch { /* seed */ }
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const get = () => { ensure(); return overrides }

const build = (o: Overrides): AccountState[] => base.map(a => {
  const s = o[a.id]
  const status = s?.status ?? (a.connected ? 'conectada' : 'desconectada')
  return { ...a, status, connected: status !== 'desconectada', connectedAt: s?.connectedAt }
})
let cache: { o: Overrides; list: AccountState[] } | null = null
const snapshot = () => { const o = get(); if (cache?.o !== o) cache = { o, list: build(o) }; return cache.list }
const serverList = build(seed)

/** Accounts with their current connection state. "reconectar" still counts as connected for choosing, with a warning. */
export const useAccounts = () => useSyncExternalStore(subscribe, snapshot, () => serverList)

export function setAccountStatus(id: string, status: AccountState['status']) {
  const today = new Date().toISOString().slice(0, 10)
  overrides = { ...get(), [id]: { status, connectedAt: status === 'desconectada' ? undefined : today } }
  try { localStorage.setItem(KEY, JSON.stringify(overrides)) } catch { /* storage blocked */ }
  listeners.forEach(l => l())
}
