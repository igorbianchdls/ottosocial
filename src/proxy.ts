import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseConfigured } from './lib/supabase/env'

// Pages anyone can open. Everything else needs a session with a workspace (Clerk organization).
const PUBLIC = ['/apresentacao', '/login', '/cadastro', '/api/clerk/webhook']
const under = (path: string, list: string[]) => list.some(p => path === p || path.startsWith(p + '/'))

/**
 * Sends people to the right side of the login wall. This is navigation, not security:
 * the data is protected by the database's row level security, which checks the Clerk token.
 */
const guard = clerkMiddleware(async (auth, request: NextRequest) => {
  const path = request.nextUrl.pathname
  if (under(path, PUBLIC)) return
  const { isAuthenticated, sessionStatus } = await auth()
  if (isAuthenticated) return
  // Signed in but still has to pick or create a workspace.
  if (sessionStatus === 'pending') {
    if (path === '/workspace') return
    return NextResponse.redirect(new URL('/workspace', request.url))
  }
  if (path === '/') return NextResponse.redirect(new URL('/apresentacao', request.url))
  const login = new URL('/login', request.url)
  login.searchParams.set('redirect_url', request.nextUrl.pathname + request.nextUrl.search)
  return NextResponse.redirect(login)
})

export function proxy(request: NextRequest, event: Parameters<typeof guard>[1]) {
  if (!supabaseConfigured) return NextResponse.next()
  return guard(request, event)
}

export const config = {
  matcher: [
    // Everything except Next internals and files with an extension (images, fonts, videos).
    '/((?!_next/|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)',
    '/(api|trpc)(.*)',
  ],
}
