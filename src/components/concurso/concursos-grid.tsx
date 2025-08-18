"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, GraduationCap, Pencil, Trash2, FileText, BookOpen, Clock, Building2, ExternalLink } from "lucide-react"
import { Concurso } from "@/domain/entities/Concurso"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useOptimistic, useTransition, useEffect } from "react"
import { atualizarConcurso } from "@/interface/actions/concurso/update"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ConcursosGridProps {
  onEdit: (concurso: Concurso) => void
  onDelete: (id: string) => void
  concursos: Concurso[]
}

function calcularProgressoCurso(inicioCurso: Date | null | undefined, dataProva: Date | null | undefined): number {
  if (!inicioCurso || !dataProva) return 0
  
  const hoje = new Date()
  const total = dataProva.getTime() - inicioCurso.getTime()
  const decorrido = hoje.getTime() - inicioCurso.getTime()
  
  // Se ainda não começou o curso
  if (hoje < inicioCurso) return 0
  
  // Se já passou da data da prova
  if (hoje > dataProva) return 100
  
  const progresso = (decorrido / total) * 100
  return Math.max(0, Math.min(100, progresso))
}

function formatarTempoRestanteCurso(inicioCurso: Date | null | undefined, dataProva: Date | null | undefined): string {
  if (!inicioCurso || !dataProva) return "Datas não definidas"
  
  const hoje = new Date()
  
  // Se ainda não começou o curso
  if (hoje < inicioCurso) {
    const diasParaInicio = Math.ceil((inicioCurso.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    if (diasParaInicio === 0) return "Curso começa hoje!"
    if (diasParaInicio === 1) return "Curso começa amanhã"
    return `Curso começa em ${diasParaInicio} dias`
  }
  
  // Se já passou da data da prova
  if (hoje > dataProva) return "Curso finalizado"
  
  // Se está no meio do curso
  const diasRestantes = Math.ceil((dataProva.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  const diasTotais = Math.ceil((dataProva.getTime() - inicioCurso.getTime()) / (1000 * 60 * 60 * 24))
  const diasDecorridos = diasTotais - diasRestantes
  
  return `${diasDecorridos} dias de ${diasTotais} (${diasRestantes} restantes)`
}

function getProgressColor(progresso: number): string {
  // Cores para diferentes estágios do progresso
  if (progresso >= 100) return "bg-gradient-to-r from-red-600 to-red-500" // Finalizado/Atrasado
  if (progresso >= 90) return "bg-gradient-to-r from-orange-500 to-red-400" // Muito próximo
  if (progresso >= 75) return "bg-gradient-to-r from-yellow-500 to-orange-400" // Atenção
  if (progresso >= 50) return "bg-gradient-to-r from-emerald-500 to-yellow-400" // Metade do caminho
  if (progresso >= 25) return "bg-gradient-to-r from-blue-500 to-emerald-400" // Início do progresso
  return "bg-gradient-to-r from-indigo-500 to-blue-400" // Começando
}

function getProgressStyle(progresso: number): string {
  const baseStyle = "h-1.5 rounded-full transition-all duration-500"
  
  // Adiciona uma animação suave de pulso quando estiver próximo do prazo
  if (progresso >= 90) {
    return `${baseStyle} animate-pulse`
  }
  
  return baseStyle
}

function calcularProgresso(dataInicio: Date, dataFim: Date | null | undefined): number {
  if (!dataFim) return 0
  
  const hoje = new Date()
  const total = dataFim.getTime() - dataInicio.getTime()
  const decorrido = hoje.getTime() - dataInicio.getTime()
  
  // Se a data da prova já passou, retorna 100%
  if (hoje > dataFim) return 100
  
  // Se ainda não chegou na data inicial, retorna 0%
  if (hoje < dataInicio) return 0
  
  const progresso = (decorrido / total) * 100
  return Math.max(0, Math.min(100, progresso))
}

function formatarTempoRestante(dataProva: Date | null | undefined): string {
  if (!dataProva) return "Data não definida"
  
  const hoje = new Date()
  const diff = dataProva.getTime() - hoje.getTime()
  
  if (diff < 0) return "Prova já realizada"
  
  const dias = Math.ceil(diff / (1000 * 60 * 60 * 24))
  
  if (dias === 0) return "Prova é hoje!"
  if (dias === 1) return "Falta 1 dia"
  if (dias <= 30) return `Faltam ${dias} dias`
  
  const meses = Math.floor(dias / 30)
  const diasRestantes = dias % 30
  
  if (meses === 1) {
    return diasRestantes > 0 
      ? `Falta 1 mês e ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`
      : "Falta 1 mês"
  }
  
  return diasRestantes > 0
    ? `Faltam ${meses} meses e ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`
    : `Faltam ${meses} meses`
}

export function ConcursosGrid({ onEdit, onDelete, concursos }: ConcursosGridProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [concursoEmEdicao, setConcursoEmEdicao] = useState<Concurso | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  
  // Estado otimista para atualização imediata da UI
  const [optimisticConcursos, addOptimisticConcurso] = useOptimistic(
    concursos,
    (state, newConcurso: Concurso) =>
      state.map((c) => (c.id === newConcurso.id ? newConcurso : c))
  )

  const [formData, setFormData] = useState({
    nome: "",
    orgao: "",
    banca: "",
    cargo: "",
    editalUrl: "",
    dataProva: "",
    inicioCurso: ""
  })

  useEffect(() => {
    if (needsRefresh) {
      const reloadPage = () => {
        router.refresh()
        window.location.reload()
        setNeedsRefresh(false)
      }
      reloadPage()
    }
  }, [needsRefresh, router])

  const handleEditClick = (e: React.MouseEvent, concurso: Concurso) => {
    e.stopPropagation()
    setConcursoEmEdicao(concurso)
    setFormData({
      nome: concurso.nome,
      orgao: concurso.orgao,
      banca: concurso.banca,
      cargo: concurso.cargo,
      editalUrl: concurso.editalUrl || "",
      dataProva: concurso.dataProva ? new Date(concurso.dataProva).toISOString().split('T')[0] : "",
      inicioCurso: concurso.inicioCurso ? new Date(concurso.inicioCurso).toISOString().split('T')[0] : ""
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!concursoEmEdicao) return

    try {
      setIsLoading(true)
      const response = await atualizarConcurso(concursoEmEdicao.id, {
        ...formData,
        dataProva: formData.dataProva || undefined,
        inicioCurso: formData.inicioCurso || undefined
      })

      if (response.success && response.data) {
        toast.success("Concurso atualizado com sucesso!")
        setConcursoEmEdicao(null)
        // Força a atualização da página
        setNeedsRefresh(true)
      } else {
        toast.error("Erro ao atualizar concurso: " + response.error)
      }
    } catch (error) {
      toast.error("Erro ao atualizar concurso")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {optimisticConcursos.map((concurso) => {
          const progressoCurso = calcularProgressoCurso(concurso.inicioCurso, concurso.dataProva)
          const tempoRestanteCurso = formatarTempoRestanteCurso(concurso.inicioCurso, concurso.dataProva)
          const progressoCursoColor = getProgressColor(progressoCurso)
          
          return (
            <Card 
              key={concurso.id}
              className="group relative overflow-hidden border transition-all duration-300 
                       hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30
                       bg-gradient-to-br from-card to-card/95 max-w-sm"
            >
              {/* Faixa decorativa superior */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40 
                            transform origin-left transition-transform duration-700 group-hover:scale-x-100 scale-x-0" />

              <CardHeader className="p-3 pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-1">
                    {concurso.nome}
                  </CardTitle>
                </div>
              </CardHeader>

              <CardContent className="p-3 pt-0 space-y-3">
                {/* Informações Principais */}
                <div className="flex items-center gap-2 bg-muted/20 rounded-lg p-2 group-hover:bg-muted/30 transition-colors">
                  <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm truncate">{concurso.orgao}</h3>
                    <p className="text-xs text-muted-foreground truncate">{concurso.cargo}</p>
                  </div>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-background/50 p-2 rounded-lg group-hover:bg-background/80 transition-colors">
                    <div className="flex items-center gap-1.5 text-primary/80 mb-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs">Data da Prova</span>
                    </div>
                    <p className="text-xs font-medium pl-5">
                      {concurso.dataProva 
                        ? new Date(concurso.dataProva).toLocaleDateString('pt-BR')
                        : "Não definida"
                      }
                    </p>
                  </div>
                  <div className="bg-background/50 p-2 rounded-lg group-hover:bg-background/80 transition-colors">
                    <div className="flex items-center gap-1.5 text-primary/80 mb-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span className="text-xs">Início</span>
                    </div>
                    <p className="text-xs font-medium pl-5">
                      {concurso.inicioCurso 
                        ? new Date(concurso.inicioCurso).toLocaleDateString('pt-BR')
                        : "Não definido"
                      }
                    </p>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="bg-muted/20 p-2 rounded-lg group-hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium">Progresso</span>
                    </div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      progressoCurso >= 90 ? 'bg-red-500/10 text-red-500' : 
                      progressoCurso >= 75 ? 'bg-yellow-500/10 text-yellow-500' : 
                      'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {tempoRestanteCurso}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="overflow-hidden h-1.5 text-xs flex rounded-full bg-secondary/30">
                      <Progress 
                        value={progressoCurso} 
                        className={getProgressStyle(progressoCurso)}
                        indicatorClassName={`${progressoCursoColor} shadow-lg`}
                      />
                    </div>
                    <span className="absolute right-0 -bottom-3.5 text-[10px] font-medium text-primary">
                      {Math.round(progressoCurso)}%
                    </span>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(concurso.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Excluir
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs hover:text-primary hover:bg-primary/10"
                    onClick={(e) => handleEditClick(e, concurso)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => router.push(`/concurso/${concurso.id}/disciplinas`)}
                  >
                    <GraduationCap className="h-3.5 w-3.5 mr-1" />
                    Disciplinas
                  </Button>
                </div>
              </CardContent>

              {/* Efeito de brilho no hover */}
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-primary/2 to-transparent" />
              </div>
            </Card>
          )
        })}
      </div>

      <Dialog 
        open={!!concursoEmEdicao} 
        onOpenChange={(open) => {
          if (!open && !isLoading) {
            setConcursoEmEdicao(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Concurso</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Concurso</Label>
              <Input
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgao">Órgão</Label>
              <Input
                id="orgao"
                name="orgao"
                value={formData.orgao}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banca">Banca</Label>
              <Input
                id="banca"
                name="banca"
                value={formData.banca}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                name="cargo"
                value={formData.cargo}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editalUrl">URL do Edital</Label>
              <Input
                id="editalUrl"
                name="editalUrl"
                value={formData.editalUrl}
                onChange={handleInputChange}
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataProva">Data da Prova</Label>
              <Input
                id="dataProva"
                name="dataProva"
                value={formData.dataProva}
                onChange={handleInputChange}
                type="date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inicioCurso">Início do Curso</Label>
              <Input
                id="inicioCurso"
                name="inicioCurso"
                value={formData.inicioCurso}
                onChange={handleInputChange}
                type="date"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConcursoEmEdicao(null)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
} 