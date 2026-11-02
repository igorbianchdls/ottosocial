'use client'

// User and workspace preferences, kept in this browser until login and the database exist (phase 2).
import { useSyncExternalStore } from 'react'
import type { NotificationKind } from '../notifications/data'
import type { PostFormat } from '../posts/data'

export type Theme = 'claro' | 'escuro' | 'sistema'
export type Settings = {
  profile: { name: string; role: string; color: string }
  workspace: { name: string; timezone: string; language: string }
  appearance: { theme: Theme; compact: boolean }
  notifications: { kinds: Record<NotificationKind, boolean>; email: boolean; push: boolean; daily: boolean; quietFrom: string; quietTo: string }
  posting: { accountIds: string[]; format: PostFormat; time: string; confirm: boolean; hashtags: string }
}

export const defaults: Settings = {
  profile: { name: 'Igor', role: 'Fundador', color: '#3b82f6' },
  workspace: { name: 'Otto ERP', timezone: 'America/Sao_Paulo', language: 'pt-BR' },
  appearance: { theme: 'claro', compact: false },
  notifications: {
    kinds: { publicado: true, erro: true, comentario: true, agendado: true, armazenamento: true, conta: true, plugin: true, arquivos: false },
    email: false, push: true, daily: true, quietFrom: '22:00', quietTo: '07:00',
  },
  posting: { accountIds: ['ig-otto'], format: 'reel', time: '19:00', confirm: true, hashtags: '' },
}

const KEY = 'ottosocial-settings-v1'
let state: Settings = defaults
let loaded = false
const listeners = new Set<() => void>()

function ensure() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Settings>
      // Merge section by section so settings added later get their defaults.
      state = { ...defaults, ...Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, { ...defaults[k as keyof Settings], ...(v as object) }])) } as Settings
    }
  } catch { /* defaults */ }
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const getSettings = () => { ensure(); return state }
export const useSettings = () => useSyncExternalStore(subscribe, getSettings, () => defaults)

export function updateSettings<K extends keyof Settings>(section: K, patch: Partial<Settings[K]>) {
  state = { ...getSettings(), [section]: { ...getSettings()[section], ...patch } }
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage blocked */ }
  listeners.forEach(l => l())
}
export function resetSettings() {
  state = defaults
  try { localStorage.removeItem(KEY) } catch { /* storage blocked */ }
  listeners.forEach(l => l())
}

/** Every key the app keeps in this browser, for backup and reset. */
export const APP_KEYS = ['ottosocial-drive-v1', 'ottosocial-posts-v1', 'ottosocial-editor-v1', 'ottosocial-editor-versions-v1', 'ottosocial-notifications-v1', 'ottosocial-settings-v1', 'ottosocial-plugin-modes-v1', 'ottosocial-drive-view', 'ottosocial-accounts-v1', 'ottosocial-tour-v1']
