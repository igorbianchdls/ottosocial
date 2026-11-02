import Link from 'next/link'
import {
  ArrowRight, Bell, CalendarClock, Captions, Check, Clapperboard, FolderClosed, Heart, Instagram, MessageCircle, Play, Scissors,
  Search, Send, Sparkles, Star, Type, Upload, Wand2,
} from 'lucide-react'
import { TikTokIcon } from '@/features/posts/badges'
import l from './landing.module.css'

const features = [
  { Icon: FolderClosed, title: 'Spaces para cada marca', text: 'Pastas no estilo Google Drive, prévia dos vídeos, busca, favoritos e lixeira. Arraste do computador e pronto.' },
  { Icon: Clapperboard, title: 'Editor de vídeo', text: 'Linha do tempo estilo CapCut: cortar, dividir, textos animados, legendas, keyframes, transições e trilha.' },
  { Icon: Wand2, title: 'IA que edita por você', text: '“Corta as pausas”, “põe legenda amarela”, “deixa com 30 segundos”. Tudo continua editável à mão.' },
  { Icon: CalendarClock, title: 'Agendamento visual', text: 'Calendário de semana e mês. Arraste um post para outro dia e ele é reagendado.' },
  { Icon: Send, title: 'Prévia em cada rede', text: 'Veja como fica no Reels, Feed, Story e TikTok, com contador de caracteres e avisos antes de publicar.' },
  { Icon: Sparkles, title: 'Plugin do ChatGPT e do Claude', text: 'Peça pelo chat: buscar arquivos, sugerir legenda, agendar. Publicar sempre passa por você.' },
]

const plans = [
  { name: 'Grátis', price: 'R$ 0', per: 'para sempre', text: 'Para testar com uma marca.', items: ['1 space', '2 GB de arquivos', '10 posts agendados por mês', 'Editor com marca d’água'], cta: 'Começar grátis' },
  { name: 'Pro', price: 'R$ 49', per: 'por mês', text: 'Para quem publica toda semana.', items: ['Spaces ilimitados', '50 GB de arquivos', 'Posts ilimitados', 'Editor sem marca d’água e com IA', 'Plugin do ChatGPT e do Claude'], cta: 'Assinar o Pro', featured: true },
  { name: 'Agência', price: 'R$ 149', per: 'por mês', text: 'Para várias marcas e equipe.', items: ['Tudo do Pro', '200 GB de arquivos', 'Até 10 pessoas', 'Aprovação de posts', 'Suporte prioritário'], cta: 'Falar com a gente' },
]

const faq = [
  ['Preciso instalar alguma coisa?', 'Não. O OttoSocial funciona no navegador, no computador e no celular.'],
  ['Em quais redes dá para publicar?', 'Instagram (Reels, Feed e Stories) e TikTok. LinkedIn e YouTube Shorts vêm em seguida.'],
  ['A IA publica sozinha?', 'Não. A IA pode buscar arquivos, editar e preparar posts, mas publicar e agendar sempre pedem a sua confirmação.'],
  ['Meus vídeos ficam seguros?', 'Os arquivos ficam no seu workspace, e só quem você convidar tem acesso.'],
  ['Posso cancelar quando quiser?', 'Sim. Sem fidelidade: você cancela e continua no plano grátis.'],
]

