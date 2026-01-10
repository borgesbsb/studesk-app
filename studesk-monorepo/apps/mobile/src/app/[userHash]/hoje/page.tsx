'use client'

import { MobileLayout } from '@/components/layout/MobileLayout'
import { DashboardProvider } from '@/contexts/dashboard-context'
import { DataHoje } from '@/components/hoje/DataHoje'
import { CalendarioSemanal } from '@/components/hoje/CalendarioSemanal'
import { MateriasHojeWrapper } from '@/components/hoje/MateriasHojeWrapper'

export default function HojePage() {
  return (
    <DashboardProvider>
      <MobileLayout title="Hoje">
        <div className="p-4 space-y-4 pb-24">
          {/* Data do Dia */}
          <DataHoje />

          {/* Calendário Semanal */}
          <CalendarioSemanal />

          {/* Matérias para Estudar */}
          <MateriasHojeWrapper />
        </div>
      </MobileLayout>
    </DashboardProvider>
  )
}
