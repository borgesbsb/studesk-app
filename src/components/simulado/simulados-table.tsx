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
import { deletarResultado } from "@/interface/actions/simulado/delete"
import { RegistrarAcertosModal } from "@/components/simulado/adicionar-simulado-modal"
import { useToast } from "@/components/ui/use-toast"
import { SimuladoEvento, SimuladoService } from "@/application/services/simulado.service"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface SimuladosTableProps {
  termoPesquisa?: string
  onLoad?: (simulados: SimuladoEvento[]) => void
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
  const [simulados, setSimulados] = useState<SimuladoEvento[]>([])
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

  const handleDeletarResultado = async (resultadoId: string, simuladoNome: string) => {
    if (!confirm(`Deletar seu resultado de "${simuladoNome}"?\n\nVocê poderá registrar novamente depois.`)) return

    setDeletando(prev => new Set(prev).add(resultadoId))
    try {
      const response = await deletarResultado(resultadoId)
      if (response.success) {
        toast({ title: "Sucesso!", description: "Resultado deletado com sucesso" })
        carregarSimulados()
      } else {
        toast({ title: "Erro", description: response.error || "Erro ao deletar", variant: "destructive" })
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado ao deletar", variant: "destructive" })
    } finally {
      setDeletando(prev => { const s = new Set(prev); s.delete(resultadoId); return s })
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
          {termoPesquisa ? "Nenhum simulado encontrado com esse termo." : "Nenhum simulado disponível ainda."}
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
            <TableHead className="font-semibold text-center w-36">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {simuladosFiltrados.map((simulado) => {
            const resultado = simulado.meuResultado
            return (
              <Fragment key={simulado.id}>
                <TableRow
                  className={`hover:bg-muted/50 ${resultado ? 'cursor-pointer' : ''}`}
                  onClick={() => resultado && toggleRow(simulado.id)}
                >
                  <TableCell className="text-center">
                    {resultado ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => { e.stopPropagation(); toggleRow(simulado.id) }}
                      >
                        {expandedRows.has(simulado.id)
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    ) : (
                      <div className="h-8 w-8" />
                    )}
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
                    {resultado ? (
                      <>
                        <span className="font-medium">{resultado.totalAcertos}</span>
                        <span className="text-muted-foreground">/{resultado.totalQuestoes}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    {resultado ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className={`text-sm ${getPercentualColor(resultado.percentualGeral)}`}>
                          {resultado.percentualGeral.toFixed(1)}%
                        </span>
                        {getBadge(resultado.percentualGeral)}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem resultado</span>
                    )}
                  </TableCell>

                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <RegistrarAcertosModal
                        simulado={simulado}
                        onSuccess={carregarSimulados}
                      />
                      {resultado && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400"
                          onClick={() => handleDeletarResultado(resultado.id, simulado.nome)}
                          disabled={deletando.has(resultado.id)}
                        >
                          {deletando.has(resultado.id)
                            ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                            : <Trash2 className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {resultado && expandedRows.has(simulado.id) && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-muted/50 p-0">
                      <div className="p-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                          Resultado por Disciplina
                        </h4>
                        {resultado.disciplinas.length > 0 ? (
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Disciplina</th>
                                <th className="text-center py-1.5 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Questões</th>
                                <th className="text-center py-1.5 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acertos</th>
                                <th className="text-center py-1.5 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Erros</th>
                                <th className="text-center py-1.5 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">%</th>
                                <th className="text-center py-1.5 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {resultado.disciplinas.map((disc) => (
                                <tr key={disc.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                                  <td className="py-2 px-2">
                                    <div className="flex items-center gap-2">
                                      {disc.disciplina.cor && (
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: disc.disciplina.cor }} />
                                      )}
                                      <span className="font-medium">{disc.disciplina.nome}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 text-center text-muted-foreground">{disc.totalQuestoes}</td>
                                  <td className="py-2 px-2 text-center text-green-600 dark:text-green-400 font-medium">{disc.acertos}</td>
                                  <td className="py-2 px-2 text-center text-red-600 dark:text-red-400 font-medium">{disc.totalQuestoes - disc.acertos}</td>
                                  <td className={`py-2 px-2 text-center font-bold ${getPercentualColor(disc.percentual)}`}>
                                    {disc.percentual.toFixed(1)}%
                                  </td>
                                  <td className="py-2 px-2 text-center">{getBadge(disc.percentual)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhuma disciplina registrada.</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
