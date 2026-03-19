"use client"

import { useEffect, useState } from "react"
import { getProgressoCiclo, ProgressoCiclo } from "@/interface/actions/dashboard/get-progresso-ciclo"
import { getEvolucaoCiclo, EvolucaoCiclo } from "@/interface/actions/dashboard/get-evolucao-ciclo"
import { getDisciplinasCiclo } from "@/interface/actions/dashboard/get-disciplinas-ciclo"
import { getContribuicoesEstudo } from "@/interface/actions/dashboard/get-contribuicoes-estudo"
import { limparProgressoCiclo } from "@/interface/actions/dashboard/limpar-progresso-ciclo"
import { getResumoCompartilhar, ResumoCompartilhar } from "@/interface/actions/dashboard/get-resumo-compartilhar"
import { CicloStatsCards } from "@/components/dashboard/ciclo-stats-cards"
import { DisciplinasCicloCard } from "@/components/dashboard/disciplinas-ciclo-card"
import { ContribuicoesCard } from "@/components/dashboard/contribuicoes-card"
import { ResumoCompartilharCard } from "@/components/dashboard/resumo-compartilhar-card"
import { EvolucaoHorasCard } from "@/components/hoje/evolucao-horas-card"
import { EvolucaoQuestoesCard } from "@/components/hoje/evolucao-questoes-card"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { HourglassCard } from "@/components/dashboard/hourglass-card"
import { CardCapture } from "@/components/dashboard/card-capture"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

// Formata a data como YYYY-MM-DD usando o timezone local do usuário
function toLocalDateString(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function DashboardPage() {
  const [progresso, setProgresso] = useState<ProgressoCiclo | null>(null)
  const [evolucao, setEvolucao] = useState<EvolucaoCiclo | null>(null)
  const [disciplinas, setDisciplinas] = useState<any>(null)
  const [contribuicoes, setContribuicoes] = useState<any>(null)
  const [resumo, setResumo] = useState<ResumoCompartilhar | null>(null)
  const [loading, setLoading] = useState(true)
  const [limpando, setLimpando] = useState(false)

  const hoje = toLocalDateString(new Date())

  useEffect(() => {
    async function loadData() {
      const [p, e, d, c, r] = await Promise.all([
        getProgressoCiclo(hoje),
        getEvolucaoCiclo(hoje),
        getDisciplinasCiclo(hoje),
        getContribuicoesEstudo(),
        getResumoCompartilhar(),
      ])
      setProgresso(p)
      setEvolucao(e)
      setDisciplinas(d)
      setContribuicoes(c)
      setResumo(r)
      setLoading(false)
    }
    loadData()
  }, [])

  const handleLimparProgresso = async () => {
    setLimpando(true)
    const res = await limparProgressoCiclo(hoje)
    setLimpando(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('Progresso do ciclo zerado com sucesso')
    // Recarregar dados
    const [p, e, d, c, r] = await Promise.all([
      getProgressoCiclo(hoje),
      getEvolucaoCiclo(hoje),
      getDisciplinasCiclo(hoje),
      getContribuicoesEstudo(),
      getResumoCompartilhar(),
    ])
    setProgresso(p)
    setEvolucao(e)
    setDisciplinas(d)
    setContribuicoes(c)
    setResumo(r)
  }

  return (
    <div className="h-full p-4">
      <div className="flex items-center justify-between mb-3">
        <DashboardHeader />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive h-7 px-2">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">Zerar ciclo</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Zerar progresso do ciclo atual?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso vai apagar todas as horas realizadas, questões resolvidas e sessões de estudo do ciclo corrente. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLimparProgresso}
                disabled={limpando}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {limpando ? 'Zerando...' : 'Zerar progresso'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {loading ? (
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div
          className="h-full grid gap-4"
          style={{
            gridTemplateColumns: '8fr 2fr',
            gridTemplateRows: 'auto auto auto 2fr',
          }}
        >
          {/* Linha 1, Col 1: Stats */}
          <div>
            <CardCapture filename="stats-ciclo">
              <CicloStatsCards progresso={progresso} />
            </CardCapture>
          </div>

          {/* Linhas 1-3, Col 2: Ampulheta */}
          <div style={{ gridRow: '1/4', gridColumn: '2' }}>
            <CardCapture filename="ampulheta">
              <HourglassCard progresso={progresso} />
            </CardCapture>
          </div>

          {/* Linha 2, Col 1: Contribuições */}
          <div className="min-h-0">
            <CardCapture filename="contribuicoes">
              <ContribuicoesCard contribuicoes={contribuicoes} />
            </CardCapture>
          </div>

          {/* Linha 3, Col 1: Resumo + Disciplinas lado a lado */}
          <div className="min-h-0 grid grid-cols-2 gap-4 items-stretch">
            <CardCapture filename="resumo-compartilhar">
              <ResumoCompartilharCard resumo={resumo} />
            </CardCapture>
            <CardCapture filename="disciplinas-ciclo" className="h-full">
              <DisciplinasCicloCard disciplinas={disciplinas} />
            </CardCapture>
          </div>

          {/* Linha 4, Col 1-2: Gráficos lado a lado com mesma largura */}
          <div className="min-h-0 grid grid-cols-2 gap-4" style={{ gridColumn: '1 / -1' }}>
            <CardCapture filename="evolucao-horas">
              <EvolucaoHorasCard evolucao={evolucao} />
            </CardCapture>
            <CardCapture filename="evolucao-questoes">
              <EvolucaoQuestoesCard evolucao={evolucao} />
            </CardCapture>
          </div>
        </div>
      )}
    </div>
  )
}
