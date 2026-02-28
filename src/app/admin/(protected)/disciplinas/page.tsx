import { BookOpen } from 'lucide-react'
import { adminListarDisciplinas } from '@/interface/actions/admin/disciplinas'
import { DisciplinasAdminTable } from '@/components/admin/disciplinas/disciplinas-admin-table'

export default async function AdminDisciplinasPage() {
  const res = await adminListarDisciplinas()
  const disciplinas = res.success && res.data ? res.data : []

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Disciplinas</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Gerencie as disciplinas disponíveis nos planos de estudo
          </p>
        </div>
      </div>

      <DisciplinasAdminTable disciplinasIniciais={disciplinas as any} />
    </div>
  )
}
