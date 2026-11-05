import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

// API keys for agents. A key is "otto_sk_" + 32 random bytes (base64url). Only its SHA-256 is stored;
// the whole key is shown once, when it is created.

export type Scope = 'ler' | 'usar' | 'conectar'
export const SCOPES: Scope[] = ['ler', 'usar', 'conectar']
const PREFIX = 'otto_sk_'

export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex')

export function newKey() {
  const key = PREFIX + randomBytes(32).toString('base64url')
  return { key, hash: hashKey(key), prefix: key.slice(0, PREFIX.length + 4) }
}

export type KeyOwner = { keyId: string; keyName: string; workspace: string; userId: string; scopes: Scope[]; admin: boolean }

/**
 * Who a request comes from, by its key ("Authorization: Bearer otto_sk_…" or "x-api-key").
 * Null when there is no key, it is unknown or revoked, or its owner is no longer in the workspace.
 */
export async function keyOwner(request: Request): Promise<KeyOwner | null> {
  const header = request.headers.get('authorization') ?? ''
  const key = (header.toLowerCase().startsWith('bearer ') ? header.slice(7) : request.headers.get('x-api-key') ?? '').trim()
  if (!key.startsWith(PREFIX)) return null
  const sb = supabaseAdmin()
  const { data: row } = await sb.from('api_keys').select('id, name, workspace_id, user_id, scopes, revoked_at, last_used_at').eq('key_hash', hashKey(key)).maybeSingle()
  if (!row || row.revoked_at) return null
  // The roster the app keeps (the Clerk webhook removes people who leave, and revokes their keys).
  const { data: member } = await sb.from('workspace_members').select('role').eq('workspace_id', row.workspace_id).eq('user_id', row.user_id).maybeSingle()
  if (!member) return null
  // "Last used" moves at most once a minute.
  if (!row.last_used_at || Date.now() - new Date(row.last_used_at).getTime() > 60_000) {
    await sb.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', row.id)
  }
  return { keyId: row.id, keyName: row.name, workspace: row.workspace_id, userId: row.user_id, scopes: row.scopes as Scope[], admin: member.role === 'admin' }
}

/** Revokes every key of a person in a workspace (they left it), or in every workspace. */
export async function revokeKeysOf(userId: string, workspace?: string) {
  let q = supabaseAdmin().from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('user_id', userId).is('revoked_at', null)
  if (workspace) q = q.eq('workspace_id', workspace)
  await q
}
