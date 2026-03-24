import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CalendarDays } from 'lucide-react'

import { adminBuscarPlano, adminListarSimuladosDisponiveis } from '@/interface/actions/admin/plano-estudos'
import { adminListarEditais } from '@/interface/actions/admin/editais'
import { GerenciarCiclosAdmin } from '@/components/admin/planos-estudos/gerenciar-ciclos-admin'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminPlanoDetalhe({ params }: Props) {
  const { id } = await params
  const [res, simsRes, editaisRes] = await Promise.all([
    adminBuscarPlano(id),
    adminListarSimuladosDisponiveis(),
    adminListarEditais(),
  ])

  if (!res.success || !res.data) notFound()

  const plano = res.data
  const simuladosDisponiveis = simsRes.success && simsRes.data ? simsRes.data : []
  const editais = editaisRes.success && editaisRes.data ? editaisRes.data : []

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/plano-estudos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-slate-600" />
            <h1 className="text-2xl font-bold text-slate-800">{plano.nome}</h1>
            <Badge variant={plano.ativo ? 'default' : 'secondary'}>
              {plano.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {format(new Date(plano.dataInicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {' – '}
            {format(new Date(plano.dataFim), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {plano.descricao && <span className="ml-2">· {plano.descricao}</span>}
          </p>
        </div>
      </div>

      {/* Ciclos */}
      <GerenciarCiclosAdmin
        planoId={id}
        ciclosIniciais={plano.semanas as any}
        simuladosDisponiveis={simuladosDisponiveis}
        editais={editais as any}
      />

    </div>
  )
}
