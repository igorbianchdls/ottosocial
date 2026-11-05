import type { NextRequest } from 'next/server'
import { SCOPES, newKey, type Scope } from '@/features/apikeys/server'
import { json, whoIsAsking } from '@/features/connectors/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const MAX_ACTIVE = 20

/**
 * Creates an API key for the signed-in person in the active workspace. Body: { nome, permissoes }.
 * Answers the whole key once; only its hash is stored. "conectar" is for workspace admins.
 */
export async function POST(request: NextRequest) {
  const who = await whoIsAsking()
  if (!who.userId || !who.workspace) return json({ error: 'Entre na sua conta.' }, 401)
  const body = await request.json().catch(() => ({})) as { nome?: unknown; permissoes?: unknown }
  const name = typeof body.nome === 'string' ? body.nome.trim().slice(0, 60) : ''
  if (!name) return json({ error: 'Dê um nome para a chave.' }, 400)
  const scopes = Array.isArray(body.permissoes) ? [...new Set(body.permissoes.filter((s): s is Scope => SCOPES.includes(s as Scope)))] : []
  if (!scopes.length) return json({ error: 'Escolha pelo menos uma permissão.' }, 400)
  if (scopes.includes('conectar') && !who.admin) return json({ error: 'Só administradores podem criar chaves que conectam serviços.' }, 403)

  const sb = supabaseAdmin()
  const { count } = await sb.from('api_keys').select('id', { count: 'exact', head: true }).eq('workspace_id', who.workspace).eq('user_id', who.userId).is('revoked_at', null)
  if ((count ?? 0) >= MAX_ACTIVE) return json({ error: `Você já tem ${MAX_ACTIVE} chaves ativas. Revogue alguma antes de criar outra.` }, 409)

  const { key, hash, prefix } = newKey()
  const { data, error } = await sb.from('api_keys').insert({ workspace_id: who.workspace, user_id: who.userId, name, prefix, key_hash: hash, scopes })
    .select('id, name, prefix, scopes, created_at').single()
  if (error) { console.error('chaves: falha ao criar', error); return json({ error: 'Não foi possível criar a chave. Tente de novo.' }, 500) }
  return json({ chave: key, registro: data }, 201)
}
