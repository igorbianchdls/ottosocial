'use client'

import { useSyncExternalStore } from 'react'

/** Who is signed in and which workspace they are working in (filled by AccountSync). */
export type Account = { userId: string; email: string; workspaceId: string | null; role: string | null }

let account: Account | null = null
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export const getAccount = () => account
export function setAccount(a: Account | null) { account = a; listeners.forEach(l => l()) }
export const useAccount = () => useSyncExternalStore(subscribe, getAccount, () => null)
