"use client"

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
          {/* Matérias */}
          <div className="w-full min-w-0">
            <MateriasHojeWrapper />
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
