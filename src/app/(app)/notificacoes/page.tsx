import s from '@/components/ui.module.css'

const items = [
  ['Reel publicado', 'Emite várias notas (B) foi publicado no @otto.erp.'],
  ['Comentários novos', '19 comentários com a palavra NOTA no último Reel.'],
  ['Post agendado', 'Story enquete planilha sai amanhã às 12:00.'],
  ['Armazenamento', 'Você usou 1,2 GB de 5 GB.'],
  ['Conta desconectada', 'Conecte o LinkedIn para publicar lá também.'],
]

export default function NotificacoesPage() {
  return <section className={s.content}>
    <div className={s.pageHead}><div><h1>Notificações</h1><p>O que aconteceu nas suas contas e nos seus spaces.</p></div></div>
    <div className={s.card}><ul className={s.rows}>{items.map(([title, text]) => <li key={title}><span className={s.rowText}><b>{title}</b><small>{text}</small></span></li>)}</ul></div>
  </section>
}
