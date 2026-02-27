"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { ClipboardEdit, Loader2 } from "lucide-react"
import { registrarAcertos } from "@/interface/actions/simulado/create"
import type { SimuladoEvento } from "@/application/services/simulado.service"

interface RegistrarAcertosModalProps {
  simulado: SimuladoEvento
  onSuccess?: () => void
}

interface DisciplinaAcerto {
  disciplinaId: string
  nome: string
  cor: string | null
  totalQuestoes: number
  acertos: number
}

export function RegistrarAcertosModal({ simulado, onSuccess }: RegistrarAcertosModalProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const disciplinasConfig = simulado.config?.disciplinas ?? []

  const inicializar = (): DisciplinaAcerto[] =>
    disciplinasConfig.map((d) => {
      const existente = simulado.meuResultado?.disciplinas.find(
        (r) => r.disciplina.id === d.disciplinaId
      )
      return {
        disciplinaId: d.disciplinaId,
        nome: d.disciplina.nome,
        cor: d.disciplina.cor,
        totalQuestoes: d.totalQuestoes,
        acertos: existente?.acertos ?? 0,
      }
    })

  const [linhas, setLinhas] = useState<DisciplinaAcerto[]>(inicializar)

  const setAcertos = (index: number, value: number) => {
    const novas = [...linhas]
    const max = novas[index].totalQuestoes
    novas[index] = { ...novas[index], acertos: Math.max(0, Math.min(value, max)) }
    setLinhas(novas)
  }

  const handleOpen = (v: boolean) => {
    setOpen(v)
    if (v) setLinhas(inicializar())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await registrarAcertos({
        simuladoId: simulado.id,
        disciplinas: linhas.map((l) => ({
          disciplinaId: l.disciplinaId,
          totalQuestoes: l.totalQuestoes,
          acertos: l.acertos,
        })),
      })
      if (response.success) {
        toast({ title: "Acertos salvos com sucesso!" })
        setOpen(false)
        onSuccess?.()
      } else {
        toast({ title: "Erro", description: response.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const totalQ = linhas.reduce((s, l) => s + l.totalQuestoes, 0)
  const totalA = linhas.reduce((s, l) => s + l.acertos, 0)
  const pct = totalQ > 0 ? Math.round((totalA / totalQ) * 1000) / 10 : 0
  const jaTemResultado = !!simulado.meuResultado

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant={jaTemResultado ? "outline" : "default"} size="sm">
          <ClipboardEdit className="h-4 w-4 mr-2" />
          {jaTemResultado ? "Editar Acertos" : "Registrar Acertos"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{simulado.nome}</DialogTitle>
            <DialogDescription>
              Quantas questões você acertou em cada disciplina?
            </DialogDescription>
          </DialogHeader>

          {linhas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Este simulado não tem disciplinas configuradas.
            </p>
          ) : (
            <div className="py-4">
              {/* Cabeçalho */}
              <div className="flex items-center gap-10 pb-2 border-b">
                <p className="flex-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Disciplina</p>
                <p className="w-20 text-xs font-medium text-muted-foreground uppercase tracking-wide text-center">Acertos</p>
                <p className="w-16 text-xs font-medium text-muted-foreground uppercase tracking-wide text-center">%</p>
              </div>

              {/* Linhas */}
              <div className="divide-y">
                {linhas.map((linha, i) => {
                  const pctLinha = linha.totalQuestoes > 0
                    ? Math.round((linha.acertos / linha.totalQuestoes) * 1000) / 10
                    : 0
                  return (
                    <div key={linha.disciplinaId} className="flex items-center gap-10 py-3">
                      <div className="flex flex-1 items-center gap-2 min-w-0">
                        {linha.cor && (
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: linha.cor }}
                          />
                        )}
                        <p className="text-sm font-medium truncate">
                          {linha.nome} <span className="text-muted-foreground font-normal">({linha.totalQuestoes})</span>
                        </p>
                      </div>

                      <Input
                        type="number"
                        min="0"
                        max={linha.totalQuestoes}
                        className="w-20 text-center flex-shrink-0"
                        value={linha.acertos}
                        onChange={(e) => setAcertos(i, parseInt(e.target.value) || 0)}
                      />

                      <p className={`w-16 text-center text-sm font-bold flex-shrink-0 ${
                        pctLinha >= 70 ? "text-green-600" : pctLinha >= 50 ? "text-yellow-600" : "text-red-500"
                      }`}>
                        {pctLinha.toFixed(1)}%
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Total */}
              <div className="flex items-center gap-10 border-t pt-3 mt-1">
                <p className="flex-1 text-sm font-semibold">Total</p>
                <p className="w-20 text-center text-sm font-medium">{totalA}/{totalQ}</p>
                <p className={`w-16 text-center text-sm font-bold flex-shrink-0 ${
                  pct >= 70 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-500"
                }`}>
                  {pct.toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || linhas.length === 0}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
