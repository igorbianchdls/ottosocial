import { DriveView } from '@/features/spaces/drive/DriveView'

export default async function SpacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DriveView key={id} spaceId={id} folderId={null} />
}
