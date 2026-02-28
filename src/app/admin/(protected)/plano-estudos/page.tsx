import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, CalendarDays } from 'lucide-react'
import { adminListarPlanos } from '@/interface/actions/admin/plano-estudos'
import { PlanosAdminTable } from '@/components/admin/planos-estudos/planos-admin-table'

export default async function AdminPlanosEstudoPage() {
  const res = await adminListarPlanos()
  const planos = res.success && res.data ? res.data : []

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-slate-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Planos de Estudo</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Planos compartilhados criados pelo admin e atribuídos aos usuários
            </p>
          </div>
        </div>
        <Link href="/admin/plano-estudos/criar">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </Link>
      </div>

      <PlanosAdminTable planos={planos} />
    </div>
  )
}
