import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from './lib/supabase/env'

const PUBLIC = ['/apresentacao', '/login', '/cadastro', '/recuperar-senha', '/auth']
const GUEST_ONLY = ['/login', '/cadastro', '/recuperar-senha']
const under = (path: string, list: string[]) => list.some(p => path === p || path.startsWith(p + '/'))

/** Keeps the Supabase session fresh and sends people to the right side of the login wall. */
export async function proxy(request: NextRequest) {
  if (!supabaseConfigured) return NextResponse.next()
  let response = NextResponse.next({ request })
  const sb = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v))
      },
    },
  })
  const { data } = await sb.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)
  const path = request.nextUrl.pathname

  const redirect = (to: string) => {
    const r = NextResponse.redirect(new URL(to, request.url))
    response.cookies.getAll().forEach(c => r.cookies.set(c))
    return r
  }
  if (!signedIn && !under(path, PUBLIC)) {
    return redirect(path === '/' ? '/apresentacao' : `/login?next=${encodeURIComponent(path + request.nextUrl.search)}`)
  }
  if (signedIn && under(path, GUEST_ONLY)) return redirect('/')
  return response
}

export const config = {
  // Everything except Next internals and files with an extension (images, fonts, videos).
  matcher: ['/((?!_next/|api/|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)'],
}
