'use client'

// What the ChatGPT/Claude plugin may do (per tool) and what it did.
// Signed in: plugin_tool_modes and plugin_activity of the workspace. Without Supabase: this browser, with samples.
import { useSyncExternalStore } from 'react'
import { db, localStamp, must, persist, remoteMode, workspaceReady, type WorkspaceContext } from '@/lib/sync'
import { activity as sampleActivity, tools, type ActivityItem, type ToolMode } from './data'

const MODES_KEY = 'ottosocial-plugin-modes-v1'
const defaults = Object.fromEntries(tools.map(t => [t.id, t.mode])) as Record<string, ToolMode>
type State = { modes: Record<string, ToolMode>; activity: ActivityItem[] }
let state: State = { modes: defaults, activity: remoteMode ? [] : sampleActivity }
const server = state
let loaded = false
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const set = (next: State) => { state = next; listeners.forEach(l => l()) }
function get() {
  if (!loaded && !remoteMode && typeof window !== 'undefined') {
    loaded = true
    try { const raw = localStorage.getItem(MODES_KEY); if (raw) state = { ...state, modes: { ...defaults, ...JSON.parse(raw) } } } catch { /* defaults */ }
  }
  return state
}
export const usePlugin = () => useSyncExternalStore(subscribe, get, () => server)

let ctx: WorkspaceContext | null = null
export async function connectPlugin(next: WorkspaceContext) {
  ctx = next
  const sb = db()
  const [modes, act] = await Promise.all([
    sb.from('plugin_tool_modes').select('tool_id, mode').eq('workspace_id', next.ws),
    sb.from('plugin_activity').select('id, assistant, tool_id, text, status, created_at').eq('workspace_id', next.ws).order('created_at', { ascending: false }).limit(50),
  ])
  if (ctx !== next) return
  set({
    modes: { ...defaults, ...Object.fromEntries((modes.data ?? []).map(m => [m.tool_id, m.mode as ToolMode])) },
    activity: (act.data ?? []).map(a => ({ id: a.id, assistant: a.assistant, tool: a.tool_id, text: a.text, status: a.status, date: localStamp(a.created_at) })),
  })
}

export function setToolMode(id: string, mode: ToolMode) {
  set({ ...get(), modes: { ...get().modes, [id]: mode } })
  if (!remoteMode) { try { localStorage.setItem(MODES_KEY, JSON.stringify(state.modes)) } catch { /* storage blocked */ } return }
  void persist(async () => { const c = ctx ?? await workspaceReady(); await must(db().from('plugin_tool_modes').upsert({ workspace_id: c.ws, tool_id: id, mode })) })
}
