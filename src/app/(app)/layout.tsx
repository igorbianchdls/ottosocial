import { Sidebar } from '@/components/Sidebar'
import { CommandPalette } from '@/components/CommandPalette'
import { ThemeSync } from '@/features/settings/ThemeSync'
import { Tour } from '@/components/Tour'
import { AccountSync } from '@/features/auth/AccountSync'
import s from '@/components/ui.module.css'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className={s.shell}><Sidebar /><div className={s.main}>{children}</div><CommandPalette /><ThemeSync /><Tour /><AccountSync /></div>
}
