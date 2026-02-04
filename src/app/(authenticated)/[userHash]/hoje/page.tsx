"use client"

import { ProgressoCicloWrapper } from "@/components/hoje/progresso-ciclo-wrapper"
import { MateriasHojeWrapper } from "@/components/hoje/materias-hoje-wrapper"
import { CalendarioSemanal } from "@/components/hoje/calendario-semanal-v2"
import { DashboardProvider } from "@/contexts/dashboard-context"
import { useHeader } from "@/contexts/header-context"
import { useEffect } from "react"

export default function DashboardPage() {
  const { setTitle } = useHeader()

  useEffect(() => {
    setTitle("Hoje")
  }, [setTitle])

  return (
    <DashboardProvider>
      <div className="h-full md:h-auto overflow-y-auto md:overflow-visible">
        <div className="space-y-6 pb-6 md:pb-0 pt-6 px-6">
          <div className="flex flex-col gap-4 max-w-full min-w-0">
          {/* Linha superior - 2 colunas lado a lado */}
          <div className="flex gap-4 max-w-full overflow-hidden">
            {/* Coluna 1 - Matérias - 50% */}
            <div className="w-1/2 min-w-0 overflow-hidden">
              <MateriasHojeWrapper />
            </div>

            {/* Coluna 2 - Gráficos empilhados - 50% */}
            <div className="w-1/2 min-w-0 overflow-hidden flex flex-col gap-4">
              <ProgressoCicloWrapper />
            </div>
          </div>

          {/* Calendário Semanal - Largura Total */}
          <div className="w-full">
            <CalendarioSemanal />
          </div>
        </div>
        </div>
      </div>
    </DashboardProvider>
  )
}