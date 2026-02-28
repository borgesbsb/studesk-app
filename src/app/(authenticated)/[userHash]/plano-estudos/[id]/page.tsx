import { notFound } from 'next/navigation'
import { DetalhePlanoEstudo } from '@/components/plano-estudos/detalhe-plano-estudo'
import { DetalhePlanoCompartilhado } from '@/components/plano-estudos/detalhe-plano-compartilhado'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { detectarTipoPlano } from '@/interface/actions/plano-estudo/get-by-id'

interface PlanoEstudoDetalhePage {
  params: Promise<{ id: string; userHash: string }>
}

export default async function PlanoEstudoDetalhePage({ params }: PlanoEstudoDetalhePage) {
  const { id, userHash } = await params

  const tipo = await detectarTipoPlano(id)

  // Sem acesso (não é dono nem está atribuído)
  if (tipo === null) notFound()

  return (
    <div className="h-full md:h-auto overflow-y-auto md:overflow-visible">
      <div className="space-y-6 pb-6 md:pb-0 pt-6 px-6">
        <div className="flex items-center gap-4">
          <Link href={`/${userHash}/plano-estudos`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Plano de Estudos</h1>
            <p className="text-muted-foreground">
              {tipo.isShared
                ? 'Acompanhe seu progresso no plano atribuído'
                : 'Gerencie o progresso do seu cronograma'}
            </p>
          </div>
        </div>

        {tipo.isShared
          ? <DetalhePlanoCompartilhado planoId={id} />
          : <DetalhePlanoEstudo planoId={id} />}
      </div>
    </div>
  )
}
