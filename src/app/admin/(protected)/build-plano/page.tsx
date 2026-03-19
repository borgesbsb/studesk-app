import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Wand2, CheckCircle2, Clock, FileText } from 'lucide-react'
import { listarBuilds } from '@/interface/actions/admin/build-plano'
import { Badge } from '@/components/ui/badge'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'bg-slate-100 text-slate-600' },
  processando: { label: 'Processando', color: 'bg-yellow-100 text-yellow-700' },
  gerado: { label: 'Gerado', color: 'bg-green-100 text-green-700' },
}

export default async function BuildPlanoListPage() {
  const res = await listarBuilds()
  const builds = res.success && res.data ? res.data : []

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wand2 className="h-6 w-6 text-slate-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Build de Planos</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Construa ciclos de estudo a partir do edital com apoio de IA
            </p>
          </div>
        </div>
        <Link href="/admin/build-plano/novo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Build
          </Button>
        </Link>
      </div>

      {builds.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-16 text-center">
          <Wand2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum build criado ainda</p>
          <p className="text-slate-400 text-sm mt-1">
            Crie um build para organizar as disciplinas do edital e gerar ciclos de estudo
          </p>
          <Link href="/admin/build-plano/novo" className="mt-4 inline-block">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro build
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {builds.map((build) => {
            const st = STATUS_LABEL[build.status] ?? STATUS_LABEL.rascunho
            return (
              <Link
                key={build.id}
                href={`/admin/build-plano/${build.id}`}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-orange-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Wand2 className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 group-hover:text-orange-600 transition-colors">
                      {build.nome}
                    </p>
                    {build.descricao && (
                      <p className="text-slate-500 text-sm mt-0.5 line-clamp-1">{build.descricao}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    {(build as any)._count?.disciplinas ?? 0} disciplinas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {build.numeroCiclos} ciclos
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                    {st.label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
