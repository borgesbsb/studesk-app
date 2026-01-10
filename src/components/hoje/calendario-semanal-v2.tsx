'use client'

import { format, addDays, isSameDay, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { useDashboard } from '@/contexts/dashboard-context'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"

export function CalendarioSemanal() {
  const hoje = useMemo(() => startOfDay(new Date()), [])
  const { selectedDate, setSelectedDate } = useDashboard()
  const [offset, setOffset] = useState(0) // Controla qual semana mostrar

  // Gerar 7 dias baseado no offset atual
  const gerarDias = () => {
    const dias = []
    const inicio = offset - 3 // -3 para começar 3 dias antes do dia central
    for (let i = inicio; i < inicio + 7; i++) {
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

  const selecionarDia = (data: Date) => {
    setSelectedDate(data)
  }

  const proximoDia = () => {
    setOffset(prev => prev + 1)
  }

  const diaAnterior = () => {
    setOffset(prev => prev - 1)
  }

  const goToToday = () => {
    setSelectedDate(hoje)
    setOffset(0)
  }

  const mesAno = format(hoje, "MMMM 'de' yyyy", { locale: ptBR })

  return (
    <Card className="w-full max-w-full overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            {mesAno}
          </CardTitle>
          <button
            onClick={goToToday}
            className="text-sm text-primary font-medium hover:underline"
          >
            Hoje
          </button>
        </div>
      </CardHeader>

      {/* Cards dos dias */}
      <CardContent className="pt-0 overflow-hidden min-w-0">
        <div className="relative min-w-0">
          <div className="flex gap-3 pb-2 justify-between">
            {diasVisiveis.map((dia, index) => (
              <button
                key={dia.offset}
                onClick={() => selecionarDia(dia.data)}
                style={{
                  flex: '0 0 calc((100% - 72px) / 7)'
                }}
                className={`
                  flex flex-col items-center justify-center
                  h-24 rounded-2xl border-2 transition-all duration-300
                  ${
                    dia.isSelecionado
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                      : dia.isHoje
                      ? 'bg-primary/10 text-primary border-primary/30 shadow-md'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/30'
                  }
                `}
              >
                {/* Dia da semana */}
                <span className={`text-xs font-medium uppercase mb-1 ${
                  dia.isSelecionado ? 'opacity-90' : dia.isHoje ? 'opacity-80' : 'opacity-70'
                }`}>
                  {dia.diaSemana}
                </span>

                {/* Número do dia */}
                <span className={`text-2xl font-bold leading-none mb-1`}>
                  {dia.dia}
                </span>

                {/* Mês (apenas no dia 1) */}
                {dia.dia === '1' && (
                  <span className={`text-xs mt-1 ${
                    dia.isSelecionado ? 'opacity-70' : dia.isHoje ? 'opacity-60' : 'opacity-50'
                  }`}>
                    {dia.mes}
                  </span>
                )}

                {/* Indicador de selecionado */}
                {dia.isSelecionado && (
                  <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full mt-2" />
                )}

                {/* Indicador de hoje (quando não está selecionado) */}
                {dia.isHoje && !dia.isSelecionado && (
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Botões de navegação */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="icon"
            onClick={diaAnterior}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={proximoDia}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Data selecionada */}
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
