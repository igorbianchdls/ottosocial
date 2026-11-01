import { FileText, Film, Image as ImageIcon } from 'lucide-react'
import { formatDuration } from '@/lib/format'
import type { MediaFile } from './data'
import s from '@/components/ui.module.css'

/** Placeholder thumbnail until real files come from storage. */
export function Thumb({ file, className, showKind = true }: { file: MediaFile; className?: string; showKind?: boolean }) {
  const Icon = file.kind === 'video' ? Film : file.kind === 'image' ? ImageIcon : FileText
  const ext = file.name.split('.').pop()
  return <span className={`${s.thumb} ${file.kind === 'text' ? s.thumbText : s[`thumb_${file.tone}`]} ${className ?? ''}`} role="img" aria-label={file.name}>
    <Icon size={26} strokeWidth={1.5} />
    {showKind && <i className={s.thumbKind}>{ext}</i>}
    {file.duration !== undefined && <i className={s.thumbBadge}>{formatDuration(file.duration)}</i>}
  </span>
}
