export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
export const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''
/** Login (Clerk) and data (Supabase) are both set up. Without them the app runs as the offline demo. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY && CLERK_KEY)
