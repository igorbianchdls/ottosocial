'use client'

// First-visit tour: highlights the main parts of the menu, one at a time.
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { X } from 'lucide-react'
import t from './tour.module.css'

const KEY = 'ottosocial-tour-v1'
export const TOUR_EVENT = 'ottosocial:tour'
export const startTour = () => { try { localStorage.removeItem(KEY) } catch { /* ignore */ } window.dispatchEvent(new Event(TOUR_EVENT)) }

const steps = [
  { target: 'busca', title: 'Busque em tudo', text: 'Arquivos, pastas, posts e projetos de todos os spaces. Atalho: Ctrl+K.' },
  { target: 'spaces', title: 'Seus arquivos ficam nos Spaces', text: 'Um space por marca, com pastas, prévia dos vídeos, lixeira e favoritos. Arraste arquivos do computador para enviar.' },
  { target: 'editor', title: 'Edite seus vídeos', text: 'Linha do tempo estilo CapCut, legendas, textos animados e um chat de IA que edita por você.' },
  { target: 'postar', title: 'Publique ou agende', text: 'Escolha os arquivos, escreva a legenda e veja a prévia no Instagram e no TikTok antes de publicar.' },
  { target: 'posts', title: 'Seu calendário', text: 'Veja a semana ou o mês e arraste um post para outro dia para reagendar.' },
]

export function Tour() {
  const [step, setStep] = useState<number | null>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const open = () => { if (window.matchMedia('(min-width: 961px)').matches) setStep(0) }
    let seen = true
    try { seen = localStorage.getItem(KEY) === 'done' } catch { /* storage blocked: skip the tour */ }
    // Wait a moment so the first screen has painted before the tour shows up.
    const timer = seen ? undefined : setTimeout(open, 900)
    window.addEventListener(TOUR_EVENT, open)
    return () => { clearTimeout(timer); window.removeEventListener(TOUR_EVENT, open) }
  }, [])

  const measure = useCallback(() => {
    if (step === null) return
    const el = document.querySelector(`[data-tour="${steps[step].target}"]`)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [step])
  useLayoutEffect(() => {
    measure() // eslint-disable-line react-hooks/set-state-in-effect
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  const close = () => { setStep(null); try { localStorage.setItem(KEY, 'done') } catch { /* ignore */ } }
  useEffect(() => {
    if (step === null) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight' || e.key === 'Enter') { if (step < steps.length - 1) setStep(step + 1); else close() }
      if (e.key === 'ArrowLeft' && step > 0) setStep(step - 1)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [step])

  if (step === null || !rect) return null
  const s = steps[step], last = step === steps.length - 1
  const top = Math.min(Math.max(16, rect.top - 10), window.innerHeight - 220)
  return <div className={t.layer} role="dialog" aria-modal="true" aria-label="Tour do OttoSocial">
    <span className={t.spot} style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />
    <div className={t.card} style={{ left: rect.right + 22, top }}>
      <i className={t.arrow} style={{ top: Math.max(14, rect.top + rect.height / 2 - top - 7) }} />
      <button className={t.close} onClick={close} aria-label="Fechar tour"><X size={16} /></button>
      <small>{step + 1} de {steps.length}</small>
      <b>{s.title}</b>
      <p>{s.text}</p>
      <div className={t.foot}>
        <span className={t.dots}>{steps.map((_, i) => <i key={i} className={i === step ? t.dotOn : ''} />)}</span>
        {step > 0 && <button className={t.back} onClick={() => setStep(step - 1)}>Voltar</button>}
        <button className={t.next} onClick={() => last ? close() : setStep(step + 1)}>{last ? 'Começar' : 'Próximo'}</button>
      </div>
    </div>
  </div>
}
