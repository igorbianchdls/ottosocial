import 'server-only'
import { categories, connectorById, connectors, type Connector } from '@/features/connectors/catalog'
import { availableConnectors } from '@/features/connectors/composio'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Row = { id: string; connector: string; status: string; account_label: string; connected_at: string | null }

/** The workspace's connections that count (working, expired or failed), by connector. */
export async function workspaceConnections(workspace: string) {
  const { data } = await supabaseAdmin().from('connectors').select('id, connector, status, account_label, connected_at')
    .eq('workspace_id', workspace).in('status', ['conectado', 'reconectar', 'erro']).order('created_at', { ascending: false })
  const byConnector = new Map<string, Row>()
  for (const r of (data ?? []) as Row[]) {
    const current = byConnector.get(r.connector)
    // The working one wins over an expired or failed one.
    if (!current || (current.status !== 'conectado' && r.status === 'conectado')) byConnector.set(r.connector, r)
  }
  return byConnector
}

/** How a connector reads in the API. */
export function describe(c: Connector, row: Row | undefined, available: string[], full = false) {
  return {
    id: c.id,
    nome: c.name,
    categoria: categories.find(k => k.id === c.category)?.label,
    descricao: c.description,
    disponivel: available.includes(c.id),
    status: row?.status ?? 'desconectado',
    conta: row?.account_label || null,
    conexao: row?.id ?? null,
    conectado_em: row?.connected_at ?? null,
    ...(full ? { permissoes: c.permissions } : {}),
  }
}

export async function listForWorkspace(workspace: string) {
  const rows = await workspaceConnections(workspace)
  const available = availableConnectors()
  return connectors.map(c => describe(c, rows.get(c.id), available))
}

export async function oneForWorkspace(workspace: string, id: string) {
  const c = connectorById(id)
  if (!c) return null
  const rows = await workspaceConnections(workspace)
  return describe(c, rows.get(c.id), availableConnectors(), true)
}
