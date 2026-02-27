"use client"

import { useState, useEffect } from "react"
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
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Loader2, Trash2 } from "lucide-react"
import { criarSimulado } from "@/interface/actions/simulado/create"
import { listarDisciplinas } from "@/interface/actions/disciplina/list"
import { listarConfigsAtivas } from "@/interface/actions/simulado/config-admin"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AdicionarSimuladoModalProps {
  onSuccess?: () => void
}

interface Disciplina {
  id: string
  nome: string
  cor: string | null
}

interface ConfigDisciplina {
  id: string
  disciplinaId: string
  totalQuestoes: number
  disciplina: { id: string; nome: string; cor: string | null }
}

interface Config {
  id: string
  nome: string
  totalQuestoes: number
  disciplinas: ConfigDisciplina[]
}

interface DisciplinaAcerto {
  disciplinaId: string
  totalQuestoes: number
  acertos: number
}

export function AdicionarSimuladoModal({ onSuccess }: AdicionarSimuladoModalProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [nome, setNome] = useState("")
  const [dataRealizacao, setDataRealizacao] = useState(new Date().toISOString().split('T')[0])
  const [configSelecionadaId, setConfigSelecionadaId] = useState("")
  const [configs, setConfigs] = useState<Config[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [acertos, setAcertos] = useState<DisciplinaAcerto[]>([])

  useEffect(() => {
    if (open) {
      carregarDados()
    }
  }, [open])

  const carregarDados = async () => {
    const [configsRes, disciplinasRes] = await Promise.all([
      listarConfigsAtivas(),
      listarDisciplinas()
    ])

    if (configsRes.success && configsRes.data) {
      setConfigs(configsRes.data as Config[])
    }
    if (disciplinasRes.success && disciplinasRes.data) {
      setDisciplinas((disciplinasRes.data as unknown) as Disciplina[])
    }
  }

  const handleSelectConfig = (configId: string) => {
    setConfigSelecionadaId(configId)
    const config = configs.find(c => c.id === configId)
    if (config) {
      setAcertos(config.disciplinas.map(d => ({
        disciplinaId: d.disciplinaId,
        totalQuestoes: d.totalQuestoes,
        acertos: 0
      })))
    }
  }

  const handleSemConfig = () => {
    setConfigSelecionadaId("")
    setAcertos([{ disciplinaId: "", totalQuestoes: 0, acertos: 0 }])
  }

  const adicionarLinha = () => {
    setAcertos([...acertos, { disciplinaId: "", totalQuestoes: 0, acertos: 0 }])
  }

  const removerLinha = (index: number) => {
    setAcertos(acertos.filter((_, i) => i !== index))
  }

  const atualizarAcerto = (index: number, field: keyof DisciplinaAcerto, value: string | number) => {
    const novos = [...acertos]
    novos[index] = { ...novos[index], [field]: value }
    setAcertos(novos)
  }

  const resetForm = () => {
    setNome("")
    setDataRealizacao(new Date().toISOString().split('T')[0])
    setConfigSelecionadaId("")
    setAcertos([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nome.trim()) {
      toast({ title: "Erro", description: "Preencha o nome do simulado", variant: "destructive" })
      return
    }

    const acertosValidos = acertos.filter(a => a.disciplinaId && a.totalQuestoes > 0)
    if (acertosValidos.length === 0) {
      toast({ title: "Erro", description: "Adicione pelo menos uma disciplina com resultado", variant: "destructive" })
      return
    }

    for (const a of acertosValidos) {
      if (a.acertos > a.totalQuestoes) {
        const disc = disciplinas.find(d => d.id === a.disciplinaId)
        toast({
          title: "Erro",
          description: `Acertos não pode ser maior que total de questões (${disc?.nome || 'disciplina'})`,
          variant: "destructive"
        })
        return
      }
    }

    setLoading(true)
    try {
      const response = await criarSimulado({
        nome: nome.trim(),
        configSimuladoId: configSelecionadaId || undefined,
        dataRealizacao: new Date(dataRealizacao),
        disciplinas: acertosValidos
      })

      if (response.success) {
        toast({ title: "Sucesso!", description: "Simulado registrado com sucesso" })
        setOpen(false)
        resetForm()
        onSuccess?.()
      } else {
        toast({ title: "Erro", description: response.error || "Erro ao registrar simulado", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Erro", description: "Erro inesperado ao registrar simulado", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const configSelecionada = configs.find(c => c.id === configSelecionadaId)
  const modoManual = !configSelecionadaId && acertos.length > 0

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Registrar Simulado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Registrar Simulado</DialogTitle>
            <DialogDescription>
              Informe quantas questões acertou por disciplina
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Nome */}
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome do Simulado *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: AFRFB 2024 – 1º Simulado"
                required
              />
            </div>

            {/* Data */}
            <div className="grid gap-2">
              <Label htmlFor="data">Data de Realização *</Label>
              <Input
                id="data"
                type="date"
                value={dataRealizacao}
                onChange={(e) => setDataRealizacao(e.target.value)}
                required
              />
            </div>

            {/* Config do Admin */}
            {configs.length > 0 && (
              <div className="grid gap-2">
                <Label>Configuração do Simulado</Label>
                <Select
                  value={configSelecionadaId}
                  onValueChange={handleSelectConfig}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma configuração (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {configs.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} ({c.totalQuestoes} questões)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {configSelecionadaId && (
                  <p className="text-xs text-muted-foreground">
                    Disciplinas preenchidas automaticamente. Informe apenas os acertos.
                  </p>
                )}
              </div>
            )}

            {/* Botão para modo manual (sem config) */}
            {!configSelecionadaId && acertos.length === 0 && (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleSemConfig}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar disciplinas manualmente
                </Button>
              </div>
            )}

            {/* Tabela de Disciplinas e Acertos */}
            {(configSelecionadaId || modoManual) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Resultados por Disciplina</Label>
                  {modoManual && (
                    <Button type="button" variant="outline" size="sm" onClick={adicionarLinha}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  )}
                </div>

                {/* Resumo total */}
                {acertos.length > 0 && (() => {
                  const validos = acertos.filter(a => a.disciplinaId && a.totalQuestoes > 0)
                  const totalQ = validos.reduce((s, a) => s + a.totalQuestoes, 0)
                  const totalA = validos.reduce((s, a) => s + a.acertos, 0)
                  const pct = totalQ > 0 ? Math.round((totalA / totalQ) * 1000) / 10 : 0
                  return totalQ > 0 ? (
                    <div className="flex items-center gap-4 text-sm bg-muted rounded-lg px-3 py-2">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-semibold">{totalA}/{totalQ}</span>
                      <span className={`font-bold ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  ) : null
                })()}

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {acertos.map((linha, index) => {
                    const disc = configSelecionada?.disciplinas.find(d => d.disciplinaId === linha.disciplinaId)?.disciplina
                      || disciplinas.find(d => d.id === linha.disciplinaId)
                    const pct = linha.totalQuestoes > 0
                      ? Math.round((linha.acertos / linha.totalQuestoes) * 1000) / 10
                      : 0

                    return (
                      <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                        {/* Cor da disciplina */}
                        {disc?.cor && (
                          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: disc.cor }} />
                        )}

                        {/* Nome da disciplina (config) ou seletor (manual) */}
                        {configSelecionadaId ? (
                          <span className="text-sm font-medium flex-1 truncate">{disc?.nome || '-'}</span>
                        ) : (
                          <div className="flex-1 min-w-0">
                            <Select
                              value={linha.disciplinaId}
                              onValueChange={(v) => atualizarAcerto(index, 'disciplinaId', v)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Disciplina" />
                              </SelectTrigger>
                              <SelectContent>
                                {disciplinas.map(d => (
                                  <SelectItem key={d.id} value={d.id}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.cor || '#3b82f6' }} />
                                      {d.nome}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Total de questões (config: readonly / manual: input) */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">Total:</span>
                          {configSelecionadaId ? (
                            <span className="text-sm font-medium w-8 text-center">{linha.totalQuestoes}</span>
                          ) : (
                            <Input
                              type="number"
                              min="1"
                              className="h-8 w-16 text-center text-xs"
                              value={linha.totalQuestoes || ''}
                              placeholder="Q"
                              onChange={(e) => atualizarAcerto(index, 'totalQuestoes', parseInt(e.target.value) || 0)}
                            />
                          )}
                        </div>

                        {/* Acertos */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">Acertos:</span>
                          <Input
                            type="number"
                            min="0"
                            max={linha.totalQuestoes}
                            className="h-8 w-16 text-center text-xs"
                            value={linha.acertos || ''}
                            placeholder="0"
                            onChange={(e) => atualizarAcerto(index, 'acertos', parseInt(e.target.value) || 0)}
                          />
                        </div>

                        {/* Percentual */}
                        {linha.totalQuestoes > 0 && (
                          <span className={`text-xs font-bold w-12 text-right flex-shrink-0 ${
                            pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {pct.toFixed(0)}%
                          </span>
                        )}

                        {/* Remover (modo manual) */}
                        {modoManual && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 flex-shrink-0"
                            onClick={() => removerLinha(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? "Salvando..." : "Registrar Simulado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
