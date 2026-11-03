import { SignUp } from '@clerk/nextjs'
import { AuthShell } from '@/features/auth/AuthShell'
import { embedded } from '@/features/auth/clerkLook'

export const metadata = { title: 'Criar conta · OttoSocial' }

export default function CadastroPage() {
  return <AuthShell><SignUp routing="path" path="/cadastro" signInUrl="/login" appearance={embedded} /></AuthShell>
}
