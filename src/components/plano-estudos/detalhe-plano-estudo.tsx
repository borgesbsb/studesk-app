'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { getPlanoEstudoById } from '@/interface/actions/plano-estudo/get-by-id'
import { updateProgressoEstudo } from '@/interface/actions/plano-estudo/update-progresso'
import { Calendar, Clock, Target, Book, CheckCircle, Circle, Save, FileText, Video, Users, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface DisciplinaSemana {
  id: string
  horasPlanejadas: number
  horasRealizadas: number
  prioridade: number
  concluida: boolean
  observacoes?: string
  tipoVeiculo?: string
  materialUrl?: string
  materialNome?: string
  questoesPlanejadas: number
  questoesRealizadas: number
  tempoVideoPlanejado: number
  tempoVideoRealizado: number
  paginasLidas: number
  totalPaginas: number
  disciplina: {
    nome: string
  }
}

interface SemanaEstudo {
  id: string
  numeroSemana: number
  dataInicio: string
  dataFim: string
  totalHoras: number
  horasRealizadas: number
  observacoes?: string
  disciplinas: DisciplinaSemana[]
}

interface PlanoEstudo {
  id: string
  nome: string
  descricao?: string
  dataInicio: string
  dataFim: string
  ativo: boolean
  concurso?: {
    id: string
    nome: string
    orgao: string
    cargo: string
  }
  semanas: SemanaEstudo[]
}

interface DetalhePlanoEstudoProps {
  planoId: string
}

export function DetalhePlanoEstudo({ planoId }: DetalhePlanoEstudoProps) {
  const [plano, setPlano] = useState<PlanoEstudo | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)

  useEffect(() => {
    carregarPlano()
  }, [planoId])

  const carregarPlano = async () => {
    try {
      const resultado = await getPlanoEstudoById(planoId)
      if (resultado.success && resultado.data) {
        setPlano(resultado.data)
      }
    } catch (error) {
      console.error('Erro ao carregar plano:', error)
    } finally {
      setLoading(false)
    }
  }

  const calcularEstatisticas = () => {
    if (!plano) return { progresso: 0, totalHoras: 0, horasRealizadas: 0 }
    
    const totalHoras = plano.semanas.reduce((acc, s) => acc + s.totalHoras, 0)
    const horasRealizadas = plano.semanas.reduce((acc, s) => acc + s.horasRealizadas, 0)
    const progresso = totalHoras > 0 ? (horasRealizadas / totalHoras) * 100 : 0
    
    return { progresso: Math.round(progresso), totalHoras, horasRealizadas }
  }

  const obterCorPrioridade = (prioridade: number) => {
    switch (prioridade) {
      case 1: return 'destructive'
      case 2: return 'default'
      case 3: return 'secondary'
      default: return 'secondary'
    }
  }

  const obterTextoPrioridade = (prioridade: number) => {
    switch (prioridade) {
      case 1: return 'Alta'
      case 2: return 'Média'
      case 3: return 'Baixa'
      default: return 'Baixa'
    }
  }

  const obterIconeVeiculo = (tipo?: string) => {
    switch (tipo) {
      case 'video': return Video
      case 'pdf': return FileText
      case 'livro': return Book
      case 'apostila': return FileText
      default: return Book
    }
  }

  const obterLabelVeiculo = (tipo?: string) => {
    switch (tipo) {
      case 'video': return 'Vídeo'
      case 'pdf': return 'PDF'
      case 'livro': return 'Livro'
      case 'apostila': return 'Apostila'
      default: return 'Material'
    }
  }

  const salvarProgresso = async (disciplinaSemanaId: string, dados: {
    horasRealizadas: number
    concluida: boolean
    observacoes?: string
  }) => {
    setSalvando(disciplinaSemanaId)
    
    try {
      const resultado = await updateProgressoEstudo({
        disciplinaSemanaId,
        ...dados
      })

      if (resultado.success) {
        toast.success('Progresso salvo com sucesso!')
        carregarPlano() // Recarregar para atualizar os totais
      } else {
        toast.error(resultado.error || 'Erro ao salvar progresso')
      }
    } catch (error) {
      toast.error('Erro inesperado ao salvar')
    } finally {
      setSalvando(null)
    }
  }

  const atualizarHoras = async (disciplina: DisciplinaSemana, novasHoras: number) => {
    await salvarProgresso(disciplina.id, {
      horasRealizadas: novasHoras,
      concluida: disciplina.concluida,
      observacoes: disciplina.observacoes
    })
  }

  const alternarConclusao = async (disciplina: DisciplinaSemana) => {
    const novaConclusao = !disciplina.concluida
    const horasFinais = novaConclusao ? disciplina.horasPlanejadas : disciplina.horasRealizadas
    
    await salvarProgresso(disciplina.id, {
      horasRealizadas: horasFinais,
      concluida: novaConclusao,
      observacoes: disciplina.observacoes
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!plano) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <h3 className="text-lg font-semibold mb-2">Plano não encontrado</h3>
          <p className="text-muted-foreground">O plano de estudos solicitado não existe.</p>
        </CardContent>
      </Card>
    )
  }

  const stats = calcularEstatisticas()

  return (
    <div className="space-y-6">
      {/* Header do plano */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{plano.nome}</CardTitle>
              {plano.descricao && (
                <CardDescription className="mt-2">{plano.descricao}</CardDescription>
              )}
              {plano.concurso && (
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="outline">{plano.concurso.orgao}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {plano.concurso.nome} - {plano.concurso.cargo}
                  </span>
                </div>
              )}
            </div>
            <Badge variant={plano.ativo ? "default" : "secondary"}>
              {plano.ativo ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Período</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(plano.dataInicio), "dd/MM/yyyy", { locale: ptBR })} - {" "}
                  {format(new Date(plano.dataFim), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Horas</p>
                <p className="text-sm text-muted-foreground">
                  {stats.horasRealizadas}h / {stats.totalHoras}h
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Progresso</p>
                <p className="text-sm text-muted-foreground">{stats.progresso}%</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={stats.progresso} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Semanas */}
      <div className="space-y-4">
        {plano.semanas.map((semana) => {
          const progressoSemana = semana.totalHoras > 0 
            ? (semana.horasRealizadas / semana.totalHoras) * 100 
            : 0

          return (
            <Card key={semana.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
                        {semana.numeroSemana}
                      </span>
                      Ciclo de Estudo {semana.numeroSemana}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(semana.dataInicio), "dd/MM", { locale: ptBR })} - {" "}
                      {format(new Date(semana.dataFim), "dd/MM/yyyy", { locale: ptBR })} • {" "}
                      {semana.disciplinas.length} disciplina{semana.disciplinas.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">
                      {semana.horasRealizadas}h / {semana.totalHoras}h
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {Math.round(progressoSemana)}% concluído
                    </p>
                  </div>
                </div>
                <Progress value={progressoSemana} className="h-1" />
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {semana.disciplinas.map((disciplina) => {
                    const IconeVeiculo = obterIconeVeiculo(disciplina.tipoVeiculo)
                    
                    return (
                      <div key={disciplina.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => alternarConclusao(disciplina)}
                              disabled={salvando === disciplina.id}
                            >
                              {disciplina.concluida ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </Button>
                            <div className="flex items-center gap-2">
                              <IconeVeiculo className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <h4 className="font-medium">{disciplina.disciplina.nome}</h4>
                                <div className="flex items-center gap-2">
                                  <Badge variant={obterCorPrioridade(disciplina.prioridade)} className="text-xs">
                                    {obterTextoPrioridade(disciplina.prioridade)}
                                  </Badge>
                                  {disciplina.tipoVeiculo && (
                                    <Badge variant="outline" className="text-xs">
                                      {obterLabelVeiculo(disciplina.tipoVeiculo)}
                                    </Badge>
                                  )}
                                  {disciplina.concluida && (
                                    <Badge variant="outline" className="text-xs text-green-600">
                                      Concluída
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {disciplina.materialUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={disciplina.materialUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Abrir Material
                              </a>
                            </Button>
                          )}
                        </div>

                        {/* Material Info */}
                        {disciplina.materialNome && (
                          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm font-medium">📚 {disciplina.materialNome}</p>
                          </div>
                        )}
                        
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          {/* Horas */}
                          <div className="space-y-2">
                            <Label>Horas de Estudo</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                min="0"
                                max={disciplina.horasPlanejadas + 10}
                                value={disciplina.horasRealizadas}
                                onChange={(e) => {
                                  const valor = parseInt(e.target.value) || 0
                                  atualizarHoras(disciplina, valor)
                                }}
                              />
                              <span className="flex items-center text-sm text-muted-foreground">
                                / {disciplina.horasPlanejadas}h
                              </span>
                            </div>
                            <Progress 
                              value={(disciplina.horasRealizadas / disciplina.horasPlanejadas) * 100} 
                              className="h-1"
                            />
                          </div>

                          {/* Questões */}
                          {disciplina.questoesPlanejadas > 0 && (
                            <div className="space-y-2">
                              <Label>Questões</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={disciplina.questoesRealizadas}
                                  placeholder="0"
                                  disabled
                                />
                                <span className="flex items-center text-sm text-muted-foreground">
                                  / {disciplina.questoesPlanejadas}
                                </span>
                              </div>
                              <Progress 
                                value={disciplina.questoesPlanejadas > 0 ? (disciplina.questoesRealizadas / disciplina.questoesPlanejadas) * 100 : 0} 
                                className="h-1"
                              />
                            </div>
                          )}

                          {/* Vídeo */}
                          {disciplina.tipoVeiculo === 'video' && disciplina.tempoVideoPlanejado > 0 && (
                            <div className="space-y-2">
                              <Label>Tempo de Vídeo (min)</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={disciplina.tempoVideoRealizado}
                                  placeholder="0"
                                  disabled
                                />
                                <span className="flex items-center text-sm text-muted-foreground">
                                  / {disciplina.tempoVideoPlanejado}
                                </span>
                              </div>
                              <Progress 
                                value={disciplina.tempoVideoPlanejado > 0 ? (disciplina.tempoVideoRealizado / disciplina.tempoVideoPlanejado) * 100 : 0} 
                                className="h-1"
                              />
                            </div>
                          )}

                          {/* Páginas */}
                          {disciplina.tipoVeiculo !== 'video' && disciplina.totalPaginas > 0 && (
                            <div className="space-y-2">
                              <Label>Páginas Lidas</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={disciplina.paginasLidas}
                                  placeholder="0"
                                  disabled
                                />
                                <span className="flex items-center text-sm text-muted-foreground">
                                  / {disciplina.totalPaginas}
                                </span>
                              </div>
                              <Progress 
                                value={disciplina.totalPaginas > 0 ? (disciplina.paginasLidas / disciplina.totalPaginas) * 100 : 0} 
                                className="h-1"
                              />
                            </div>
                          )}
                        </div>
                        
                        {disciplina.observacoes && (
                          <div className="mt-4 space-y-2">
                            <Label>Observações</Label>
                            <p className="text-sm text-muted-foreground p-2 bg-muted/50 rounded">
                              {disciplina.observacoes}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
