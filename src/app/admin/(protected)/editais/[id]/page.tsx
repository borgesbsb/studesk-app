import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { adminBuscarEdital } from '@/interface/actions/admin/editais'
import { GerenciarDisciplinasEdital } from '@/components/admin/editais/gerenciar-disciplinas-edital'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminEditalDetalhe({ params }: Props) {
  const { id } = await params
  const res = await adminBuscarEdital(id)

  if (!res.success || !res.data) notFound()

  const edital = res.data

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/editais">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="h-5 w-5 text-slate-600 flex-shrink-0" />
            <h1 className="text-2xl font-bold text-slate-800">{edital.nome}</h1>
            {edital.ano && <Badge variant="outline">{edital.ano}</Badge>}
            {edital.link && (
              <a
                href={edital.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-600"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
            {edital.orgao && <span>{edital.orgao}</span>}
            {edital.orgao && edital.cargo && <span>·</span>}
            {edital.cargo && <span>{edital.cargo}</span>}
            {edital.descricao && <span>· {edital.descricao}</span>}
          </div>
        </div>
      </div>

      {/* Gerenciar disciplinas */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Disciplinas do Edital</h2>
        <GerenciarDisciplinasEdital
          editalId={edital.id}
          disciplinasIniciais={edital.disciplinas as any}
        />
      </div>
    </div>
  )
}
