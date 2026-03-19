import { notFound } from 'next/navigation'
import { buscarBuild, listarDisciplinasDisponiveis } from '@/interface/actions/admin/build-plano'
import { BuildEditorClient } from '@/components/admin/build-plano/build-editor-client'

export default async function BuildPlanoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [buildRes, discRes] = await Promise.all([
    buscarBuild(id),
    listarDisciplinasDisponiveis(),
  ])

  if (!buildRes.success || !buildRes.data) notFound()

  return (
    <BuildEditorClient
      build={buildRes.data as any}
      disciplinasDisponiveis={discRes.success && discRes.data ? discRes.data : []}
    />
  )
}
