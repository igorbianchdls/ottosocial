import type { Metadata } from 'next'
import { Bebas_Neue, Caveat, DM_Serif_Display, Geist, Geist_Mono } from 'next/font/google'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR" className={`${geist.variable} ${geistMono.variable} ${bebas.variable} ${dmSerif.variable} ${caveat.variable}`}><body>{children}</body></html>
}
