"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { useState, useEffect } from "react"
import { getAgendaMensal, type AgendaMensal, type DisciplinaAgenda } from "@/interface/actions/agenda/get-agenda-mensal"
import { debugBanco } from "@/interface/actions/agenda/debug-banco"

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [agendaData, setAgendaData] = useState<AgendaMensal | null>(null)
  const [loading, setLoading] = useState(true)
  const [todasDisciplinas, setTodasDisciplinas] = useState<DisciplinaAgenda[]>([])

  // Carregar dados da agenda
  useEffect(() => {
    const carregarAgenda = async () => {
      setLoading(true)
      try {
        const data = await getAgendaMensal(currentDate.getFullYear(), currentDate.getMonth() + 1)
        setAgendaData(data)
        
        // Extrair todas as disciplinas únicas para a legenda
        const disciplinasUnicas = new Map<string, DisciplinaAgenda>()
        if (data && data.dias) {
          Object.values(data.dias).forEach(disciplinasDoDia => {
            disciplinasDoDia.forEach(disciplina => {
              disciplinasUnicas.set(disciplina.id, disciplina)
            })
          })
        }
        setTodasDisciplinas(Array.from(disciplinasUnicas.values()))
      } catch (error) {
        console.error("Erro ao carregar agenda:", error)
      } finally {
        setLoading(false)
      }
    }

    carregarAgenda()
  }, [currentDate])
  
  // Função para obter os dias do mês
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Adicionar dias vazios do início
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Adicionar dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const days = getDaysInMonth(currentDate)

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Agenda</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            Carregando agenda...
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Agenda</h1>
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              const result = await debugBanco()
              console.log("Resultado debug:", result)
            }}
          >
            Debug DB
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-lg font-semibold min-w-[180px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center font-semibold text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => (
              <Card
                key={index}
                className={`
                  min-h-[120px] p-2 transition-all hover:shadow-md
                  ${day ? 'cursor-pointer hover:bg-accent/50' : 'invisible'}
                  ${day && agendaData?.dias?.[day] ? 'ring-2 ring-primary/20' : ''}
                `}
              >
                {day && (
                  <CardContent className="p-0 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm">{day}</span>
                      {agendaData?.dias?.[day] && (
                        <Badge variant="secondary" className="text-xs px-1">
                          {agendaData.dias[day].length}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Disciplinas do dia */}
                    <div className="space-y-1">
                      {agendaData?.dias[day]?.map((disciplina, idx) => (
                        <div
                          key={idx}
                          className={`
                            ${disciplina.cor || 'bg-gray-500'} text-white text-xs px-2 py-1 rounded
                            truncate font-medium
                          `}
                          title={disciplina.nome}
                        >
                          {disciplina.nome}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Disciplinas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {todasDisciplinas.map(disciplina => (
              <div key={disciplina.id} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${disciplina.cor || 'bg-gray-500'}`}></div>
                <span className="text-sm">{disciplina.nome}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}