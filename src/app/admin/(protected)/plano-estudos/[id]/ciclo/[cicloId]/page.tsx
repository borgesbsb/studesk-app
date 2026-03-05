import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { adminBuscarCiclo } from '@/interface/actions/admin/plano-estudos'
import { CicloDetalheAdmin } from '@/components/admin/planos-estudos/ciclo-detalhe-admin'

interface Props {
  params: Promise<{ id: string; cicloId: string }>
}

export default async function CicloDetalhePage({ params }: Props) {
  const { id, cicloId } = await params
  const res = await adminBuscarCiclo(cicloId)

  if (!res.success || !res.data) notFound()

  const ciclo = res.data

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/plano-estudos/${id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <p className="text-xs text-slate-500">{ciclo.plano.nome}</p>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-slate-600" />
            <h1 className="text-xl font-bold text-slate-800">
              Ciclo {ciclo.numeroSemana}
            </h1>
            <span className="text-sm text-slate-500">
              {format(new Date(ciclo.dataInicio), "dd/MM/yy", { locale: ptBR })}
              {' – '}
              {format(new Date(ciclo.dataFim), "dd/MM/yy", { locale: ptBR })}
            </span>
          </div>
        </div>
      </div>

      <CicloDetalheAdmin ciclo={ciclo} planoId={id} />
    </div>
  )
}
