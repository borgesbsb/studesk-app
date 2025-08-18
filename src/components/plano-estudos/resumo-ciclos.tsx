'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DisciplinaPlanejada } from './planejamento-disciplinas'
import { Copy, BookOpen, Clock, Target, FileText, Video, Book } from 'lucide-react'
import { toast } from 'sonner'

interface CicloResumo {
  numero: number
  disciplinas: DisciplinaPlanejada[]
  totalHoras: number
}

interface ResumoCiclosProps {
  ciclos: CicloResumo[]
  onCopiarCiclo: (cicloOrigemIndex: number, cicloDestinoIndex: number) => void
}

export function ResumoCiclos({ ciclos, onCopiarCiclo }: ResumoCiclosProps) {
  const obterIconeVeiculo = (tipo: string) => {
    switch (tipo) {
      case 'video': return Video
      case 'pdf': return FileText
      case 'livro': return Book
      case 'apostila': return FileText
      default: return Book
    }
  }

  const calcularEstatisticasGerais = () => {
    const totalHoras = ciclos.reduce((acc, ciclo) => acc + ciclo.totalHoras, 0)
    const totalDisciplinas = ciclos.reduce((acc, ciclo) => acc + ciclo.disciplinas.length, 0)
    const totalQuestoes = ciclos.reduce((acc, ciclo) => 
      acc + ciclo.disciplinas.reduce((q, d) => q + d.questoesPlanejadas, 0), 0
    )
    
    // Calcular disciplinas únicas
    const disciplinasUnicas = new Set()
    ciclos.forEach(ciclo => {
      ciclo.disciplinas.forEach(d => disciplinasUnicas.add(d.disciplinaId))
    })

    return {
      totalHoras,
      totalDisciplinas,
      totalQuestoes,
      disciplinasUnicas: disciplinasUnicas.size,
      mediaCiclo: totalHoras / ciclos.length || 0
    }
  }

  const copiarCiclo = (cicloOrigem: number, cicloDestino: number) => {
    onCopiarCiclo(cicloOrigem, cicloDestino)
    toast.success(`Disciplinas do Ciclo ${cicloOrigem + 1} copiadas para o Ciclo ${cicloDestino + 1}`)
  }

  const stats = calcularEstatisticasGerais()

  return (
    <div className="space-y-6">
      {/* Estatísticas Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Resumo Geral do Plano
          </CardTitle>
          <CardDescription>
            Visão geral de todos os ciclos de estudo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{ciclos.length}</p>
              <p className="text-sm text-muted-foreground">Ciclos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalHoras}h</p>
              <p className="text-sm text-muted-foreground">Total de Horas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalDisciplinas}</p>
              <p className="text-sm text-muted-foreground">Disciplinas Planejadas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.disciplinasUnicas}</p>
              <p className="text-sm text-muted-foreground">Disciplinas Únicas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{Math.round(stats.mediaCiclo)}h</p>
              <p className="text-sm text-muted-foreground">Média por Ciclo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo dos Ciclos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Visão dos Ciclos
          </CardTitle>
          <CardDescription>
            Compare e gerencie seus ciclos de estudo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ciclos.map((ciclo, index) => (
              <div key={ciclo.numero} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">
                      {ciclo.numero}
                    </span>
                    Ciclo {ciclo.numero}
                  </h3>
                  <Badge variant="outline">
                    {ciclo.totalHoras}h
                  </Badge>
                </div>

                {ciclo.disciplinas.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhuma disciplina configurada
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {ciclo.disciplinas.length} disciplina{ciclo.disciplinas.length !== 1 ? 's' : ''}
                    </div>
                    
                    <div className="space-y-1">
                      {ciclo.disciplinas.slice(0, 3).map((disciplina, idx) => {
                        const IconeVeiculo = obterIconeVeiculo(disciplina.tipoVeiculo)
                        return (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <IconeVeiculo className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate flex-1">{disciplina.disciplinaNome}</span>
                            <span className="text-muted-foreground">{disciplina.horasPlanejadas}h</span>
                          </div>
                        )
                      })}
                      {ciclo.disciplinas.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{ciclo.disciplinas.length - 3} disciplinas...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Botões de Ação */}
                {ciclo.disciplinas.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Copiar para outro ciclo:</p>
                    <div className="flex gap-1 flex-wrap">
                      {ciclos.map((_, destIndex) => {
                        if (destIndex === index) return null
                        return (
                          <Button
                            key={destIndex}
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => copiarCiclo(index, destIndex)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            {destIndex + 1}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
