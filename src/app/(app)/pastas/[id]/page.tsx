import { DriveView } from '@/features/spaces/drive/DriveView'

export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DriveView key={id} folderId={id} />
}
