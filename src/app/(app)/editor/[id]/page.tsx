import { EditorView } from '@/features/editor/EditorView'
import { blankProject, sampleProjects } from '@/features/editor/project/data'

export const metadata = { title: 'Editor · OttoSocial' }

export default async function EditorProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ arquivos?: string }> }) {
  const { id } = await params
  const { arquivos } = await searchParams
  const initial = sampleProjects.find(p => p.id === id) ?? blankProject(id, arquivos ? arquivos.split(',') : [])
  return <EditorView key={id} initial={initial} />
}
