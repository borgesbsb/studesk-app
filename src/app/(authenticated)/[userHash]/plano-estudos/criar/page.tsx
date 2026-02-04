import { CriarPlanoEstudoForm } from '@/components/plano-estudos/criar-plano-estudo-form'

export default function CriarPlanoEstudoPage() {
  return (
    <div className="h-full md:h-auto overflow-y-auto md:overflow-visible">
      <div className="space-y-6 pb-6 md:pb-0 pt-6 px-6">
        <CriarPlanoEstudoForm />
      </div>
    </div>
  )
}
