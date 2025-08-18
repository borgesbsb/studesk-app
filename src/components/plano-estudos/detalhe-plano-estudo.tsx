'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPlanoEstudoById } from '@/interface/actions/plano-estudo/get-by-id'
import { updateProgressoEstudo } from '@/interface/actions/plano-estudo/update-progresso'
import { Calendar, Clock, Target, Book, FileText, Video, Save } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

interface SemanaEstudoDetalhe {
  id: string
  numeroSemana: number
  dataInicio: string | Date
  dataFim: string | Date
  totalHoras: number
  horasRealizadas: number
  observacoes?: string | null
  disciplinas: DisciplinaSemana[]
}

interface PlanoEstudoDetalhe {
  id: string
  nome: string
  descricao?: string | null
  dataInicio: string | Date
  dataFim: string | Date
  ativo: boolean
  concurso?: {
    id: string
    nome: string
    orgao: string
    cargo: string
  } | null
  semanas: SemanaEstudoDetalhe[]
}

interface DetalhePlanoEstudoProps {
  planoId: string
}

export function DetalhePlanoEstudo({ planoId }: DetalhePlanoEstudoProps) {
  const [plano, setPlano] = useState<PlanoEstudoDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [questoesEditadas, setQuestoesEditadas] = useState<Record<string, number>>({})
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  

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

  const atualizarQuestoes = async (disciplina: DisciplinaSemana, novasQuestoes: number) => {
    try {
      setSalvandoId(disciplina.id)
      const resultado = await updateProgressoEstudo({
        disciplinaSemanaId: disciplina.id,
        horasRealizadas: disciplina.horasRealizadas,
        concluida: disciplina.concluida,
        observacoes: disciplina.observacoes,
        questoesRealizadas: novasQuestoes,
      })

      if (resultado.success) {
        toast.success('Questões atualizadas!')
        carregarPlano()
        setQuestoesEditadas(prev => {
          const novo = { ...prev }
          delete novo[disciplina.id]
          return novo
        })
      } else {
        toast.error(resultado.error || 'Erro ao atualizar questões')
      }
    } catch (error) {
      toast.error('Erro inesperado ao salvar')
    } finally {
      setSalvandoId(null)
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

      {/* Semanas em tabela */}
      <div className="space-y-6">
        {plano.semanas.map((semana) => {
          const progressoSemana = semana.totalHoras > 0 
            ? (semana.horasRealizadas / semana.totalHoras) * 100 
            : 0

          return (
            <div key={semana.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
                        {semana.numeroSemana}
                      </span>
                      Ciclo de Estudo {semana.numeroSemana}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(semana.dataInicio), 'dd/MM', { locale: ptBR })} - {format(new Date(semana.dataFim), 'dd/MM/yyyy', { locale: ptBR })} • {semana.disciplinas.length} disciplina{semana.disciplinas.length !== 1 ? 's' : ''}
                  </p>
                  </div>
                  <div className="text-right">
                  <Badge variant="outline">{semana.horasRealizadas}h / {semana.totalHoras}h</Badge>
                  <p className="text-sm text-muted-foreground mt-1">{Math.round(progressoSemana)}% concluído</p>
                </div>
                </div>
                <Progress value={progressoSemana} className="h-1" />

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Disciplina</TableHead>
                      <TableHead className="min-w-[220px]">Horas planejadas</TableHead>
                      <TableHead className="w-[160px]">% Horas</TableHead>
                      <TableHead>Questões</TableHead>
                      <TableHead>Vídeo (min)</TableHead>
                      <TableHead>Páginas</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {semana.disciplinas.map((disciplina) => {
                    const IconeVeiculo = obterIconeVeiculo(disciplina.tipoVeiculo)
                      const progressoHoras = disciplina.horasPlanejadas > 0
                        ? (disciplina.horasRealizadas / disciplina.horasPlanejadas) * 100
                        : 0
                      const valorQuestoesAtual =
                        questoesEditadas[disciplina.id] !== undefined
                          ? questoesEditadas[disciplina.id]
                          : disciplina.questoesRealizadas
                      const progressoQuestoes = disciplina.questoesPlanejadas > 0
                        ? (valorQuestoesAtual / disciplina.questoesPlanejadas) * 100
                        : 0
                      const progressoPaginas = disciplina.totalPaginas > 0
                        ? (disciplina.paginasLidas / disciplina.totalPaginas) * 100
                        : 0
                    
                    return (
                        <TableRow key={disciplina.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <IconeVeiculo className="h-4 w-4 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span className="font-medium">{disciplina.disciplina.nome}</span>
                                  {disciplina.concluida && (
                                  <div className="mt-1">
                                    <Badge variant="outline" className="text-xs text-green-600">Concluída</Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{disciplina.horasPlanejadas}h</span>
                          </TableCell>
                          <TableCell>
                            <Progress value={progressoHoras} className="h-1" />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Input
                                  className="w-24"
                                  type="number"
                                  min="0"
                                  value={valorQuestoesAtual}
                                  onChange={(e) => {
                                    const valor = parseInt(e.target.value) || 0
                                    setQuestoesEditadas(prev => ({ ...prev, [disciplina.id]: valor }))
                                  }}
                                />
                                {disciplina.questoesPlanejadas > 0 && (
                                  <span className="text-sm text-muted-foreground">/ {disciplina.questoesPlanejadas}</span>
                                )}
                                {valorQuestoesAtual !== disciplina.questoesRealizadas && (
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="h-8 w-8"
                                    onClick={() => atualizarQuestoes(disciplina, valorQuestoesAtual)}
                                    disabled={salvandoId === disciplina.id}
                                    aria-label="Salvar questões resolvidas"
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              <Progress value={progressoQuestoes} className="h-1" />
                            </div>
                          </TableCell>
                          <TableCell>
                            {disciplina.tipoVeiculo === 'video' && disciplina.tempoVideoPlanejado > 0 ? (
                              <div className="space-y-1">
                                <div className="text-sm">{disciplina.tempoVideoRealizado} / {disciplina.tempoVideoPlanejado}</div>
                                <Progress value={disciplina.tempoVideoPlanejado > 0 ? (disciplina.tempoVideoRealizado / disciplina.tempoVideoPlanejado) * 100 : 0} className="h-1" />
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {disciplina.tipoVeiculo !== 'video' && disciplina.totalPaginas > 0 ? (
                              <div className="space-y-1">
                                <div className="text-sm">{disciplina.paginasLidas} / {disciplina.totalPaginas}</div>
                                <Progress value={progressoPaginas} className="h-1" />
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[320px]">
                            {disciplina.observacoes ? (
                              <p className="text-sm text-muted-foreground line-clamp-3">{disciplina.observacoes}</p>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
                </div>
          )
        })}
      </div>
    </div>
  )
}
