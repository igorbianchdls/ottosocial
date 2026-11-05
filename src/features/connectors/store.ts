'use client'

// The workspace's connections (rows of "connectors") and what happened with them ("connector_activity").
// Read straight from Supabase; every change goes through the /api/conectores routes, which talk to Composio.
// Without Supabase (offline demo) the list is empty.
import { useSyncExternalStore } from 'react'
import { db, localStamp, remoteMode, type WorkspaceContext } from '@/lib/sync'
import { reloadAccounts } from '@/features/posts/accounts'

export type ConnectionStatus = 'conectando' | 'conectado' | 'reconectar' | 'erro' | 'desconectado'
export type Connection = { id: string; connector: string; status: ConnectionStatus; label: string; connectedBy?: string; connectedAt?: string; error?: string }
export type ConnectorEvent = { id: string; connector: string; action: 'conectou' | 'desconectou' | 'reconectar' | 'erro' | 'usou'; detail: string; actor?: string; date: string }
type State = { loaded: boolean; connections: Connection[]; activity: ConnectorEvent[] }

const empty: State = { loaded: !remoteMode, connections: [], activity: [] }
let state = empty
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const set = (next: State) => { state = next; listeners.forEach(l => l()) }
export const useConnections = () => useSyncExternalStore(subscribe, () => state, () => empty)

let ctx: WorkspaceContext | null = null
export async function connectConnectors(next: WorkspaceContext) {
  if (ctx?.ws !== next.ws) set({ ...empty, loaded: false })
  ctx = next
  await reloadConnections()
}
export async function reloadConnections() {
  const c = ctx
  if (!c) return
  const sb = db()
  const [rows, act] = await Promise.all([
    sb.from('connectors').select('id, connector, status, account_label, connected_by, connected_at, error').eq('workspace_id', c.ws).neq('status', 'desconectado').order('created_at'),
    sb.from('connector_activity').select('id, connector, action, detail, actor, created_at').eq('workspace_id', c.ws).order('created_at', { ascending: false }).limit(100),
  ])
  if (ctx !== c) return
  set({
    loaded: true,
    connections: (rows.data ?? []).map(r => ({ id: r.id, connector: r.connector, status: r.status, label: r.account_label, connectedBy: r.connected_by ?? undefined, connectedAt: r.connected_at ? localStamp(r.connected_at) : undefined, error: r.error ?? undefined })),
    activity: (act.data ?? []).map(a => ({ id: a.id, connector: a.connector, action: a.action, detail: a.detail, actor: a.actor ?? undefined, date: localStamp(a.created_at) })),
  })
}
// Coming back to the tab (e.g. from the service's login in another window) picks up what changed.
if (remoteMode && typeof window !== 'undefined') window.addEventListener('focus', () => { void reloadConnections() })

/** The connection of a connector that counts: the working one, else the one needing attention. */
export function mainConnection(list: Connection[], connector: string) {
  const mine = list.filter(c => c.connector === connector)
  return mine.find(c => c.status === 'conectado') ?? mine.find(c => c.status === 'reconectar') ?? mine.find(c => c.status === 'erro')
}

async function post(url: string, body?: unknown): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch(url, { method: 'POST', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
    const data = await res.json().catch(() => ({}))
    return res.ok ? data : { error: data.error ?? 'Algo deu errado. Tente de novo.' }
  } catch { return { error: 'Sem conexão com o servidor. Tente de novo.' } }
}

/** Opens the service's login (via Composio). Resolves with an error message when it could not start. */
export async function startConnect(connector: string): Promise<string | undefined> {
  const r = await post(`/api/conectores/${encodeURIComponent(connector)}/conectar`)
  if (r.url) { window.location.assign(r.url); return }
  return r.error
}

export async function disconnect(connectionId: string): Promise<string | undefined> {
  const r = await post('/api/conectores/desconectar', { conexao: connectionId })
  if (r.error) return r.error
  await Promise.all([reloadConnections(), reloadAccounts()])
}
