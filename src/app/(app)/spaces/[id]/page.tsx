import { SpaceView } from '@/features/spaces/SpaceView'

export default async function SpacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SpaceView key={id} spaceId={id} />
}
