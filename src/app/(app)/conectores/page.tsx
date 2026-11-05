import { ConnectorsView } from '@/features/connectors/ConnectorsView'
import { availableConnectors } from '@/features/connectors/composio'

export const metadata = { title: 'Conectores · OttoSocial' }

export default async function ConectoresPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams
  return <ConnectorsView available={availableConnectors()} tab={aba} />
}
