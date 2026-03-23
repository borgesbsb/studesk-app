"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { listarDisciplinas } from "@/interface/actions/disciplina/list"
import { adicionarDisciplinaAoEdital, removerDisciplinaDoEdital } from "@/interface/actions/edital/disciplinas"
import { Edital } from "@/domain/entities/Edital"
import { BookOpen, Plus, Search, X } from "lucide-react"

interface DisciplinaOption {
  id: string
  nome: string
  cor?: string | null
}

interface EditalDisciplinasModalProps {
  edital: Edital
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function EditalDisciplinasModal({ edital, onSuccess, trigger }: EditalDisciplinasModalProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState("")
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<DisciplinaOption[]>([])
  const [disciplinasSelecionadas, setDisciplinasSelecionadas] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      carregarDisciplinas()
      setDisciplinasSelecionadas(edital.disciplinas?.map(d => d.disciplinaId) || [])
    }
  }, [open, edital])

  const carregarDisciplinas = async () => {
    setLoading(true)
    try {
      const response = await listarDisciplinas()
      if (response.success && response.data) {
        setDisciplinasDisponiveis(
          response.data.map(d => ({ id: d.id, nome: d.nome, cor: d.cor }))
        )
      }
    } catch (error) {
      console.error("Erro ao carregar disciplinas", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleDisciplina = async (disciplinaId: string) => {
    const jaSelecionada = disciplinasSelecionadas.includes(disciplinaId)
    setLoadingId(disciplinaId)
    try {
      if (jaSelecionada) {
        const response = await removerDisciplinaDoEdital(edital.id, disciplinaId)
        if (response.success) {
          setDisciplinasSelecionadas(prev => prev.filter(id => id !== disciplinaId))
        } else {
          toast({ title: "Erro", description: response.error, variant: "destructive" })
        }
      } else {
        const response = await adicionarDisciplinaAoEdital(edital.id, disciplinaId)
        if (response.success) {
          setDisciplinasSelecionadas(prev => [...prev, disciplinaId])
        } else {
          toast({ title: "Erro", description: response.error, variant: "destructive" })
        }
      }
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar disciplina",
        variant: "destructive",
      })
    } finally {
      setLoadingId(null)
    }
  }

  const disciplinasFiltradas = disciplinasDisponiveis.filter(d =>
    d.nome.toLowerCase().includes(busca.toLowerCase())
  )

  const selecionadas = disciplinasDisponiveis.filter(d =>
    disciplinasSelecionadas.includes(d.id)
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <BookOpen className="h-4 w-4 mr-2" />
            Disciplinas
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Disciplinas do Edital</DialogTitle>
          <DialogDescription>{edital.nome}</DialogDescription>
        </DialogHeader>

        {/* Tags das disciplinas selecionadas */}
        {selecionadas.length > 0 && (
          <div className="flex flex-wrap gap-2 py-2 border-b border-border">
            {selecionadas.map(d => (
              <Badge
                key={d.id}
                variant="secondary"
                className="flex items-center gap-1 cursor-pointer hover:bg-destructive/20"
                onClick={() => toggleDisciplina(d.id)}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: d.cor || "#3b82f6" }}
                />
                {d.nome}
                <X className="h-3 w-3 ml-0.5 opacity-60 hover:opacity-100" />
              </Badge>
            ))}
          </div>
        )}

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar disciplinas..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista de disciplinas */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
          ) : disciplinasFiltradas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {busca ? `Nenhuma disciplina encontrada para "${busca}"` : "Nenhuma disciplina disponível"}
            </p>
          ) : (
            disciplinasFiltradas.map(d => {
              const selecionada = disciplinasSelecionadas.includes(d.id)
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDisciplina(d.id)}
                  disabled={loadingId === d.id}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    selecionada
                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                      : "hover:bg-muted border border-transparent"
                  } ${loadingId === d.id ? "opacity-50" : ""}`}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: d.cor || "#3b82f6" }}
                  />
                  <span className="flex-1 text-sm font-medium">{d.nome}</span>
                  {selecionada ? (
                    <X className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              )
            })
          )}
        </div>

        <div className="pt-2 border-t border-border text-sm text-muted-foreground">
          {disciplinasSelecionadas.length} disciplina{disciplinasSelecionadas.length !== 1 ? "s" : ""} selecionada{disciplinasSelecionadas.length !== 1 ? "s" : ""}
        </div>
      </DialogContent>
    </Dialog>
  )
}
