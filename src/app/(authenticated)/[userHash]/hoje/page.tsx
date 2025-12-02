"use client"

import { DataHoje } from "@/components/dashboard/data-hoje"
import { MateriasHojeWrapper } from "@/components/dashboard/materias-hoje-wrapper"
import { CalendarioSemanal } from "@/components/dashboard/calendario-semanal"
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
      <div className="p-4 h-screen flex flex-col gap-4 max-w-full">
        {/* Linha Superior - 2 Cards lado a lado (2/3 da altura) */}
        <div className="flex gap-4 h-2/3 min-h-0">
          {/* Card 1 - Calendário Grande do Dia - 50% */}
          <div className="w-1/2 min-w-0 overflow-hidden">
            <DataHoje />
          </div>
          
          {/* Card 2 - Matérias - 50% */}
          <div className="w-1/2 min-w-0 overflow-hidden">
            <MateriasHojeWrapper />
          </div>
        </div>
        
        {/* Card 3 Horizontal - Calendário Semanal (1/3 da altura) */}
        <div className="h-1/3 min-h-0 overflow-hidden">
          <CalendarioSemanal />
        </div>
      </div>
    </DashboardProvider>
  )
}