import { AuthShell } from '@/features/auth/AuthShell'
import { NewPasswordForm } from '@/features/auth/forms'

export const metadata = { title: 'Senha nova · OttoSocial' }

export default function NovaSenhaPage() {
  return <AuthShell><NewPasswordForm /></AuthShell>
}
