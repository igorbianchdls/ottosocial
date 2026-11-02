import Link from 'next/link'
import { CalendarClock, Check, Clapperboard, FolderClosed, Heart, MessageCircle, Send, Sparkles } from 'lucide-react'
import a from './auth.module.css'

/** Form on the left, a picture of the product on the right (hidden on phones). */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return <main className={a.page}>
    <section className={a.formSide}>
      <Link href="/apresentacao" className={a.logo}><span><Sparkles size={17} /></span>OttoSocial</Link>
      <div className={a.formWrap}>{children}</div>
      <p className={a.legal}>Ao continuar, você concorda com os <a href="#termos">Termos de uso</a> e a <a href="#privacidade">Política de privacidade</a>.</p>
    </section>
    <aside className={a.showcase} aria-hidden>
      <div className={a.glow} />
      <div className={a.copy}>
        <h2>Seus vídeos, organizados.<br />Seus posts, no ar.</h2>
        <ul>
          <li><FolderClosed size={16} />Spaces para guardar tudo de cada marca</li>
          <li><Clapperboard size={16} />Editor de vídeo com IA</li>
          <li><CalendarClock size={16} />Agende no Instagram e no TikTok</li>
          <li><Sparkles size={16} />Peça pelo ChatGPT ou pelo Claude</li>
        </ul>
      </div>
      <div className={a.stage}>
        <div className={a.phone}>
          <div className={a.reel}>
            <span className={a.reelTop}>Reels</span>
            <b className={a.reelTitle}>Emite a nota sem sair do ChatGPT</b>
            <span className={a.reelSide}><Heart size={18} />4,8 mil<MessageCircle size={18} />87<Send size={18} /></span>
            <span className={a.reelUser}><i>O</i>otto.erp</span>
          </div>
        </div>
        <div className={`${a.float} ${a.cal}`}>
          <small>Esta semana</small>
          {[['Seg', '19:00', 'Reel'], ['Qua', '12:30', 'Feed'], ['Sex', '18:00', 'Story']].map(([d, h, f]) => <span key={d}><b>{d}</b>{h} · {f}</span>)}
        </div>
        <div className={`${a.float} ${a.toast}`}><span><Check size={14} /></span>Reel publicado no @otto.erp</div>
        <div className={`${a.float} ${a.stat}`}><small>Visualizações</small><b>25,4 mil</b><i><em style={{ height: '40%' }} /><em style={{ height: '65%' }} /><em style={{ height: '50%' }} /><em style={{ height: '90%' }} /><em style={{ height: '72%' }} /></i></div>
      </div>
    </aside>
  </main>
}
