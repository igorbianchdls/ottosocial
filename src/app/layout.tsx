import type { Metadata } from 'next'
import { Bebas_Neue, Caveat, DM_Serif_Display, Geist, Geist_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { ptBR } from '@clerk/localizations'
import { CLERK_KEY } from '@/lib/supabase/env'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
// Fonts offered for text in the video editor.
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-bebas' })
const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--font-dm-serif' })
const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat' })

export const metadata: Metadata = {
  title: 'OttoSocial',
  description: 'Seus spaces de mídias e a publicação nas redes sociais em um só lugar.',
}

/** Clerk's screens in Portuguese, with the app's font, colors and corners. */
const appearance = {
  variables: { colorPrimary: '#111111', colorDanger: '#e5484d', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', borderRadius: '10px' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR" className={`${geist.variable} ${geistMono.variable} ${bebas.variable} ${dmSerif.variable} ${caveat.variable}`}>
    <body>
      {CLERK_KEY
        ? <ClerkProvider localization={ptBR} appearance={appearance} signInUrl="/login" signUpUrl="/cadastro" afterSignOutUrl="/login"
            signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/" taskUrls={{ 'choose-organization': '/workspace' }}>{children}</ClerkProvider>
        : children}
    </body>
  </html>
}
