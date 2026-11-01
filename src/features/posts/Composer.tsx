'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, Heart, MessageCircle, Send, Share2 } from 'lucide-react'
import { files, folders } from '@/features/drive/data'
import { Thumb } from '@/features/drive/Thumb'
import { NetworkIcon } from './badges'
import { accounts, formatLabel, type PostFormat } from './data'
import { usePosts } from './store'
import s from '@/components/ui.module.css'

const MAX = 2200

export function Composer({ initialFiles }: { initialFiles: string[] }) {
  const router = useRouter()
  const { posts, save } = usePosts()
  const [folderId, setFolderId] = useState(files.find(f => f.id === initialFiles[0])?.folderId ?? 'reels')
  const [picked, setPicked] = useState<string[]>(initialFiles.filter(id => files.some(f => f.id === id)))
  const [caption, setCaption] = useState('')
  const [accountIds, setAccountIds] = useState<string[]>(['ig-otto'])
  const [format, setFormat] = useState<PostFormat>('reel')
  const [when, setWhen] = useState<'agora' | 'agendar'>('agora')
  const [date, setDate] = useState('2026-11-02T12:00')
  const [toast, setToast] = useState('')
  const pool = files.filter(f => f.folderId === folderId && f.kind !== 'text')
  const first = files.find(f => f.id === picked[0])
  const account = accounts.find(a => a.id === accountIds[0])
  const toggle = <T,>(list: T[], v: T) => list.includes(v) ? list.filter(x => x !== v) : [...list, v]
  const ready = picked.length > 0 && accountIds.length > 0 && caption.trim().length > 0

  function submit(status: 'agendado' | 'publicado' | 'rascunho') {
    const now = new Date()
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    save([...posts, { id: `p${Date.now()}`, fileIds: picked, caption: caption.trim(), accountIds, format, date: status === 'agendado' ? date : iso, status }])
    setToast(status === 'rascunho' ? 'Rascunho salvo.' : status === 'agendado' ? 'Post agendado.' : 'Post enviado para publicação (demonstração).')
    setTimeout(() => router.push('/posts'), 900)
  }

  return <section className={s.content}>
    <div className={s.pageHead}><div><h1>Postar</h1><p>Escolha os arquivos do seu drive, escreva a legenda e publique ou agende.</p></div></div>
    <div className={s.composer}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className={`${s.card} ${s.step}`}>
          <span className={s.stepTitle}><i>1</i>Mídia</span>
          <div className={s.row}><select className={s.selectEl} value={folderId} onChange={e => setFolderId(e.target.value)} aria-label="Pasta">{folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select><span className={s.muted}>{picked.length ? `${picked.length} selecionado${picked.length > 1 ? 's' : ''}${picked.length > 1 ? ' · vira carrossel' : ''}` : 'Selecione um ou mais arquivos'}</span></div>
          <div className={s.pickGrid}>{pool.map(f => { const on = picked.includes(f.id); return <button key={f.id} className={`${s.pick} ${on ? s.pickOn : ''}`} onClick={() => setPicked(toggle(picked, f.id))} aria-pressed={on} title={f.name}>
            <span className={`${s.check} ${on ? s.checkOn : ''}`} style={{ top: 6, left: 6 }}>{on && <Check size={14} strokeWidth={3} />}</span><Thumb file={f} showKind={false} /><span className={s.pickName}>{f.name}</span>
          </button> })}</div>
        </div>
        <div className={`${s.card} ${s.step}`}>
          <span className={s.stepTitle}><i>2</i>Legenda</span>
          <textarea className={s.textarea} value={caption} maxLength={MAX} onChange={e => setCaption(e.target.value)} placeholder="Escreva a legenda, com emojis e hashtags…" aria-label="Legenda" />
          <span className={s.counter}>{caption.length}/{MAX}</span>
        </div>
        <div className={`${s.card} ${s.step}`}>
          <span className={s.stepTitle}><i>3</i>Onde publicar</span>
          <div className={s.choices}>{accounts.map(a => { const on = accountIds.includes(a.id); return <button key={a.id} className={`${s.choice} ${on ? s.choiceOn : ''}`} disabled={!a.connected} onClick={() => setAccountIds(toggle(accountIds, a.id))} aria-pressed={on} title={a.connected ? '' : 'Conecte esta conta em Contas'}>
            <NetworkIcon network={a.network} size={24} />{a.handle}<small>{a.connected ? '' : 'não conectada'}</small>
          </button> })}</div>
          <div className={s.choices}>{(['reel', 'story', 'feed'] as const).map(fm => <button key={fm} className={`${s.choice} ${format === fm ? s.choiceOn : ''}`} onClick={() => setFormat(fm)} aria-pressed={format === fm} style={{ paddingLeft: 14 }}>{formatLabel[fm]}</button>)}</div>
        </div>
        <div className={`${s.card} ${s.step}`}>
          <span className={s.stepTitle}><i>4</i>Quando</span>
          <div className={s.row}>
            <div className={s.segment}><button className={when === 'agora' ? s.segOn : ''} onClick={() => setWhen('agora')}>Publicar agora</button><button className={when === 'agendar' ? s.segOn : ''} onClick={() => setWhen('agendar')}>Agendar</button></div>
            {when === 'agendar' && <input className={s.input} type="datetime-local" value={date} onChange={e => setDate(e.target.value)} aria-label="Data e hora" />}
          </div>
          <div className={s.row} style={{ justifyContent: 'flex-end' }}>
            <button className={s.secondary} disabled={!picked.length} onClick={() => submit('rascunho')}>Salvar rascunho</button>
            <button className={s.primary} disabled={!ready} onClick={() => submit(when === 'agora' ? 'publicado' : 'agendado')}><Send size={15} />{when === 'agora' ? 'Publicar agora' : 'Agendar post'}</button>
          </div>
        </div>
      </div>
      <aside className={s.preview} aria-label="Prévia">
        <div className={s.phone}><div className={s.phoneScreen}>
          {first ? <Thumb file={{ ...first, duration: undefined }} showKind={false} /> : null}
          <span className={s.phoneTop}>{format === 'story' ? 'Story' : format === 'feed' ? 'Publicação' : 'Reels'}</span>
          <div className={s.phoneSide}><span><Heart size={22} />0</span><span><MessageCircle size={22} />0</span><span><Share2 size={22} /></span></div>
          <div className={s.phoneCaption}>{account && <b>{account.handle}</b>}<p>{caption || 'A legenda aparece aqui.'}</p></div>
        </div></div>
        <p className={s.note}>Prévia aproximada. Nesta versão de demonstração nada é publicado de verdade. <Link href="/contas" className={s.link}>Ver contas</Link></p>
      </aside>
    </div>
    {toast && <div className={s.toast} role="status"><Check size={15} />{toast}</div>}
  </section>
}
