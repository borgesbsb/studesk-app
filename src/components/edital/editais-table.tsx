"use client"

import { useState, useEffect, useCallback } from "react"
import { listarEditais } from "@/interface/actions/edital/list"
import { Edital } from "@/domain/entities/Edital"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EditaisTableProps {
  termoPesquisa?: string
  onCountChange?: (count: number) => void
}

export function EditaisTable({ termoPesquisa, onCountChange }: EditaisTableProps) {
  const [editais, setEditais] = useState<Edital[]>([])
  const [loading, setLoading] = useState(true)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const itensPorPagina = 10

  const carregarEditais = useCallback(async () => {
    setLoading(true)
    try {
      const response = await listarEditais()
      if (response.success && response.data) {
        setEditais(response.data)
        onCountChange?.(response.data.length)
      }
    } catch (error) {
      console.error("Erro ao carregar editais", error)
    } finally {
      setLoading(false)
    }
  }, [onCountChange])

  useEffect(() => {
    carregarEditais()
  }, [carregarEditais])

  useEffect(() => {
    setPaginaAtual(1)
  }, [termoPesquisa])

  const editaisFiltrados = editais.filter(e =>
    [e.nome, e.orgao, e.cargo].some(v =>
      v?.toLowerCase().includes((termoPesquisa || "").toLowerCase())
    )
  )

  const totalPaginas = Math.ceil(editaisFiltrados.length / itensPorPagina)
  const inicio = (paginaAtual - 1) * itensPorPagina
  const paginados = editaisFiltrados.slice(inicio, inicio + itensPorPagina)

  if (loading) {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Órgão</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Disciplinas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map(i => (
              <TableRow key={i}>
                {[...Array(5)].map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {paginados.map(edital => (
          <div key={edital.id} className="border border-border rounded-lg bg-card shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-card-foreground">{edital.nome}</h3>
                  {edital.link && (
                    <a href={edital.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                {edital.orgao && <p className="text-sm text-muted-foreground">{edital.orgao}</p>}
                {edital.cargo && <p className="text-sm text-muted-foreground">{edital.cargo}</p>}
              </div>
              {edital.ano && <Badge variant="outline">{edital.ano}</Badge>}
            </div>

            {(edital.disciplinas?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                {edital.disciplinas!.map(ed => (
                  <Badge key={ed.id} variant="secondary" className="text-xs flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: ed.disciplina?.cor || "#3b82f6" }}
                    />
                    {ed.disciplina?.nome}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}

        {editaisFiltrados.length === 0 && (
          <div className="text-center text-muted-foreground py-10 border border-border rounded-lg bg-card">
            {termoPesquisa ? `Nenhum edital encontrado para "${termoPesquisa}"` : "Nenhum edital disponível"}
          </div>
        )}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block border border-border rounded-lg overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Órgão</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Disciplinas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginados.map(edital => (
              <TableRow key={edital.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {edital.nome}
                    {edital.link && (
                      <a href={edital.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{edital.orgao || "-"}</TableCell>
                <TableCell className="text-muted-foreground">{edital.cargo || "-"}</TableCell>
                <TableCell>
                  {edital.ano ? <Badge variant="outline">{edital.ano}</Badge> : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-sm">
                    {(edital.disciplinas?.length ?? 0) === 0 ? (
                      <span className="text-sm text-muted-foreground/60">-</span>
                    ) : (
                      edital.disciplinas!.map(ed => (
                        <Badge key={ed.id} variant="secondary" className="text-xs flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: ed.disciplina?.cor || "#3b82f6" }}
                          />
                          {ed.disciplina?.nome}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {editaisFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  {termoPesquisa ? `Nenhum edital encontrado para "${termoPesquisa}"` : "Nenhum edital disponível"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {editaisFiltrados.length > itensPorPagina && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
            disabled={paginaAtual === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm px-3 py-1 bg-muted text-foreground rounded">
            {paginaAtual} de {totalPaginas}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
            disabled={paginaAtual === totalPaginas}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
