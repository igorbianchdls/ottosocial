'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { supabaseConfigured } from '@/lib/supabase/env'
import { setRemoteSaver, updateSettings, type Settings } from '../settings/store'
import { setAccount } from './account'

/**
 * Loads the signed-in person's profile and workspace from Supabase into the app,
 * and saves changes made in Configurações back to the database.
 */
export function AccountSync() {
  useEffect(() => {
    if (!supabaseConfigured) return
    const sb = supabase()
    let cancelled = false
    const timers: Record<string, ReturnType<typeof setTimeout>> = {}

    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user || cancelled) return
      const [{ data: profile }, { data: member }] = await Promise.all([
        sb.from('profiles').select('name, role, color').eq('id', user.id).maybeSingle(),
        sb.from('workspace_members').select('role, workspaces (id, name, timezone, language)').eq('user_id', user.id).order('created_at').limit(1).maybeSingle(),
      ])
      if (cancelled) return
      const ws = (member?.workspaces ?? null) as unknown as { id: string; name: string; timezone: string; language: string } | null
      setAccount({ userId: user.id, email: user.email ?? '', workspaceId: ws?.id ?? null, role: member?.role ?? null })
      if (profile) updateSettings('profile', { name: profile.name, role: profile.role, color: profile.color }, { fromServer: true })
      if (ws) updateSettings('workspace', { name: ws.name, timezone: ws.timezone, language: ws.language }, { fromServer: true })

      setRemoteSaver((section, value) => {
        if (section !== 'profile' && section !== 'workspace') return
        clearTimeout(timers[section])
        timers[section] = setTimeout(() => {
          if (section === 'profile') {
            const p = value as Settings['profile']
            sb.from('profiles').update({ name: p.name, role: p.role, color: p.color }).eq('id', user.id).then()
          } else if (ws) {
            const w = value as Settings['workspace']
            if (w.name.trim()) sb.from('workspaces').update({ name: w.name.trim(), timezone: w.timezone, language: w.language }).eq('id', ws.id).then()
          }
        }, 600)
      })
    })()

    return () => { cancelled = true; setRemoteSaver(null); Object.values(timers).forEach(clearTimeout) }
  }, [])
  return null
}
