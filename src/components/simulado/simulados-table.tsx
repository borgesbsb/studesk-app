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
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react"
import { listarSimulados } from "@/interface/actions/simulado/list"
import { deletarSimulado } from "@/interface/actions/simulado/delete"
import { useToast } from "@/components/ui/use-toast"
import { SimuladoComMetrics, SimuladoService } from "@/application/services/simulado.service"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface SimuladosTableProps {
  termoPesquisa?: string
  onLoad?: (simulados: SimuladoComMetrics[]) => void
}

const getPercentualColor = (percentual: number) => {
  if (percentual >= 70) return "text-green-600 dark:text-green-400 font-bold"
  if (percentual >= 50) return "text-yellow-600 dark:text-yellow-400 font-bold"
  return "text-red-600 dark:text-red-400 font-bold"
}

const getBadge = (percentual: number) => {
  const cor = SimuladoService.getStatusCor(percentual)
  const configs = {
    vermelho: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Crítico' },
    amarelo: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', label: 'Atenção' },
    verde: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Bom' }
  }
  const c = configs[cor]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

export function SimuladosTable({ termoPesquisa = "", onLoad }: SimuladosTableProps) {
  const { toast } = useToast()
  const [simulados, setSimulados] = useState<SimuladoComMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
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
        onLoad?.(response.data)
      }
    } catch (error) {
      console.error("Erro ao carregar simulados:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleRow = (simuladoId: string) => {
    const newSet = new Set(expandedRows)
    if (newSet.has(simuladoId)) newSet.delete(simuladoId)
    else newSet.add(simuladoId)
    setExpandedRows(newSet)
  }

  const handleDeletar = async (simuladoId: string, nome: string) => {
    if (!confirm(`Deletar o simulado "${nome}"?\n\nEsta ação não pode ser desfeita.`)) return

    setDeletando(prev => new Set(prev).add(simuladoId))
    try {
      const response = await deletarSimulado(simuladoId)
      if (response.success) {
        toast({ title: "Sucesso!", description: "Simulado deletado com sucesso" })
        const novos = simulados.filter(s => s.id !== simuladoId)
        setSimulados(novos)
        onLoad?.(novos)
      } else {
        toast({ title: "Erro", description: response.error || "Erro ao deletar", variant: "destructive" })
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado ao deletar", variant: "destructive" })
    } finally {
      setDeletando(prev => { const s = new Set(prev); s.delete(simuladoId); return s })
    }
  }

  const simuladosFiltrados = simulados.filter(s =>
    s.nome.toLowerCase().includes(termoPesquisa.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    )
  }

  if (simuladosFiltrados.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-sm">
          {termoPesquisa ? "Nenhum simulado encontrado com esse termo." : "Nenhum simulado registrado ainda."}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted">
            <TableHead className="w-10" />
            <TableHead className="font-semibold">Simulado</TableHead>
            <TableHead className="font-semibold text-center">Data</TableHead>
            <TableHead className="font-semibold text-center">Acertos</TableHead>
            <TableHead className="font-semibold text-center">Aproveitamento</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {simuladosFiltrados.map((simulado) => (
            <Fragment key={simulado.id}>
              <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => toggleRow(simulado.id)}>
                <TableCell className="text-center">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); toggleRow(simulado.id) }}>
                    {expandedRows.has(simulado.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-semibold text-card-foreground">{simulado.nome}</p>
                    {simulado.config && (
                      <p className="text-xs text-muted-foreground mt-0.5">{simulado.config.nome}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center text-sm">
                  {format(new Date(simulado.dataRealizacao), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-center text-sm">
                  <span className="font-medium">{simulado.totalAcertos}</span>
                  <span className="text-muted-foreground">/{simulado.totalQuestoes}</span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-sm ${getPercentualColor(simulado.percentualGeral)}`}>
                      {simulado.percentualGeral.toFixed(1)}%
                    </span>
                    {getBadge(simulado.percentualGeral)}
                  </div>
                </TableCell>
                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400"
                    onClick={() => handleDeletar(simulado.id, simulado.nome)}
                    disabled={deletando.has(simulado.id)}
                  >
                    {deletando.has(simulado.id)
                      ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                      : <Trash2 className="h-4 w-4" />}
                  </Button>
                </TableCell>
              </TableRow>

              {expandedRows.has(simulado.id) && (
                <TableRow>
                  <TableCell colSpan={6} className="bg-muted/50 p-0">
                    <div className="p-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Resultado por Disciplina
                      </h4>
                      {simulado.disciplinas.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {simulado.disciplinas.map((disc) => (
                            <div
                              key={disc.id}
                              className="flex items-center justify-between bg-card rounded-lg border border-border px-3 py-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {disc.disciplina.cor && (
                                  <div
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: disc.disciplina.cor }}
                                  />
                                )}
                                <span className="text-sm font-medium truncate">{disc.disciplina.nome}</span>
                              </div>
                              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                <span className="text-xs text-muted-foreground">
                                  {disc.acertos}/{disc.totalQuestoes}
                                </span>
                                <span className={`text-xs font-bold ${getPercentualColor(disc.percentual)}`}>
                                  {disc.percentual.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma disciplina registrada.</p>
                      )}
                    </div>
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
