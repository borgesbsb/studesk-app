import { FileText } from 'lucide-react'
import { adminListarMateriais } from '@/interface/actions/admin/materiais'
import { adminListarDisciplinas } from '@/interface/actions/admin/disciplinas'
import { MateriaisAdminTable } from '@/components/admin/materiais/materiais-admin-table'
import { DrivePanel } from '@/components/admin/drive/drive-panel'

export default async function AdminMateriaisPage() {
  const [matRes, discRes] = await Promise.all([
    adminListarMateriais(),
    adminListarDisciplinas(),
  ])

  const materiais = matRes.success && matRes.data ? matRes.data : []
  const disciplinas = discRes.success && discRes.data
    ? discRes.data.map(d => ({ id: d.id, nome: d.nome, cor: d.cor }))
    : []

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Materiais</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            PDFs e vídeos vinculados às disciplinas dos planos de estudo
          </p>
        </div>
      </div>

      <DrivePanel />

      <MateriaisAdminTable materiaisIniciais={materiais as any} disciplinasDisponiveis={disciplinas} />
    </div>
  )
}
