import { AuthShell } from '@/features/auth/AuthShell'
import { SignupFlow } from '@/features/auth/forms'

export const metadata = { title: 'Criar conta · OttoSocial' }

export default function CadastroPage() {
  return <AuthShell><SignupFlow /></AuthShell>
}
