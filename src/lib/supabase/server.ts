import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_KEY, SUPABASE_URL } from './env'

/** Supabase as the signed-in user, for server components and route handlers. */
export async function supabaseServer() {
  const store = await cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: list => {
        // Server components cannot set cookies; the proxy refreshes the session instead.
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)) } catch { /* read-only here */ }
      },
    },
  })
}
