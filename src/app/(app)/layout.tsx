import { Sidebar } from '@/components/Sidebar'
import { CommandPalette } from '@/components/CommandPalette'
import s from '@/components/ui.module.css'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className={s.shell}><Sidebar /><div className={s.main}>{children}</div><CommandPalette /></div>
}
