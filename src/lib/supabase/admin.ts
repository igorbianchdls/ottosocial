import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from './env'

/** Supabase with the secret key: bypasses row level security. Server only, for webhooks and jobs. */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!SUPABASE_URL || !key) throw new Error('SUPABASE_SECRET_KEY is not set')
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
