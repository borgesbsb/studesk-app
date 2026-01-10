'use client'

import { format, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useDashboard } from '@/contexts/dashboard-context'

export function DataHoje() {
  const { selectedDate } = useDashboard()
  const agora = new Date()

  const dia = format(selectedDate, 'd', { locale: ptBR })
  const diaDaSemana = format(selectedDate, 'EEEE', { locale: ptBR })
  const mesAno = format(selectedDate, 'MMMM yyyy', { locale: ptBR })
  const hora = format(agora, 'HH:mm', { locale: ptBR })
  const isSelectedToday = isToday(selectedDate)

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-sm font-semibold capitalize opacity-90">{mesAno}</h3>
      </div>

      {/* Main date display - compacto para mobile */}
      <div className="flex items-center justify-center gap-6 mb-4">
        {/* Dia grande */}
        <div className="flex items-center justify-center">
          <span className="text-8xl font-black leading-none">
            {dia}
          </span>
        </div>

        {/* Dia da semana e hora */}
        <div className="flex flex-col items-start">
          <h2 className="text-2xl font-bold capitalize">
            {diaDaSemana}
          </h2>
          {isSelectedToday && (
            <div className="flex items-center gap-2 mt-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-mono font-semibold">{hora}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer message */}
      <div className="text-center pt-4 border-t border-white/20">
        <p className="text-sm opacity-90">
          {isSelectedToday ? 'Bom estudo!' : `Programação para ${format(selectedDate, "d 'de' MMMM", { locale: ptBR })}`}
        </p>
      </div>
    </div>
  )
}
