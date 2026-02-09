"use client"

import { useState, useEffect, Fragment } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react"
import { listarSimulados } from "@/interface/actions/simulado/list"
import { getDisciplinasDoSimulado } from "@/interface/actions/simulado/get-disciplinas"
import { deletarSimulado } from "@/interface/actions/simulado/delete"
import { useToast } from "@/components/ui/use-toast"
import { SimuladoComMetrics } from "@/application/services/simulado.service"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Questao {
  id: string
  ordem: number
  respostaCorreta: string
  respostaUsuario: string | null
  acertou: boolean | null
}

interface DisciplinaMetrics {
  id: string
  disciplina: {
    id: string
    nome: string
    cor: string | null
  }
  questoes: Questao[]
  totalQuestoes: number
  questoesRespondidas: number
  acertos: number
  erros: number
  percentualAcerto: number
  statusCor: 'vermelho' | 'amarelo' | 'verde'
  limiteVermelho: number
  limiteAmarelo: number
}

interface SimuladosTableProps {
  termoPesquisa?: string
}

export function SimuladosTable({ termoPesquisa = "" }: SimuladosTableProps) {
  const { toast } = useToast()
  const [simulados, setSimulados] = useState<SimuladoComMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [disciplinas, setDisciplinas] = useState<Record<string, DisciplinaMetrics[]>>({})
  const [loadingDisciplinas, setLoadingDisciplinas] = useState<Set<string>>(new Set())
  const [deletando, setDeletando] = useState<Set<string>>(new Set())

  useEffect(() => {
    carregarSimulados()
  }, [])

  const carregarSimulados = async () => {
    setLoading(true)
    try {
      const response = await listarSimulados()
      if (response.success && response.data) {
        setSimulados(response.data)
      }
    } catch (error) {
      console.error("Erro ao carregar simulados:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleRow = async (simuladoId: string) => {
    const newExpandedRows = new Set(expandedRows)

    if (expandedRows.has(simuladoId)) {
      newExpandedRows.delete(simuladoId)
    } else {
      newExpandedRows.add(simuladoId)

      // Carregar disciplinas se ainda não foram carregadas
      if (!disciplinas[simuladoId]) {
        setLoadingDisciplinas(prev => new Set(prev).add(simuladoId))
        try {
          const response = await getDisciplinasDoSimulado(simuladoId)
          if (response.success && response.data) {
            setDisciplinas(prev => ({
              ...prev,
              [simuladoId]: response.data
            }))
          }
        } catch (error) {
          console.error("Erro ao carregar disciplinas:", error)
        } finally {
          setLoadingDisciplinas(prev => {
            const newSet = new Set(prev)
            newSet.delete(simuladoId)
            return newSet
          })
        }
      }
    }

    setExpandedRows(newExpandedRows)
  }

  const handleDeletar = async (simuladoId: string, nomeSimulado: string) => {
    if (!confirm(`Tem certeza que deseja deletar o simulado "${nomeSimulado}"?\n\nEsta ação não pode ser desfeita.`)) {
      return
    }

    setDeletando(prev => new Set(prev).add(simuladoId))
    try {
      const response = await deletarSimulado(simuladoId)

      if (response.success) {
        toast({
          title: "Sucesso!",
          description: "Simulado deletado com sucesso",
        })
        // Remover da lista local
        setSimulados(prev => prev.filter(s => s.id !== simuladoId))
      } else {
        toast({
          title: "Erro",
          description: response.error || "Erro ao deletar simulado",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao deletar simulado",
        variant: "destructive",
      })
    } finally {
      setDeletando(prev => {
        const newSet = new Set(prev)
        newSet.delete(simuladoId)
        return newSet
      })
    }
  }

  const simuladosFiltrados = simulados.filter(simulado =>
    simulado.nome.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
    simulado.descricao?.toLowerCase().includes(termoPesquisa.toLowerCase())
  )

  const getStatusCorBadge = (statusCor: 'vermelho' | 'amarelo' | 'verde') => {
    const configs = {
      vermelho: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', label: 'Crítico' },
      amarelo: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', label: 'Atenção' },
      verde: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', label: 'Bom' }
    }

    const config = configs[statusCor]
    return (
      <Badge className={`${config.bg} ${config.text} hover:${config.bg}`}>
        {config.label}
      </Badge>
    )
  }

  const getPercentualColor = (percentual: number) => {
    if (percentual >= 70) return "text-green-600 dark:text-green-400 font-semibold"
    if (percentual >= 50) return "text-yellow-600 dark:text-yellow-400 font-semibold"
    return "text-red-600 dark:text-red-400 font-semibold"
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    )
  }

  if (simuladosFiltrados.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-sm">
          {termoPesquisa ? "Nenhum simulado encontrado com esse termo de pesquisa." : "Nenhum simulado cadastrado ainda."}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted">
            <TableHead className="w-12"></TableHead>
            <TableHead className="font-semibold">Nome do Simulado</TableHead>
            <TableHead className="font-semibold">Ciclo</TableHead>
            <TableHead className="font-semibold text-center">Data de Realização</TableHead>
            <TableHead className="font-semibold text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {simuladosFiltrados.map((simulado) => (
            <Fragment key={simulado.id}>
              <TableRow className="hover:bg-muted/50 cursor-pointer">
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => toggleRow(simulado.id)}
                  >
                    {expandedRows.has(simulado.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-medium" onClick={() => toggleRow(simulado.id)}>
                  <div>
                    <p className="font-semibold text-card-foreground">{simulado.nome}</p>
                    {simulado.descricao && (
                      <p className="text-sm text-muted-foreground mt-1">{simulado.descricao}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={() => toggleRow(simulado.id)}>
                  {simulado.semanaEstudo ? (
                    <span className="text-sm text-foreground">
                      {simulado.semanaEstudo.plano.nome} - Ciclo {simulado.semanaEstudo.numeroSemana}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm text-foreground" onClick={() => toggleRow(simulado.id)}>
                  {format(new Date(simulado.dataRealizacao), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletar(simulado.id, simulado.nome)
                      }}
                      disabled={deletando.has(simulado.id)}
                    >
                      {deletando.has(simulado.id) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>

              {/* Linha expandida com disciplinas */}
              {expandedRows.has(simulado.id) && (
                <TableRow key={`${simulado.id}-expanded`}>
                  <TableCell colSpan={5} className="bg-muted p-0">
                    {loadingDisciplinas.has(simulado.id) ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
                      </div>
                    ) : disciplinas[simulado.id] && disciplinas[simulado.id].length > 0 ? (
                      <div className="p-6">
                        <h4 className="text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2">
                          <div className="w-1 h-4 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                          Disciplinas do Simulado
                        </h4>

                        <div className="space-y-4">
                          {disciplinas[simulado.id].map((disc) => (
                            <div key={disc.id} className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-sm transition-shadow">
                              {/* Header da Disciplina */}
                              <div className="px-4 py-3 bg-muted border-b border-border">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {disc.disciplina.cor && (
                                      <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: disc.disciplina.cor }}
                                      />
                                    )}
                                    <span className="font-semibold text-card-foreground text-sm">{disc.disciplina.nome}</span>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-muted-foreground">Acertos:</span>
                                      <span className="font-semibold text-green-600 dark:text-green-400">{disc.acertos}</span>
                                      <span className="text-muted-foreground">/</span>
                                      <span className="font-semibold text-foreground">{disc.totalQuestoes}</span>
                                    </div>
                                    <div className={`text-sm font-bold ${getPercentualColor(disc.percentualAcerto)}`}>
                                      {disc.percentualAcerto.toFixed(1)}%
                                    </div>
                                    {getStatusCorBadge(disc.statusCor)}
                                  </div>
                                </div>
                              </div>

                              {/* Grid de Questões */}
                              {disc.questoes.length > 0 && (
                                <div className="p-4 bg-card">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                                    {disc.questoes.map((questao) => (
                                      <div
                                        key={questao.id}
                                        className={`group relative flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${
                                          questao.acertou === true
                                            ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                                            : questao.acertou === false
                                            ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30'
                                            : 'bg-muted border-border hover:bg-muted/80'
                                        }`}
                                      >
                                        {/* Número da questão */}
                                        <div className="text-[10px] font-medium text-muted-foreground mb-1">
                                          Q{questao.ordem}
                                        </div>

                                        {/* Respostas lado a lado */}
                                        <div className="flex items-center gap-1.5">
                                          {/* Resposta Oficial */}
                                          <div className="flex flex-col items-center">
                                            <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Oficial</span>
                                            <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                                              {questao.respostaCorreta}
                                            </span>
                                          </div>

                                          <div className="w-px h-6 bg-border"></div>

                                          {/* Resposta do Usuário */}
                                          <div className="flex flex-col items-center">
                                            <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Sua</span>
                                            <span
                                              className={`text-sm font-bold ${
                                                questao.acertou === true
                                                  ? 'text-green-700 dark:text-green-400'
                                                  : questao.acertou === false
                                                  ? 'text-red-700 dark:text-red-400'
                                                  : 'text-muted-foreground'
                                              }`}
                                            >
                                              {questao.respostaUsuario || '-'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">Nenhuma disciplina cadastrada para este simulado.</p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
