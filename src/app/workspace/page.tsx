import { TaskChooseOrganization } from '@clerk/nextjs'
import { AuthShell } from '@/features/auth/AuthShell'
import { embedded } from '@/features/auth/clerkLook'

export const metadata = { title: 'Seu workspace · OttoSocial' }

/** After sign-up (or when someone has no workspace yet): create one or pick one of their invitations. */
export default function WorkspacePage() {
  return <AuthShell><TaskChooseOrganization redirectUrlComplete="/?bemvindo=1" appearance={embedded} /></AuthShell>
}
