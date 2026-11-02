'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AlertTriangle, Check, CircleX, Hash, Lightbulb, Send, Trash2 } from 'lucide-react'
import { folderLabel, liveFiles, liveFolders } from '@/features/spaces/store'
import { useDrive } from '@/features/spaces/hooks'
import { Thumb } from '@/features/spaces/Thumb'
import { NetworkIcon } from './badges'
import { accounts, formatLabel, networkLabel, type Post, type PostFormat, type PostStatus } from './data'
import { checkPost, hashtags, limits, networksOf } from './rules'
import { PostPreview } from './Preview'
import { deletePost, getPosts, newPostId, nowStamp, savePost } from './store'
import s from '@/components/ui.module.css'
import p from './posts.module.css'

/** Next full hour, as the default time to schedule. */
const nextHour = () => { const d = new Date(Date.now() + 3600e3); d.setMinutes(0, 0, 0); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }

export function Composer({ initialFiles, editId }: { initialFiles: string[]; editId?: string }) {
  const router = useRouter()
  const drive = useDrive()
  const files = liveFiles(drive)
  const [editing, setEditing] = useState<Post | null>(null)
  const [chosenFolder, setFolderId] = useState<string | null>(null)
  const [pickedRaw, setPicked] = useState<string[]>(initialFiles)
  // Uploaded files only exist in this browser, so the list is checked on every render, not only on the server.
  const picked = pickedRaw.filter(id => files.some(f => f.id === id))
  const pickedFiles = picked.map(id => files.find(f => f.id === id)!)
  const folderId = chosenFolder ?? files.find(f => f.id === picked[0])?.folderId ?? 'reels'
  const [caption, setCaption] = useState('')
  const [accountIds, setAccountIds] = useState<string[]>(['ig-otto'])
  const [format, setFormat] = useState<PostFormat>('reel')
  const [when, setWhen] = useState<'agora' | 'agendar'>('agora')
  const [date, setDate] = useState('')
  const [toast, setToast] = useState('')

  // Editing: load the post on the client (posts live in this browser).
  useEffect(() => {
    if (!editId) return
    const post = getPosts().find(x => x.id === editId)
    if (!post) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setEditing(post); setPicked(post.fileIds); setCaption(post.caption); setAccountIds(post.accountIds); setFormat(post.format)
    setWhen(post.status === 'agendado' || post.status === 'rascunho' ? 'agendar' : 'agora'); setDate(post.date)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [editId])
  useEffect(() => { if (!date) setDate(nextHour()) }, [date]) // eslint-disable-line react-hooks/set-state-in-effect

  const pool = files.filter(f => f.folderId === folderId && (f.kind === 'video' || f.kind === 'image'))
  const toggle = <T,>(list: T[], v: T) => list.includes(v) ? list.filter(x => x !== v) : [...list, v]
  const issues = checkPost({ caption, accountIds, format, files: pickedFiles })
  const blocked = issues.some(i => i.level === 'erro')
  const nets = networksOf(accountIds)
  const tags = hashtags(caption)
  const ready = picked.length > 0 && accountIds.length > 0 && caption.trim().length > 0 && !blocked
  const published = editing?.status === 'publicado'
  const pastDate = when === 'agendar' && !!date && date < nowStamp()

  function submit(status: PostStatus) {
    const base = editing ?? { id: newPostId() }
    savePost({ ...base, fileIds: picked, caption: caption.trim(), accountIds, format, date: status === 'agendado' || status === 'rascunho' ? date : nowStamp(), status } as Post)
    setToast(status === 'rascunho' ? 'Rascunho salvo.' : status === 'agendado' ? (editing ? 'Agendamento atualizado.' : 'Post agendado.') : 'Post enviado para publicação (demonstração).')
    setTimeout(() => router.push('/posts'), 900)
  }

  return <section className={s.content}>
    <div className={s.pageHead}><div><h1>{editing ? (published ? 'Post publicado' : 'Editar post') : 'Postar'}</h1><p>{published ? 'Este post já foi ao ar. Duplique na tela de posts para publicar de novo.' : 'Escolha os arquivos dos seus spaces, escreva a legenda e publique ou agende.'}</p></div>
      {editing && !published && <button className={s.ghost} onClick={() => { deletePost(editing.id); router.push('/posts') }}><Trash2 size={15} />Excluir post</button>}
    </div>
    <div className={s.composer}>
      <fieldset className={p.fieldset} disabled={published}>
        <div className={`${s.card} ${s.step}`}>
          <span className={s.stepTitle}><i>1</i>Mídia</span>
          <div className={s.row}><select className={s.selectEl} value={folderId ?? ''} onChange={e => setFolderId(e.target.value)} aria-label="Pasta">{liveFolders(drive).map(f => <option key={f.id} value={f.id}>{drive.spaces.find(x => x.id === f.spaceId)?.name} / {folderLabel(drive, f.id)}</option>)}</select><span className={s.muted}>{picked.length ? `${picked.length} selecionado${picked.length > 1 ? 's' : ''}${picked.length > 1 && format === 'feed' ? ' · vira carrossel' : ''}` : 'Selecione um ou mais arquivos'}</span></div>
          {pickedFiles.length > 0 && <div className={p.pickedRow}>{pickedFiles.map((f, i) => <span key={f.id} className={p.picked} title={f.name}><Thumb file={f} showKind={false} className={p.pickedThumb} /><i>{i + 1}</i><button onClick={() => setPicked(picked.filter(x => x !== f.id))} aria-label={`Tirar ${f.name}`}>×</button></span>)}</div>}
          <div className={s.pickGrid}>{pool.map(f => { const on = picked.includes(f.id); return <button key={f.id} className={`${s.pick} ${on ? s.pickOn : ''}`} onClick={() => setPicked(toggle(picked, f.id))} aria-pressed={on} title={f.name}>
            <span className={`${s.check} ${on ? s.checkOn : ''}`} style={{ top: 6, left: 6 }}>{on && <Check size={14} strokeWidth={3} />}</span><Thumb file={f} showKind={false} /><span className={s.pickName}>{f.name}</span>
          </button> })}{!pool.length && <p className={s.muted}>Nenhum vídeo ou imagem nesta pasta.</p>}</div>
        </div>
        <div className={`${s.card} ${s.step}`}>
          <span className={s.stepTitle}><i>2</i>Onde e como</span>
          <div className={s.choices}>{accounts.map(a => { const on = accountIds.includes(a.id); return <button key={a.id} className={`${s.choice} ${on ? s.choiceOn : ''}`} disabled={!a.connected} onClick={() => setAccountIds(toggle(accountIds, a.id))} aria-pressed={on} title={a.connected ? '' : 'Conecte esta conta em Contas'}>
            <NetworkIcon network={a.network} size={24} />{a.handle}<small>{a.connected ? '' : 'não conectada'}</small>
          </button> })}</div>
          <div className={s.choices}>{(['reel', 'story', 'feed'] as const).map(fm => <button key={fm} className={`${s.choice} ${format === fm ? s.choiceOn : ''}`} onClick={() => setFormat(fm)} aria-pressed={format === fm} style={{ paddingLeft: 14 }}>{formatLabel[fm]}</button>)}</div>
        </div>
        <div className={`${s.card} ${s.step}`}>
          <span className={s.stepTitle}><i>3</i>Legenda</span>
          <textarea className={s.textarea} value={caption} onChange={e => setCaption(e.target.value)} placeholder="Escreva a legenda, com emojis e hashtags…" aria-label="Legenda" />
          <div className={p.counters}>
            {nets.map(n => { const l = limits[n], over = caption.length > l.chars; return <span key={n} className={`${p.counterChip} ${over ? p.over : caption.length > l.chars * 0.9 ? p.near : ''}`}><NetworkIcon network={n} size={16} />{caption.length.toLocaleString('pt-BR')}/{l.chars.toLocaleString('pt-BR')}</span> })}
            <span className={`${p.counterChip} ${nets.includes('instagram') && tags.length > 30 ? p.over : ''}`}><Hash size={13} />{tags.length} {tags.length === 1 ? 'hashtag' : 'hashtags'}{nets.includes('instagram') ? ' de 30' : ''}</span>
          </div>
          {tags.length > 0 && <div className={p.tags}>{[...new Set(tags)].map(t => <span key={t}>{t}</span>)}</div>}
        </div>
        <div className={`${s.card} ${s.step}`}>
          <span className={s.stepTitle}><i>4</i>Quando</span>
          <div className={s.row}>
            <div className={s.segment}><button className={when === 'agora' ? s.segOn : ''} onClick={() => setWhen('agora')}>Publicar agora</button><button className={when === 'agendar' ? s.segOn : ''} onClick={() => setWhen('agendar')}>Agendar</button></div>
            {when === 'agendar' && <input className={s.input} type="datetime-local" value={date} onChange={e => setDate(e.target.value)} aria-label="Data e hora" />}
          </div>
          {pastDate && <p className={p.warn}><AlertTriangle size={14} />Essa data já passou. Escolha um horário no futuro.</p>}
          {issues.length > 0 && <ul className={p.issues}>{issues.map(i => <li key={i.text} className={p[`is_${i.level}`]}>{i.level === 'erro' ? <CircleX size={15} /> : i.level === 'aviso' ? <AlertTriangle size={15} /> : <Lightbulb size={15} />}{i.text}</li>)}</ul>}
          <div className={s.row} style={{ justifyContent: 'flex-end' }}>
            <button className={s.secondary} disabled={!picked.length} onClick={() => submit('rascunho')}>{editing?.status === 'rascunho' ? 'Salvar rascunho' : 'Salvar como rascunho'}</button>
            <button className={s.primary} disabled={!ready || pastDate} onClick={() => submit(when === 'agora' ? 'publicado' : 'agendado')}><Send size={15} />{when === 'agora' ? 'Publicar agora' : editing?.status === 'agendado' ? 'Salvar agendamento' : 'Agendar post'}</button>
          </div>
          {!ready && picked.length > 0 && !blocked && <p className={s.muted} style={{ textAlign: 'right' }}>{!caption.trim() ? 'Falta a legenda.' : !accountIds.length ? 'Escolha ao menos uma conta.' : ''}</p>}
        </div>
      </fieldset>
      <aside className={s.preview} aria-label="Prévia">
        <PostPreview files={pickedFiles} caption={caption} accountIds={accountIds} format={format} />
        <p className={s.note}>Prévia aproximada de {nets.length ? nets.map(n => networkLabel[n]).join(' e ') : 'cada rede'}. Nesta versão de demonstração nada é publicado de verdade. <Link href="/contas" className={s.link}>Ver contas</Link></p>
      </aside>
    </div>
    {toast && <div className={s.toast} role="status"><Check size={15} />{toast}</div>}
  </section>
}
