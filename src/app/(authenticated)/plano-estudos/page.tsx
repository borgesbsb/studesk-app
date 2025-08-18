import { PlanosEstudoTable } from '@/components/plano-estudos/planos-estudos-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default function PlanosEstudoPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciador de Estudos</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todos os seus planos de estudo
          </p>
        </div>
        <Link href="/plano-estudos/criar">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </Link>
      </div>

      {/* Lista de planos */}
      <PlanosEstudoTable />
    </div>
  )
}
