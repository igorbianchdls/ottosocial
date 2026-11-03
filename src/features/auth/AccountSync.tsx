'use client'

import { useEffect } from 'react'
import { useAuth, useOrganization, useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import { supabaseConfigured } from '@/lib/supabase/env'
import { setRemoteSaver, updateSettings, type Settings } from '../settings/store'
import { setAccount } from './account'
import { connectDrive } from '../spaces/store'

/**
 * Bridges Clerk and the database. For the signed-in person and their active workspace (Clerk organization):
 * makes sure the profile, the workspace row and their place in the roster exist, loads them into the app,
 * opens the workspace's Spaces, and saves changes made in Configurações back.
 */
function Sync() {
  const { isLoaded, userId, orgId, orgRole } = useAuth()
  const { user } = useUser()
  const { organization } = useOrganization()
  const orgName = organization?.name
  const fullName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress.split('@')[0] || ''
  const email = user?.primaryEmailAddress?.emailAddress ?? ''

  useEffect(() => {
    if (!isLoaded || !userId || !orgId || !orgName) return
    const sb = supabase()
    const admin = orgRole === 'org:admin'
    let cancelled = false
    const timers: Record<string, ReturnType<typeof setTimeout>> = {}

    ;(async () => {
      // First visit creates the rows; later visits leave what the person already edited.
      await sb.from('profiles').upsert({ id: userId, name: fullName }, { onConflict: 'id', ignoreDuplicates: true })
      await sb.from('workspaces').upsert({ id: orgId, name: orgName }, { onConflict: 'id', ignoreDuplicates: true })
      await sb.from('workspace_members').upsert({ workspace_id: orgId, user_id: userId, role: admin ? 'admin' : 'membro' }, { onConflict: 'workspace_id,user_id' })
      const [{ data: profile }, { data: ws }] = await Promise.all([
        sb.from('profiles').select('name, role, color').eq('id', userId).maybeSingle(),
        sb.from('workspaces').select('id, name, timezone, language').eq('id', orgId).maybeSingle(),
      ])
      if (cancelled) return
      // Clerk holds the workspace's name; the row follows it (renamed in the switcher, for example).
      if (ws && admin && ws.name !== orgName) await sb.from('workspaces').update({ name: orgName }).eq('id', orgId)
      setAccount({ userId, email, workspaceId: orgId, role: admin ? 'admin' : 'membro' })
      void connectDrive({ ws: orgId, user: userId })
      if (profile) updateSettings('profile', { name: profile.name, role: profile.role, color: profile.color }, { fromServer: true })
      updateSettings('workspace', { name: orgName, ...(ws ? { timezone: ws.timezone, language: ws.language } : {}) }, { fromServer: true })

      setRemoteSaver((section, value) => {
        if (section !== 'profile' && section !== 'workspace') return
        clearTimeout(timers[section])
        timers[section] = setTimeout(() => {
          if (section === 'profile') {
            const p = value as Settings['profile']
            void sb.from('profiles').update({ name: p.name, role: p.role, color: p.color }).eq('id', userId)
          } else if (admin) {
            const w = value as Settings['workspace']
            const name = w.name.trim()
            if (!name) return
            if (name !== organization?.name) void organization?.update({ name }).catch(() => undefined)
            void sb.from('workspaces').update({ name, timezone: w.timezone, language: w.language }).eq('id', orgId)
          }
        }, 600)
      })
    })()

    return () => { cancelled = true; setRemoteSaver(null); Object.values(timers).forEach(clearTimeout) }
  }, [isLoaded, userId, orgId, orgRole, orgName]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export function AccountSync() {
  return supabaseConfigured ? <Sync /> : null
}
