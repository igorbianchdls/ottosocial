import { FolderView } from '@/features/drive/FolderView'

export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <FolderView key={id} folderId={id} />
}
