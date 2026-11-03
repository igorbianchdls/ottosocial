import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from './env'

type ClerkGlobal = { session?: { getToken: () => Promise<string | null> } | null }

let client: SupabaseClient | undefined

/**
 * One browser client for the whole app. Every request carries the Clerk session token
 * (with the active organization), which Supabase accepts as third-party auth.
 */
export function supabase() {
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    async accessToken() {
      const clerk = (globalThis as { Clerk?: ClerkGlobal }).Clerk
      try { return (await clerk?.session?.getToken()) ?? null } catch { return null }
    },
  })
  return client
}
