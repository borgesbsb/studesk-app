import { FileText } from 'lucide-react'
import { adminListarEditais } from '@/interface/actions/admin/editais'
import { EditaisAdminTable } from '@/components/admin/editais/editais-admin-table'

export default async function AdminEditaisPage() {
  const res = await adminListarEditais()
  const editais = res.success && res.data ? res.data : []

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Editais</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Gerencie os editais disponíveis para os usuários
          </p>
        </div>
      </div>

      <EditaisAdminTable editaisIniciais={editais as any} />
    </div>
  )
}
