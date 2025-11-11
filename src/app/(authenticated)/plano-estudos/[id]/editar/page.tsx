import { EditarPlanoEstudoForm } from '@/components/plano-estudos/editar-plano-estudo-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface EditarPlanoEstudoPageProps {
  params: Promise<{ id: string }>
}

export default async function EditarPlanoEstudoPage({ params }: EditarPlanoEstudoPageProps) {
  const { id } = await params

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/plano-estudos/${id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Plano de Estudos</h1>
          <p className="text-muted-foreground">
            Atualize as informações do seu plano
          </p>
        </div>
      </div>

      {/* Formulário */}
      <EditarPlanoEstudoForm planoId={id} />
    </div>
  )
}
