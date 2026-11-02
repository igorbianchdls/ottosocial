import { AuthShell } from '@/features/auth/AuthShell'
import { LoginForm } from '@/features/auth/forms'

export const metadata = { title: 'Entrar · OttoSocial' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const { next, erro } = await searchParams
  return <AuthShell><LoginForm next={next} linkError={erro === 'link'} /></AuthShell>
}
