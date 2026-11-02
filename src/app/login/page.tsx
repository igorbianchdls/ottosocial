import { AuthShell } from '@/features/auth/AuthShell'
import { LoginForm } from '@/features/auth/forms'

export const metadata = { title: 'Entrar · OttoSocial' }

export default function LoginPage() {
  return <AuthShell><LoginForm /></AuthShell>
}
