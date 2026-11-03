'use client'

import { OrganizationSwitcher, useClerk } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'
import { CLERK_KEY } from '@/lib/supabase/env'
import { useSignOut } from './session'

/** Workspace picker (Clerk organizations): switch, create, invite and manage members. */
export function WorkspaceSwitcher({ className }: { className?: string }) {
  if (!CLERK_KEY) return null
  return <div className={className} data-tour="workspace">
    <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/" afterCreateOrganizationUrl="/?bemvindo=1"
      appearance={{ elements: { rootBox: { width: '100%' }, organizationSwitcherTrigger: { width: '100%', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '10px' } } }} />
  </div>
}

function ClerkSignOut({ className }: { className?: string }) {
  const signOut = useSignOut()
  return <button type="button" className={className} aria-label="Sair" title="Sair" onClick={() => void signOut()}><LogOut size={17} /></button>
}
export function SignOutButton({ className }: { className?: string }) {
  return CLERK_KEY ? <ClerkSignOut className={className} /> : null
}

function ClerkModalButton({ kind, className, children }: { kind: 'user' | 'organization'; className?: string; children: React.ReactNode }) {
  const clerk = useClerk()
  return <button type="button" className={className} onClick={() => kind === 'user' ? clerk.openUserProfile() : clerk.openOrganizationProfile()}>{children}</button>
}
/** E-mail, password, connected logins, sessions and deleting the account (Clerk's account screen). */
export function ManageAccountButton({ className, fallback }: { className?: string; fallback: React.ReactNode }) {
  return CLERK_KEY ? <ClerkModalButton kind="user" className={className}>Gerenciar conta</ClerkModalButton> : <>{fallback}</>
}
/** Members, invitations and roles of the active workspace (Clerk's organization screen). */
export function ManageMembersButton({ className, fallback }: { className?: string; fallback: React.ReactNode }) {
  return CLERK_KEY ? <ClerkModalButton kind="organization" className={className}>Membros e convites</ClerkModalButton> : <>{fallback}</>
}
