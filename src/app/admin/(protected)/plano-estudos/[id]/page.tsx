import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CalendarDays, Users } from 'lucide-react'

import { adminBuscarPlano, adminListarSimuladosDisponiveis } from '@/interface/actions/admin/plano-estudos'
import { GerenciarDisciplinasPlano } from '@/components/admin/planos-estudos/gerenciar-disciplinas-plano'
import { GerenciarCiclosAdmin } from '@/components/admin/planos-estudos/gerenciar-ciclos-admin'
import { GerenciarUsuariosPlano } from '@/components/admin/planos-estudos/gerenciar-usuarios-plano'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminPlanoDetalhe({ params }: Props) {
  const { id } = await params
  const [res, simsRes] = await Promise.all([
    adminBuscarPlano(id),
    adminListarSimuladosDisponiveis(),
  ])

  if (!res.success || !res.data) notFound()

  const plano = res.data
  const simuladosDisponiveis = simsRes.success && simsRes.data ? simsRes.data : []

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

      {/* Pool de disciplinas */}
      <GerenciarDisciplinasPlano
        planoId={id}
        poolInicial={plano.disciplinasDisponiveis}
        ciclos={plano.semanas}
      />

      {/* Ciclos */}
      <GerenciarCiclosAdmin
        planoId={id}
        ciclosIniciais={plano.semanas as any}
        simuladosDisponiveis={simuladosDisponiveis}
      />

      {/* Usuários atribuídos */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            Usuários Atribuídos
            <Badge variant="secondary" className="ml-1">
              {plano.usuarios.length}
            </Badge>
          </CardTitle>
          <p className="text-sm text-slate-500">
            Busque e adicione usuários que terão acesso a este plano.
          </p>
        </CardHeader>
        <CardContent>
          <GerenciarUsuariosPlano
            planoId={id}
            usuariosIniciais={plano.usuarios}
          />
        </CardContent>
      </Card>
    </div>
  )
}