export function LandingView() {
  return <div className={l.page}>
    <header className={l.nav}>
      <Link href="/apresentacao" className={l.logo}><span><Sparkles size={16} /></span>OttoSocial</Link>
      <nav className={l.links}><a href="#recursos">Recursos</a><a href="#como">Como funciona</a><a href="#plugin">Plugin</a><a href="#precos">Preços</a><a href="#perguntas">Perguntas</a></nav>
      <div className={l.navActions}><Link href="/login" className={l.ghost}>Entrar</Link><Link href="/cadastro" className={l.cta}>Criar conta grátis</Link></div>
    </header>

    <section className={l.hero}>
      <span className={l.badge}><Sparkles size={14} />Novo: edite vídeos conversando com a IA</span>
      <h1>Seus vídeos organizados.<br /><em>Seus posts no ar.</em></h1>
      <p>Guarde os arquivos de cada marca, edite os vídeos e publique ou agende no Instagram e no TikTok. Tudo em um lugar, e com a ajuda do ChatGPT e do Claude.</p>
      <div className={l.heroActions}><Link href="/cadastro" className={l.ctaBig}>Criar conta grátis<ArrowRight size={18} /></Link><a href="#como" className={l.ghostBig}><Play size={16} />Ver como funciona</a></div>
      <small className={l.fine}>Sem cartão de crédito · Pronto em 1 minuto</small>
      <AppMock />
    </section>

    <section className={l.works}><span>Publica e conversa com</span>
      <b><i className={l.ig}><Instagram size={16} /></i>Instagram</b>
      <b><i className={l.tt}><TikTokIcon size={15} /></i>TikTok</b>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <b><img src="/logos/chatgpt.svg" alt="" className={l.brandLogo} />ChatGPT</b>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <b><img src="/logos/claude.svg" alt="" className={l.brandLogo} />Claude</b>
    </section>

    <section id="recursos" className={l.section}>
      <h2>Tudo o que um vídeo precisa até chegar no feed</h2>
      <p className={l.lead}>Do arquivo bruto ao post publicado, sem trocar de ferramenta.</p>
      <div className={l.features}>{features.map(f => <article key={f.title}><span><f.Icon size={20} /></span><b>{f.title}</b><p>{f.text}</p></article>)}</div>
    </section>

    <section id="como" className={`${l.section} ${l.soft}`}>
      <h2>Como funciona</h2>
      <div className={l.steps}>
        {[[Upload, 'Envie para um space', 'Arraste os vídeos e imagens do computador. Cada marca tem o seu space, com pastas.'], [Scissors, 'Edite ou peça para a IA', 'Corte, coloque legenda e título, ou peça no chat. O vídeo final sai em MP4.'], [CalendarClock, 'Publique ou agende', 'Escolha as contas, revise a prévia e publique agora ou no melhor horário.']].map(([Icon, title, text], i) => {
          const I = Icon as typeof Upload
          return <article key={title as string}><i>{i + 1}</i><span><I size={22} /></span><b>{title as string}</b><p>{text as string}</p></article>
        })}
      </div>
    </section>

    <section className={l.split}>
      <div>
        <h2>Um editor de vídeo que entende o que você pede</h2>
        <p className={l.lead}>A linha do tempo é como a do CapCut. A diferença é o chat ao lado: a IA faz o trabalho chato e você ajusta o resto à mão.</p>
        <ul className={l.checks}>{['Cortar pausas e gaguejos', 'Legenda animada palavra por palavra', 'Títulos, stickers e barra de progresso', 'Reels 9:16, Feed 1:1 e YouTube 16:9'].map(x => <li key={x}><Check size={16} />{x}</li>)}</ul>
      </div>
      <EditorMock />
    </section>

    <section id="plugin" className={`${l.split} ${l.reverse}`}>
      <div>
        <h2>Use o OttoSocial dentro do ChatGPT e do Claude</h2>
        <p className={l.lead}>Conecte o plugin e peça em texto: encontrar um vídeo, escrever a legenda, agendar para amanhã. Você decide o que a IA pode fazer sozinha.</p>
        <ul className={l.checks}>{['Busca nos seus spaces', 'Sugestão de legenda e hashtags', 'Agendar com a sua confirmação', 'Métricas dos posts'].map(x => <li key={x}><Check size={16} />{x}</li>)}</ul>
      </div>
      <ChatMock />
    </section>

    <section id="precos" className={`${l.section} ${l.soft}`}>
      <h2>Preços simples</h2>
      <p className={l.lead}>Comece grátis. Mude de plano quando precisar.</p>
      <div className={l.plans}>{plans.map(p => <article key={p.name} className={p.featured ? l.featured : ''}>
        {p.featured && <span className={l.popular}><Star size={12} />Mais escolhido</span>}
        <b>{p.name}</b><p>{p.text}</p>
        <div className={l.price}><strong>{p.price}</strong><small>{p.per}</small></div>
        <Link href="/cadastro" className={p.featured ? l.cta : l.planBtn}>{p.cta}</Link>
        <ul>{p.items.map(i => <li key={i}><Check size={15} />{i}</li>)}</ul>
      </article>)}</div>
    </section>

    <section id="perguntas" className={l.section}>
      <h2>Perguntas frequentes</h2>
      <div className={l.faq}>{faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
    </section>

    <section className={l.final}>
      <h2>Comece a organizar e publicar hoje</h2>
      <p>Crie sua conta em um minuto e envie o primeiro vídeo.</p>
      <Link href="/cadastro" className={l.ctaLight}>Criar conta grátis<ArrowRight size={18} /></Link>
    </section>

    <footer className={l.footer}>
      <Link href="/apresentacao" className={l.logo}><span><Sparkles size={16} /></span>OttoSocial</Link>
      <nav><a href="#recursos">Recursos</a><a href="#precos">Preços</a><Link href="/login">Entrar</Link><a href="#termos">Termos</a><a href="#privacidade">Privacidade</a></nav>
      <small>© 2026 OttoSocial</small>
    </footer>
  </div>
}

/** A small picture of the app: menu, folders and a phone preview. */
function AppMock() {
  return <div className={l.window}>
    <div className={l.bar}><i /><i /><i /><span>ottosocial.app/spaces</span></div>
    <div className={l.app}>
      <aside className={l.mSide}><b><span><Sparkles size={11} /></span>OttoSocial</b><span className={l.mSearch}><Search size={11} />Buscar</span>{['Início', 'Spaces', 'Editor', 'Postar', 'Agendados'].map((x, i) => <span key={x} className={i === 1 ? l.mOn : ''}>{x}</span>)}<span className={l.mBell}><Bell size={11} />Notificações<i>3</i></span></aside>
      <div className={l.mMain}>
        <b className={l.mTitle}>Otto ERP</b>
        <small>Pastas</small>
        <div className={l.mFolders}>{['Reels publicados', 'Vídeos brutos', 'Artes', 'Stories'].map(f => <span key={f}><FolderClosed size={12} />{f}</span>)}</div>
        <small>Arquivos</small>
        <div className={l.mFiles}>{['#9cc3fa,#2f6fd6', '#f5aabd,#c94f73', '#9ddcb8,#2f9864', '#c5b3f6,#6c4fcf', '#f6d08a,#c98a1a', '#e9cfae,#a8784f'].map((g, i) => <span key={i} style={{ background: `linear-gradient(150deg, ${g})` }}><Play size={14} /></span>)}</div>
      </div>
      <div className={l.mPhone}><div><span className={l.mReels}>Reels</span><b>Emite a nota sem sair do ChatGPT</b><span className={l.mSideIcons}><Heart size={13} /><MessageCircle size={13} /><Send size={13} /></span></div></div>
    </div>
  </div>
}

function EditorMock() {
  return <div className={l.editor}>
    <div className={l.eTop}><div className={l.ePreview}><b>Legenda <em>animada</em></b></div>
      <div className={l.eChat}><span className={l.me}>Corta as pausas e põe legenda amarela</span><span className={l.ai}><Wand2 size={12} />Removi 4 pausas (6 s) e adicionei 12 legendas.</span></div></div>
    <div className={l.eTimeline}>
      <span className={l.eHead} />
      {[[Type, 'texto', [[2, 20]]], [Captions, 'legenda', [[18, 22], [42, 20], [64, 24]]], [Clapperboard, 'video', [[2, 50], [53, 40]]]].map(([Icon, kind, clips], r) => {
        const I = Icon as typeof Type
        return <div key={r} className={l.eRow}><I size={12} />{(clips as number[][]).map(([x, w], i) => <i key={i} className={l[`c_${kind}`]} style={{ left: `${x}%`, width: `${w}%` }} />)}</div>
      })}
      <span className={l.ePlayhead} />
    </div>
  </div>
}

function ChatMock() {
  return <div className={l.chat}>
    <div className={l.chatHead}><span className={l.chatDot} />Conversa com o assistente</div>
    <span className={l.me}>Agenda o Reel de cobrança para amanhã às 19h com uma legenda que termine em “Comenta COBRANÇA”.</span>
    <div className={l.card}>
      <span className={l.cardThumb}><Play size={14} /></span>
      <div><b>ChatGPT cobra seus clientes.mp4</b><small>Reel · @otto.erp · amanhã, 19:00</small><p>O ChatGPT agora cobra os clientes que te devem. 💸 Comenta COBRANÇA.</p></div>
    </div>
    <div className={l.confirm}><span>Agendar este post?</span><b>Confirmar</b></div>
  </div>
}
