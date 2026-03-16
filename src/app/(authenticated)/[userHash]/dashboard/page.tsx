"use client"

import { useEffect, useState } from "react"
import { getProgressoCiclo, ProgressoCiclo } from "@/interface/actions/dashboard/get-progresso-ciclo"
import { getEvolucaoCiclo, EvolucaoCiclo } from "@/interface/actions/dashboard/get-evolucao-ciclo"
import { getDisciplinasCiclo } from "@/interface/actions/dashboard/get-disciplinas-ciclo"
import { getContribuicoesEstudo } from "@/interface/actions/dashboard/get-contribuicoes-estudo"
import { CicloStatsCards } from "@/components/dashboard/ciclo-stats-cards"
import { DisciplinasCicloCard } from "@/components/dashboard/disciplinas-ciclo-card"
import { ContribuicoesCard } from "@/components/dashboard/contribuicoes-card"
import { EvolucaoHorasCard } from "@/components/hoje/evolucao-horas-card"
import { EvolucaoQuestoesCard } from "@/components/hoje/evolucao-questoes-card"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { HourglassCard } from "@/components/dashboard/hourglass-card"

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      // Usa a data local do browser para evitar bug de timezone (servidor em UTC)
      const hoje = toLocalDateString(new Date())
      const [p, e, d, c] = await Promise.all([
        getProgressoCiclo(hoje),
        getEvolucaoCiclo(hoje),
        getDisciplinasCiclo(hoje),
        getContribuicoesEstudo(),
      ])
      setProgresso(p)
      setEvolucao(e)
      setDisciplinas(d)
      setContribuicoes(c)
      setLoading(false)
    }
    loadData()
  }, [])

  return (
    <div className="h-full p-3">
      <DashboardHeader />
      {loading ? (
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div
          className="h-full grid gap-3"
          style={{
            gridTemplateColumns: '8fr 2fr',
            gridTemplateRows: 'auto auto auto 2fr',
          }}
        >
          {/* Linha 1, Col 1: Stats */}
          <div>
            <CicloStatsCards progresso={progresso} />
          </div>

          {/* Linhas 1-3, Col 2: Ampulheta */}
          <div style={{ gridRow: '1/4', gridColumn: '2' }}>
            <HourglassCard progresso={progresso} />
          </div>

          {/* Linha 2, Col 1: Contribuições */}
          <div className="min-h-0">
            <ContribuicoesCard contribuicoes={contribuicoes} />
          </div>

          {/* Linha 3, Col 1: Disciplinas */}
          <div className="min-h-0">
            <DisciplinasCicloCard disciplinas={disciplinas} />
          </div>

          {/* Linha 4, Col 1-2: Gráficos lado a lado com mesma largura */}
          <div className="min-h-0 grid grid-cols-2 gap-3" style={{ gridColumn: '1 / -1' }}>
            <EvolucaoHorasCard evolucao={evolucao} />
            <EvolucaoQuestoesCard evolucao={evolucao} />
          </div>
        </div>
      )}
    </div>
  )
}
