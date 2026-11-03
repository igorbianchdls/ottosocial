'use client'

import { useClerk } from '@clerk/nextjs'

/** Ends the Clerk session and goes back to the login page (a full load drops every in-memory store). */
export function useSignOut() {
  const clerk = useClerk()
  return () => clerk.signOut({ redirectUrl: '/login' })
}
