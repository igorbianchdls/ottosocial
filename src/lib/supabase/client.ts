import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from './env'

let client: SupabaseClient | undefined

/** One browser client for the whole app; the session lives in cookies so the server and proxy see it too. */
export function supabase() {
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
  return client
}
