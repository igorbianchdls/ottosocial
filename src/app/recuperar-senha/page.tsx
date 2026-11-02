import { AuthShell } from '@/features/auth/AuthShell'
import { RecoverForm } from '@/features/auth/forms'

export const metadata = { title: 'Recuperar senha · OttoSocial' }

export default function RecuperarSenhaPage() {
  return <AuthShell><RecoverForm /></AuthShell>
}
