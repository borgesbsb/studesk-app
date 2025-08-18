'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { WizardAdicionarCiclo } from './wizard-adicionar-ciclo'
import { DisciplinaPlanejada } from './planejamento-disciplinas'
import { 
  Plus, Calendar, Clock, FileText, Video, Book, 
  Users, Edit, Trash2, Target
} from 'lucide-react'

interface Semana {
  numero: number
  dataInicio: Date
  dataFim: Date
  disciplinas: DisciplinaPlanejada[]
}

interface GerenciarCiclosProps {
  semanas: Semana[]
  onSemanasChange: (semanas: Semana[]) => void
}

const tiposVeiculo = [
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'video', label: 'Vídeo', icon: Video },
  { value: 'livro', label: 'Livro', icon: Book },
  { value: 'apostila', label: 'Apostila', icon: FileText }
]

const diasSemana = [
  { key: 'seg', label: 'Seg', nome: 'Segunda' },
  { key: 'ter', label: 'Ter', nome: 'Terça' },
  { key: 'qua', label: 'Qua', nome: 'Quarta' },
  { key: 'qui', label: 'Qui', nome: 'Quinta' },
  { key: 'sex', label: 'Sex', nome: 'Sexta' },
  { key: 'sab', label: 'Sáb', nome: 'Sábado' },
  { key: 'dom', label: 'Dom', nome: 'Domingo' }
]

export function GerenciarCiclos({ semanas, onSemanasChange }: GerenciarCiclosProps) {
  const [wizardAberto, setWizardAberto] = useState(false)
  const [semanaAtual, setSemanaAtual] = useState<number | null>(null)

  const handleAdicionarCiclo = (numeroSemana: number) => {
    setSemanaAtual(numeroSemana)
    setWizardAberto(true)
  }

  const handleConfirmarCiclo = (disciplinas: DisciplinaPlanejada[]) => {
    if (semanaAtual === null) return

    const novasSemanas = semanas.map(semana => {
      if (semana.numero === semanaAtual) {
        return {
          ...semana,
          disciplinas: [...semana.disciplinas, ...disciplinas]
        }
      }
      return semana
    })

    onSemanasChange(novasSemanas)
    setSemanaAtual(null)
  }

  const handleRemoverDisciplina = (numeroSemana: number, disciplinaIndex: number) => {
    const novasSemanas = semanas.map(semana => {
      if (semana.numero === numeroSemana) {
        const novasDisciplinas = semana.disciplinas.filter((_, index) => index !== disciplinaIndex)
        return { ...semana, disciplinas: novasDisciplinas }
      }
      return semana
    })
    onSemanasChange(novasSemanas)
  }

  const formatarData = (data: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    }).format(data)
  }

  const getVeiculoIcon = (tipoVeiculo: string) => {
    const veiculo = tiposVeiculo.find(v => v.value === tipoVeiculo)
    return veiculo?.icon || FileText
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Gerenciar Ciclos de Estudo</h2>
        <p className="text-muted-foreground">
          Configure as disciplinas e cronograma para cada semana do seu plano
        </p>
      </div>

      <div className="grid gap-6">
        {semanas.map((semana) => {
          const totalHoras = semana.disciplinas.reduce((total, d) => total + d.horasPlanejadas, 0)
          
          return (
            <Card key={semana.numero}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5" />
                      <span>Ciclo {semana.numero}</span>
                    </CardTitle>
                    <CardDescription>
                      {formatarData(semana.dataInicio)} - {formatarData(semana.dataFim)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{totalHoras}h/semana</span>
                    </Badge>
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>{semana.disciplinas.length} disciplinas</span>
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {semana.disciplinas.length > 0 ? (
                  <div className="space-y-3">
                    {semana.disciplinas.map((disciplina, index) => {
                      const VeiculoIcon = getVeiculoIcon(disciplina.tipoVeiculo)
                      const diasFormatados = (disciplina.diasEstudo || [])
                        .map(dia => diasSemana.find(d => d.key === dia)?.label)
                        .filter(Boolean)
                        .join(', ')

                      return (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{disciplina.disciplinaNome}</h4>
                              <Badge variant="outline" className="flex items-center space-x-1">
                                <VeiculoIcon className="h-3 w-3" />
                                <span>{tiposVeiculo.find(v => v.value === disciplina.tipoVeiculo)?.label}</span>
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{disciplina.horasPlanejadas}h/semana</span>
                              </div>
                              {diasFormatados && (
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{diasFormatados}</span>
                                </div>
                              )}
                            </div>
                            {disciplina.parametro && (
                              <p className="text-sm text-muted-foreground">
                                {disciplina.parametro}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoverDisciplina(semana.numero, index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma disciplina configurada para este ciclo</p>
                  </div>
                )}

                <Separator />

                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => handleAdicionarCiclo(semana.numero)}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Adicionar Disciplinas</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Wizard */}
      <WizardAdicionarCiclo
        isOpen={wizardAberto}
        onClose={() => {
          setWizardAberto(false)
          setSemanaAtual(null)
        }}
        onConfirm={handleConfirmarCiclo}
        semanaNumero={semanaAtual || 1}
      />
    </div>
  )
}