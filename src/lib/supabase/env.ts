export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
/** Without the env vars the app runs as the offline demo (no login required). */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY)
