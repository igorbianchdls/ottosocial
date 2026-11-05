import type { Metadata } from 'next'
import { Bebas_Neue, Caveat, DM_Serif_Display, Geist, Geist_Mono, Instrument_Sans, Instrument_Serif } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { clerkPtBR } from '@/features/auth/localization'
import { CLERK_KEY } from '@/lib/supabase/env'
import './globals.css'

// The app's type: a refined grotesque for the interface and an editorial serif for titles.
const ui = Instrument_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-ui' })
const display = Instrument_Serif({ subsets: ['latin', 'latin-ext'], weight: '400', style: ['normal', 'italic'], variable: '--font-display' })
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
  variables: { colorPrimary: '#1c1915', colorDanger: '#b93a2b', colorText: '#1c1915', colorTextSecondary: '#8e867b', colorBackground: '#fbf9f5', colorInputBackground: '#ffffff', fontFamily: 'var(--font-ui), system-ui, sans-serif', borderRadius: '8px' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR" className={`${ui.variable} ${display.variable} ${geist.variable} ${geistMono.variable} ${bebas.variable} ${dmSerif.variable} ${caveat.variable}`}>
    <body>
      {CLERK_KEY
        ? <ClerkProvider localization={clerkPtBR} appearance={appearance} signInUrl="/login" signUpUrl="/cadastro" afterSignOutUrl="/login"
            signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/" taskUrls={{ 'choose-organization': '/workspace' }}>{children}</ClerkProvider>
        : children}
    </body>
  </html>
}
