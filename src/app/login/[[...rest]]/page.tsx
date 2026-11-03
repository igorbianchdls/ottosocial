import { SignIn } from '@clerk/nextjs'
import { AuthShell } from '@/features/auth/AuthShell'
import { embedded } from '@/features/auth/clerkLook'

export const metadata = { title: 'Entrar · OttoSocial' }

export default function LoginPage() {
  return <AuthShell><SignIn routing="path" path="/login" signUpUrl="/cadastro" appearance={embedded} /></AuthShell>
}
