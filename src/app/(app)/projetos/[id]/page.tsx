import { ProjectView } from '@/features/drive/ProjectView'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProjectView key={id} projectId={id} />
}
