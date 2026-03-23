'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Printer, AlertCircle, Sparkles, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface Disciplina {
  id: string
  nome: string
  cor: string | null
}

interface EditalDisciplina {
  id: string
  disciplinaId: string
  conteudoProgramatico: string | null
  conteudoVerticalizado: string | null
  disciplina: Disciplina
}

interface Edital {
  id: string
  nome: string
  orgao: string | null
  cargo: string | null
  ano: number | null
  disciplinas: EditalDisciplina[]
}

interface EditalVerticalProps {
  edital: Edital
}

function formatarConteudo(texto: string): string[] {
  return texto
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
}

export function EditalVertical({ edital }: EditalVerticalProps) {
  const router = useRouter()
  const [verticalizando, setVerticalizando] = useState(false)
  const [resultado, setResultado] = useState<{ salvos: number; total: number } | null>(null)

  const comConteudo = edital.disciplinas.filter(d => d.conteudoProgramatico)
  const semConteudo = edital.disciplinas.filter(d => !d.conteudoProgramatico)
  const verticalizadas = edital.disciplinas.filter(d => d.conteudoVerticalizado)

  const handleVerticalizar = async () => {
    setVerticalizando(true)
    setResultado(null)
    try {
      const res = await fetch(`/api/admin/editais/${edital.id}/verticalizar`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Erro ao verticalizar')
        return
      }
      setResultado({ salvos: data.salvos, total: data.total })
      toast.success(`${data.salvos} de ${data.total} disciplinas verticalizadas!`)
      router.refresh()
    } catch {
      toast.error('Erro de conexão. Tente novamente.')
    } finally {
      setVerticalizando(false)
    }
  }

  return (
    <div>
      {/* Barra de ações */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="space-y-0.5">
          <p className="text-sm text-slate-500">
            {comConteudo.length} de {edital.disciplinas.length} disciplinas com conteúdo programático
          </p>
          {verticalizadas.length > 0 && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {verticalizadas.length} verticalizadas pela IA
            </p>
          )}
          {semConteudo.length > 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {semConteudo.length} disciplina{semConteudo.length > 1 ? 's' : ''} sem conteúdo não {semConteudo.length > 1 ? 'serão exibidas' : 'será exibida'}
            </p>
          )}
          {resultado && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {resultado.salvos} de {resultado.total} disciplinas verticalizadas agora
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {comConteudo.length > 0 && (
            <Button
              variant="outline"
              onClick={handleVerticalizar}
              disabled={verticalizando}
              className="gap-2 border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              {verticalizando
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Sparkles className="h-4 w-4" />}
              {verticalizando ? 'Verticalizando...' : 'Verticalizar com IA'}
            </Button>
          )}
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Documento verticalizado */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm print:shadow-none print:border-none">
        {/* Cabeçalho do edital */}
        <div className="border-b border-slate-200 px-8 py-6 text-center print:px-0">
          <h1 className="text-xl font-bold text-slate-800 uppercase tracking-wide">{edital.nome}</h1>
          {(edital.orgao || edital.cargo || edital.ano) && (
            <div className="flex items-center justify-center gap-3 mt-1 text-sm text-slate-500">
              {edital.orgao && <span>{edital.orgao}</span>}
              {edital.orgao && edital.cargo && <span>·</span>}
              {edital.cargo && <span>{edital.cargo}</span>}
              {edital.ano && <span>· {edital.ano}</span>}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest">Conteúdo Programático Verticalizado</p>
        </div>

        {/* Disciplinas */}
        <div className="divide-y divide-slate-100">
          {comConteudo.map((ed, idx) => {
            const conteudo = ed.conteudoVerticalizado || ed.conteudoProgramatico!
            const topicos = formatarConteudo(conteudo)
            const isVerticalizado = !!ed.conteudoVerticalizado
            return (
              <div key={ed.id} className="px-8 py-5 print:px-4 print:py-4 print:break-inside-avoid">
                {/* Nome da disciplina */}
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-xs font-bold text-slate-400 w-6 text-right flex-shrink-0">{idx + 1}.</span>
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ed.disciplina.cor || '#3b82f6' }}
                  />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    {ed.disciplina.nome}
                  </h2>
                  {isVerticalizado && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-300 print:hidden">
                      IA
                    </Badge>
                  )}
                </div>

                {/* Tópicos */}
                <div className="ml-[3.25rem] space-y-1">
                  {topicos.map((topico, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-slate-300 flex-shrink-0 mt-0.5 text-xs">▸</span>
                      <span className="leading-relaxed">{topico}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {comConteudo.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Nenhuma disciplina possui conteúdo programático.</p>
            <p className="text-xs mt-1">Adicione o conteúdo em cada disciplina antes de gerar o edital vertical.</p>
          </div>
        )}
      </div>
    </div>
  )
}
