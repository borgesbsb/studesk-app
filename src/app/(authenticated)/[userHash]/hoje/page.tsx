"use client"

import { DataHoje } from "@/components/hoje/data-hoje"
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
      <div className="p-4 overflow-auto overflow-x-hidden">
        <div className="flex flex-col gap-4 max-w-full min-w-0">
          {/* Linha superior - 2 cards lado a lado */}
          <div className="flex gap-4 max-w-full overflow-hidden">
            {/* Card 1 - Calendário Grande do Dia - 50% */}
            <div className="w-1/2 min-w-0 overflow-hidden">
              <DataHoje />
            </div>

            {/* Card 2 - Matérias - 50% */}
            <div className="w-1/2 min-w-0 overflow-hidden">
              <MateriasHojeWrapper />
            </div>
          </div>

          {/* Calendário Semanal - Largura Total */}
          <div className="w-full">
            <CalendarioSemanal />
          </div>
        </div>
      </div>
    </DashboardProvider>
  )
}