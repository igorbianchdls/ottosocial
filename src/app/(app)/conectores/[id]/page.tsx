import { notFound } from 'next/navigation'
import { ConnectorDetailView } from '@/features/connectors/ConnectorsView'
import { connectorById } from '@/features/connectors/catalog'
import { availableConnectors } from '@/features/connectors/composio'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `${connectorById(id)?.name ?? 'Conector'} · OttoSocial` }
}

export default async function ConectorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { id } = await params
  if (!connectorById(id)) notFound()
  const q = await searchParams
  return <ConnectorDetailView id={id} available={availableConnectors()} result={q.ok ? 'ok' : q.erro ? 'erro' : undefined} />
}
