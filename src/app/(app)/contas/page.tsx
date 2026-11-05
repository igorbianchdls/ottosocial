import { redirect } from 'next/navigation'

// Contas became the "Redes sociais" tab of Conectores.
export default function ContasPage() {
  redirect('/conectores?aba=redes')
}
