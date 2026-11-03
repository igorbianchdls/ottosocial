import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from './env'

/** Supabase as the signed-in person (Clerk token), for server components, route handlers and actions. */
export function supabaseServer() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    async accessToken() { return (await auth()).getToken() },
  })
}
