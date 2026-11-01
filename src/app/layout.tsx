import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'OttoSocial',
  description: 'Seus spaces de mídias e a publicação nas redes sociais em um só lugar.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR" className={geist.variable}><body>{children}</body></html>
}
