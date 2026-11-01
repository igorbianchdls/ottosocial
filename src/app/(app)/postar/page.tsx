import { Composer } from '@/components/Composer'

export default async function PostarPage({ searchParams }: { searchParams: Promise<{ arquivos?: string }> }) {
  const { arquivos } = await searchParams
  return <Composer initialFiles={arquivos ? arquivos.split(',') : []} />
}
