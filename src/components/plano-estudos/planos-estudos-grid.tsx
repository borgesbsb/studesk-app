'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getAllPlanosEstudo } from '@/interface/actions/plano-estudo/get-all'
import { Calendar, Clock, Target, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PlanoEstudo {
  id: string
  nome: string
  descricao?: string | null
  dataInicio: string | Date
  dataFim: string | Date
  ativo: boolean
  semanas: Array<{
    id: string
    numeroSemana: number
    totalHoras: number
    horasRealizadas: number
    disciplinas: Array<{
      id: string
      horasPlanejadas: number
      horasRealizadas: number
      concluida: boolean
      disciplina: {
        nome: string
      }
    }>
  }>
}

export function PlanosEstudoGrid() {
  const [planos, setPlanos] = useState<PlanoEstudo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregarPlanos = async () => {
      try {
        const resultado = await getAllPlanosEstudo()
        if (resultado.success && resultado.data) {
          setPlanos(resultado.data)
        }
      } catch (error) {
        console.error('Erro ao carregar planos:', error)
      } finally {
        setLoading(false)
      }
    }

    carregarPlanos()
  }, [])

  const calcularEstatisticas = (plano: PlanoEstudo) => {
    const totalHorasPlanejadas = plano.semanas.reduce((acc, s) => acc + s.totalHoras, 0)
    const totalHorasRealizadas = plano.semanas.reduce((acc, s) => acc + s.horasRealizadas, 0)
    const progresso = totalHorasPlanejadas > 0 ? (totalHorasRealizadas / totalHorasPlanejadas) * 100 : 0
    
    return {
      totalHorasPlanejadas,
      totalHorasRealizadas,
      progresso: Math.round(progresso)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (planos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum plano encontrado</h3>
          <p className="text-muted-foreground text-center mb-4">
            Comece criando seu primeiro plano de estudos para organizar sua rotina.
          </p>
          <Link href="/plano-estudos/criar">
            <Button>Criar Primeiro Plano</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {planos.map((plano) => {
        const stats = calcularEstatisticas(plano)
        
        return (
          <Card key={plano.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{plano.nome}</CardTitle>
                  <CardDescription>{plano.descricao}</CardDescription>
                </div>
                <div className="flex flex-col gap-2">
                  <Badge variant={plano.ativo ? "default" : "secondary"}>
                    {plano.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Período */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(plano.dataInicio), "dd/MM/yyyy", { locale: ptBR })} - {" "}
                  {format(new Date(plano.dataFim), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>

              {/* Progresso */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    Progresso
                  </span>
                  <span className="font-medium">{stats.progresso}%</span>
                </div>
                <Progress value={stats.progresso} />
              </div>

              {/* Horas */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {stats.totalHorasRealizadas}h / {stats.totalHorasPlanejadas}h
                </span>
              </div>

              {/* Semanas */}
              <div className="text-sm text-muted-foreground">
                {plano.semanas.length} semana{plano.semanas.length !== 1 ? 's' : ''}
              </div>

              {/* Ações */}
              <div className="flex gap-2 pt-2">
                <Link href={`/plano-estudos/${plano.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                </Link>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
