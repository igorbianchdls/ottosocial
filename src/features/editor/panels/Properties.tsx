'use client'

import { Copy, Scissors, Trash2 } from 'lucide-react'
import { media } from '../project/data'
import { clipEnd, findClip, maxDuration, mapClip, projectDuration, updateProps } from '../project/ops'
import { FPS, kindLabel, type Box, type ClipProps, type Format, type Project } from '../project/types'
import { kindIcon, timecode } from '../timeline/Timeline'
import e from '../editor.module.css'

type Props = {
  project: Project; selectedId: string | null
  apply: (fn: (p: Project) => Project, key?: string) => void
  onDuplicate: () => void; onSplit: () => void; onDelete: () => void
}

const textColors = ['#ffffff', '#111827', '#facc15', '#3b82f6', '#f43f5e', '#22c55e']
const backgrounds: (string | undefined)[] = [undefined, '#111827', '#ffffff', '#facc15', 'rgba(17,24,39,.75)']
const fills = ['#3b82f6', '#f43f5e', '#22c55e', '#facc15', '#111827', '#ffffff']
const canvasColors = ['#0b0d12', '#ffffff', '#f4f1ea', '#1e3a8a', '#7c2d12']

const sec = (frames: number) => Math.round(frames / FPS * 10) / 10

export function Properties({ project, selectedId, apply, onDuplicate, onSplit, onDelete }: Props) {
  const found = findClip(project, selectedId)
  if (!found) return <ProjectProps project={project} apply={apply} />
  const { clip, track } = found
  const p = clip.props
  const set = (patch: Partial<ClipProps>, key: string) => apply(pr => updateProps(pr, clip.id, patch), `${clip.id}:${key}`)
  const Icon = kindIcon[track.kind]
  const m = media(p.fileId)
  const isText = track.kind === 'texto' || track.kind === 'legenda'
  return <aside className={e.props}>
    <div className={e.propsHead}><Icon size={16} /><b>{kindLabel[track.kind]}</b></div>
    {m && <div className={e.fileInfo}><b>{m.name}</b><small>{track.kind === 'imagem' ? 'Imagem' : `Trecho ${timecode(clip.trimStart)} – ${timecode(clip.trimStart + clip.duration)}`}</small></div>}

    {isText && <Field label="Texto"><textarea rows={3} value={p.text ?? ''} onChange={ev => set({ text: ev.target.value }, 'text')} /></Field>}

    <div className={e.two}>
      <Field label="Início (s)"><input type="number" step={0.1} min={0} value={sec(clip.start)} onChange={ev => apply(pr => mapClip(pr, clip.id, c => ({ ...c, start: Math.max(0, Math.round(+ev.target.value * FPS)) })), `${clip.id}:start`)} /></Field>
      <Field label="Duração (s)"><input type="number" step={0.1} min={0.2} value={sec(clip.duration)} onChange={ev => apply(pr => mapClip(pr, clip.id, c => ({ ...c, duration: Math.max(5, Math.min(maxDuration(track.kind, c), Math.round(+ev.target.value * FPS))) })), `${clip.id}:dur`)} /></Field>
    </div>

    {track.kind === 'texto' && <>
      <Field label={`Tamanho · ${p.fontSize ?? 64}`}><input type="range" min={24} max={160} value={p.fontSize ?? 64} onChange={ev => set({ fontSize: +ev.target.value }, 'size')} /></Field>
      <div className={e.two}>
        <Field label="Peso"><select value={p.weight ?? 800} onChange={ev => set({ weight: +ev.target.value as 400 | 600 | 800 }, 'weight')}><option value={400}>Normal</option><option value={600}>Médio</option><option value={800}>Negrito</option></select></Field>
        <Field label="Animação"><select value={p.anim ?? 'nenhuma'} onChange={ev => set({ anim: ev.target.value as ClipProps['anim'] }, 'anim')}><option value="pop">Pop</option><option value="surgir">Surgir</option><option value="digitar">Digitando</option><option value="nenhuma">Nenhuma</option></select></Field>
      </div>
      <Field label="Alinhamento"><div className={e.seg}>{(['left', 'center', 'right'] as const).map(a => <button key={a} className={(p.align ?? 'center') === a ? e.segOn : ''} onClick={() => set({ align: a }, 'align')}>{a === 'left' ? 'Esquerda' : a === 'center' ? 'Centro' : 'Direita'}</button>)}</div></Field>
      <Field label="Cor do texto"><Swatches colors={textColors} value={p.color} onPick={c => set({ color: c }, 'color')} /></Field>
      <Field label="Fundo"><Swatches colors={backgrounds} value={p.bg} onPick={c => set({ bg: c }, 'bg')} /></Field>
    </>}

    {track.kind === 'legenda' && <Field label="Estilo"><div className={e.seg}>{(['amarela', 'branca', 'caixa'] as const).map(s => <button key={s} className={(p.captionStyle ?? 'amarela') === s ? e.segOn : ''} onClick={() => set({ captionStyle: s }, 'cap')}>{s[0].toUpperCase() + s.slice(1)}</button>)}</div></Field>}

    {track.kind === 'forma' && <>
      <Field label="Forma"><div className={e.seg}>{(['retangulo', 'circulo'] as const).map(s => <button key={s} className={(p.shape ?? 'retangulo') === s ? e.segOn : ''} onClick={() => set({ shape: s }, 'shape')}>{s === 'retangulo' ? 'Retângulo' : 'Círculo'}</button>)}</div></Field>
      <Field label="Cor"><Swatches colors={fills} value={p.bg} onPick={c => set({ bg: c }, 'fill')} /></Field>
      {p.shape !== 'circulo' && <Field label={`Cantos · ${p.radius ?? 0}`}><input type="range" min={0} max={120} value={p.radius ?? 0} onChange={ev => set({ radius: +ev.target.value }, 'radius')} /></Field>}
    </>}

    {(track.kind === 'video' || track.kind === 'imagem' || track.kind === 'forma') && <Field label={`Opacidade · ${Math.round((p.opacity ?? 1) * 100)}%`}><input type="range" min={0} max={100} value={Math.round((p.opacity ?? 1) * 100)} onChange={ev => set({ opacity: +ev.target.value / 100 }, 'opacity')} /></Field>}
    {(track.kind === 'video' || track.kind === 'audio') && <Field label={`Volume · ${Math.round((p.volume ?? 1) * 100)}%`}><input type="range" min={0} max={100} value={Math.round((p.volume ?? 1) * 100)} onChange={ev => set({ volume: +ev.target.value / 100 }, 'volume')} /></Field>}

    {p.box && <Field label="Posição e tamanho (%)"><div className={e.four}>{(['x', 'y', 'w', 'h'] as const).map(k => <label key={k}><span>{k === 'w' ? 'L' : k === 'h' ? 'A' : k.toUpperCase()}</span><input type="number" step={1} value={p.box![k]} onChange={ev => set({ box: { ...p.box!, [k]: +ev.target.value } as Box }, `box${k}`)} /></label>)}</div></Field>}

    <div className={e.actions}>
      <button className={e.action} onClick={onSplit}><Scissors size={15} />Dividir</button>
      <button className={e.action} onClick={onDuplicate}><Copy size={15} />Duplicar</button>
      <button className={`${e.action} ${e.danger}`} onClick={onDelete}><Trash2 size={15} />Excluir</button>
    </div>
    <p className={e.hint}>De {timecode(clip.start)} até {timecode(clipEnd(clip))}</p>
  </aside>
}

