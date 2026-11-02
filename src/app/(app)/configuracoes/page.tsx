import { SettingsView } from '@/features/settings/SettingsView'

export default async function ConfiguracoesPage({ searchParams }: { searchParams: Promise<{ secao?: string }> }) {
  const { secao } = await searchParams
  return <SettingsView initial={secao} />
}
