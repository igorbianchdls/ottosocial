import { EditorView } from '@/features/editor/EditorView'
import { blankProject, sampleProjects } from '@/features/editor/project/data'
import { fromTemplate } from '@/features/editor/project/templates'

export const metadata = { title: 'Editor · OttoSocial' }

export default async function EditorProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ arquivos?: string; modelo?: string }> }) {
  const { id } = await params
  const { arquivos, modelo } = await searchParams
  const initial = sampleProjects.find(p => p.id === id) ?? (modelo ? fromTemplate(id, modelo) : null) ?? blankProject(id, arquivos ? arquivos.split(',') : [])
  return <EditorView key={id} initial={initial} />
}
