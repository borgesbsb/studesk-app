'use client'

import { format, addDays, isSameDay, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useDashboard } from '@/contexts/dashboard-context'

export function CalendarioSemanal() {
  const hoje = useMemo(() => startOfDay(new Date()), [])
  const { selectedDate, setSelectedDate } = useDashboard()
  const [startDay, setStartDay] = useState(-3)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Gerar 30 dias (15 antes e 15 depois do dia atual)
  const gerarDias = () => {
    const dias = []
    for (let i = -15; i <= 15; i++) {
      const data = startOfDay(addDays(hoje, i))
      dias.push({
        data,
        dia: format(data, 'd', { locale: ptBR }),
        diaSemana: format(data, 'EEE', { locale: ptBR }),
        mes: format(data, 'MMM', { locale: ptBR }),
        isHoje: i === 0,
        isSelecionado: isSameDay(data, selectedDate),
        offset: i
      })
    }
    return dias
  }

  const diasVisiveis = gerarDias()

  const selecionarDia = (data: Date, index: number) => {
    setSelectedDate(data)
    // Scroll para centralizar o item selecionado
    if (scrollRef.current) {
      const container = scrollRef.current
      const item = container.children[index] as HTMLElement
      if (item) {
        const containerWidth = container.offsetWidth
        const itemLeft = item.offsetLeft
        const itemWidth = item.offsetWidth
        const scrollTo = itemLeft - (containerWidth / 2) + (itemWidth / 2)
        container.scrollTo({ left: scrollTo, behavior: 'smooth' })
      }
    }
  }

  const goToToday = () => {
    setSelectedDate(hoje)
    // Scroll para o dia de hoje (index 15)
    setTimeout(() => {
      if (scrollRef.current) {
        const container = scrollRef.current
        const item = container.children[15] as HTMLElement
        if (item) {
          const containerWidth = container.offsetWidth
          const itemLeft = item.offsetLeft
          const itemWidth = item.offsetWidth
          const scrollTo = itemLeft - (containerWidth / 2) + (itemWidth / 2)
          container.scrollTo({ left: scrollTo, behavior: 'smooth' })
        }
      }
    }, 100)
  }

  // Auto-scroll para o dia selecionado ao montar
  useEffect(() => {
    const selectedIndex = diasVisiveis.findIndex(d => d.isSelecionado)
    if (selectedIndex >= 0) {
      setTimeout(() => {
        if (scrollRef.current) {
          const container = scrollRef.current
          const item = container.children[selectedIndex] as HTMLElement
          if (item) {
            const containerWidth = container.offsetWidth
            const itemLeft = item.offsetLeft
            const itemWidth = item.offsetWidth
            const scrollTo = itemLeft - (containerWidth / 2) + (itemWidth / 2)
            container.scrollTo({ left: scrollTo, behavior: 'auto' })
          }
        }
      }, 100)
    }
  }, [])

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">Calendário</h3>
        <button
          onClick={goToToday}
          className="text-sm text-blue-600 font-medium active:scale-95 transition-transform"
        >
          Hoje
        </button>
      </div>

      {/* Carrossel Horizontal */}
      <div className="relative -mx-4 px-4">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {diasVisiveis.map((dia, index) => (
            <button
              key={dia.offset}
              onClick={() => selecionarDia(dia.data, index)}
              className={`
                flex-shrink-0 flex flex-col items-center justify-center
                w-20 h-24 rounded-2xl border-2 transition-all duration-300
                snap-center active:scale-95
                ${
                  dia.isSelecionado
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105'
                    : dia.isHoje
                    ? 'bg-blue-50 text-blue-900 border-blue-200 shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }
              `}
            >
              {/* Dia da semana */}
              <span className={`text-xs font-medium uppercase mb-1 ${
                dia.isSelecionado ? 'text-blue-100' : dia.isHoje ? 'text-blue-700' : 'text-gray-500'
              }`}>
                {dia.diaSemana}
              </span>

              {/* Número do dia */}
              <span className={`text-2xl font-bold leading-none mb-1 ${
                dia.isSelecionado ? 'text-white' : dia.isHoje ? 'text-blue-900' : 'text-gray-900'
              }`}>
                {dia.dia}
              </span>

              {/* Mês (apenas no dia 1) */}
              {dia.dia === '1' && (
                <span className={`text-xs mt-1 ${
                  dia.isSelecionado ? 'text-blue-100' : dia.isHoje ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {dia.mes}
                </span>
              )}

              {/* Indicador de selecionado */}
              {dia.isSelecionado && (
                <div className="w-1.5 h-1.5 bg-white rounded-full mt-2" />
              )}

              {/* Indicador de hoje (quando não está selecionado) */}
              {dia.isHoje && !dia.isSelecionado && (
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
              )}
            </button>
          ))}
        </div>

        {/* Gradient fade nos cantos */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
      </div>

      {/* Data selecionada */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
