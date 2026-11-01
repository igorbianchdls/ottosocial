import s from '@/components/ui.module.css'

export default function ConfiguracoesPage() {
  return <section className={s.content}>
    <div className={s.pageHead}><div><h1>Configurações</h1><p>Perfil, workspace e armazenamento.</p></div></div>
    <div className={s.card}><div className={s.props}>
      <div>Workspace<b>Otto ERP</b></div>
      <div>Plano<b>Demonstração</b></div>
      <div>Armazenamento<b>5 GB</b></div>
    </div></div>
  </section>
}
