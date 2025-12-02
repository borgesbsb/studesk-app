import { DetalhePlanoEstudo } from '@/components/plano-estudos/detalhe-plano-estudo'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit } from 'lucide-react'
import Link from 'next/link'

interface PlanoEstudoDetalhePage {
  params: Promise<{ id: string; userHash: string }>
}

export default async function PlanoEstudoDetalhePage({ params }: PlanoEstudoDetalhePage) {
  const { id, userHash } = await params
  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
                Gerencie o progresso do seu cronograma
              </p>
            </div>
          </div>
          <Link href={`/${userHash}/plano-estudos/${id}/editar`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Editar Plano
            </Button>
          </Link>
        </div>

      {/* Detalhes do plano */}
      <DetalhePlanoEstudo planoId={id} />
    </div>
  )
}
