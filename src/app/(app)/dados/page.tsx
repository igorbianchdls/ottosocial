import { DataView } from '@/features/data/DataView'

export const metadata = { title: 'Dados · OttoSocial' }

export default async function DadosPage({ searchParams }: { searchParams: Promise<{ nova?: string }> }) {
  const { nova } = await searchParams
  return <DataView initialNew={nova} />
}
