import { verifyWebhook } from '@clerk/nextjs/webhooks'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revokeKeysOf } from '@/features/apikeys/server'

/**
 * Clerk tells the app when something is deleted there, so the database and the files follow:
 *  - organization.deleted → the workspace, everything in it and its files in the "media" bucket
 *  - user.deleted → the person's profile, preferences, favorites, recents and notifications
 *    (what they created for the team stays)
 *  - organizationMembership.deleted → their row in the workspace's roster, and their API keys there stop working
 *  - user.deleted also revokes their API keys everywhere
 * Signed by Clerk (Svix); set CLERK_WEBHOOK_SIGNING_SECRET and SUPABASE_SECRET_KEY.
 */
export async function POST(req: NextRequest) {
  let evt
  try { evt = await verifyWebhook(req) } catch { return new Response('invalid signature', { status: 400 }) }
  const sb = supabaseAdmin()

  if (evt.type === 'organization.deleted' && evt.data.id) {
    const ws = evt.data.id
    await removeFolder(sb, ws)
    const { error } = await sb.from('workspaces').delete().eq('id', ws)
    if (error) return new Response(error.message, { status: 500 })
  }
  if (evt.type === 'user.deleted' && evt.data.id) {
    const user = evt.data.id
    await revokeKeysOf(user)
    for (const [table, column] of [['favorites', 'user_id'], ['recents', 'user_id'], ['notifications', 'user_id'], ['user_settings', 'user_id'], ['workspace_members', 'user_id'], ['profiles', 'id']] as const) {
      const { error } = await sb.from(table).delete().eq(column, user)
      if (error) return new Response(error.message, { status: 500 })
    }
  }
  if (evt.type === 'organizationMembership.deleted') {
    const ws = evt.data.organization?.id, user = evt.data.public_user_data?.user_id
    if (ws && user) {
      await sb.from('workspace_members').delete().eq('workspace_id', ws).eq('user_id', user)
      await revokeKeysOf(user, ws)
    }
  }
  return new Response('ok')
}

/** Every object under "<workspace>/" (files are "<workspace>/<file id>/<name>"). */
async function removeFolder(sb: ReturnType<typeof supabaseAdmin>, ws: string) {
  const bucket = sb.storage.from('media')
  for (let round = 0; round < 100; round++) {
    const { data: dirs } = await bucket.list(ws, { limit: 100 })
    if (!dirs?.length) return
    const paths: string[] = []
    for (const d of dirs) {
      const { data: inner } = await bucket.list(`${ws}/${d.name}`, { limit: 100 })
      if (inner?.length) paths.push(...inner.map(f => `${ws}/${d.name}/${f.name}`))
      else paths.push(`${ws}/${d.name}`)
    }
    const { error } = await bucket.remove(paths)
    if (error) return
  }
}