function ProjectProps({ project, apply }: { project: Project; apply: Props['apply'] }) {
  const clips = project.tracks.reduce((n, t) => n + t.clips.length, 0)
  return <aside className={e.props}>
    <div className={e.propsHead}><b>Projeto</b></div>
    <Field label="Nome"><input value={project.name} onChange={ev => apply(p => ({ ...p, name: ev.target.value }), 'name')} /></Field>
    <Field label="Formato"><div className={e.seg}>{(['9:16', '1:1', '16:9'] as Format[]).map(f => <button key={f} className={project.format === f ? e.segOn : ''} onClick={() => apply(p => ({ ...p, format: f }))}>{f}</button>)}</div></Field>
    <Field label="Cor de fundo"><Swatches colors={canvasColors} value={project.background} onPick={c => apply(p => ({ ...p, background: c ?? '#0b0d12' }), 'bgc')} /></Field>
    <div className={e.stats}><span>Duração<b>{timecode(projectDuration(project))}</b></span><span>Faixas<b>{project.tracks.length}</b></span><span>Clipes<b>{clips}</b></span></div>
    <div className={e.shortcuts}>
      <b>Atalhos</b>
      <span><kbd>Espaço</kbd>Tocar / pausar</span>
      <span><kbd>← →</kbd>1 quadro (Shift: 1 s)</span>
      <span><kbd>S</kbd>Dividir na agulha</span>
      <span><kbd>Delete</kbd>Excluir clipe</span>
      <span><kbd>Ctrl D</kbd>Duplicar</span>
      <span><kbd>Ctrl Z</kbd>Desfazer · <kbd>Ctrl ⇧ Z</kbd>Refazer</span>
    </div>
    <p className={e.hint}>Clique num clipe na linha do tempo ou direto no vídeo para editar.</p>
  </aside>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className={e.field}><span>{label}</span>{children}</div>
}

function Swatches({ colors, value, onPick }: { colors: (string | undefined)[]; value?: string; onPick: (c: string | undefined) => void }) {
  return <div className={e.swatches}>{colors.map(c => <button key={c ?? 'none'} className={`${e.swatch} ${value === c ? e.swatchOn : ''} ${c ? '' : e.swatchNone}`} style={{ background: c }} onClick={() => onPick(c)} aria-label={c ?? 'Sem fundo'} />)}
    <label className={e.swatchPick} aria-label="Outra cor"><input type="color" value={value && value.startsWith('#') ? value : '#ffffff'} onChange={ev => onPick(ev.target.value)} /></label>
  </div>
}
