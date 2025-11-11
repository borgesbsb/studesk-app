"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { listarDisciplinas } from "@/interface/actions/disciplina/list"
import { deletarDisciplina } from "@/interface/actions/disciplina/delete"
import { listarMateriaisDaDisciplina } from "@/interface/actions/material-estudo/disciplina"
import { useRouter } from "next/navigation"
import { 
  Book, 
  GraduationCap, 
  Scale, 
  ListChecks, 
  Target, 
  Trash2, 
  FileText,
  Trophy,
  Flame,
  Star,
  Zap,
  Medal
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DisciplinasGridProps {
  termoPesquisa?: string
}

interface MaterialEstudo {
  id: string
  nome: string
  totalPaginas: number
  paginasLidas: number
  arquivoPdfUrl?: string | null
}

interface DisciplinaComMateriais {
  id: string
  disciplinaId: string
  disciplina: {
    id: string
    nome: string
  }
  materiais: MaterialEstudo[]
  progresso: number
  totalPaginas: number
  paginasLidas: number
  streak?: number // Dias consecutivos de estudo
  level?: number // Nível baseado no progresso
  xp?: number // Pontos de experiência
}

export function DisciplinasGrid({ termoPesquisa }: DisciplinasGridProps) {
  const { toast } = useToast()
  const [disciplinas, setDisciplinas] = useState<DisciplinaComMateriais[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await listarDisciplinas()
        if (response.success && response.data) {
          const disciplinasComMateriais = await Promise.all(
            response.data.map(async (disciplina) => {
              const materiaisResponse = await listarMateriaisDaDisciplina(disciplina.id)
              const materiais = materiaisResponse.success ? materiaisResponse.data?.map(dm => dm.material) || [] : []
              
              const totalPaginas = materiais.reduce((total, mat) => total + mat.totalPaginas, 0)
              const paginasLidas = materiais.reduce((total, mat) => total + mat.paginasLidas, 0)
              const progresso = totalPaginas > 0 ? (paginasLidas / totalPaginas) * 100 : 0

              // Cálculos de gamificação
              const level = Math.floor(progresso / 10) + 1 // Cada 10% = 1 nível
              const xp = Math.floor(paginasLidas * 1.5) // 1.5 XP por página lida
              const streak = Math.floor(Math.random() * 7) + 1 // Simulando streak (substituir por lógica real)

              return {
                id: disciplina.id,
                disciplinaId: disciplina.id,
                disciplina: {
                  id: disciplina.id,
                  nome: disciplina.nome
                },
                materiais,
                progresso,
                totalPaginas,
                paginasLidas,
                level,
                xp,
                streak
              }
            })
          )
          setDisciplinas(disciplinasComMateriais)
        }
      } catch (error) {
        toast({
          title: "Erro ao carregar disciplinas",
          description: "Ocorreu um erro ao carregar as disciplinas e materiais.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    carregarDados()
  }, [toast])

  const handleRemover = async (disciplinaId: string) => {
    if (!confirm("Tem certeza que deseja remover esta disciplina?")) {
      return
    }

    const response = await deletarDisciplina(disciplinaId)
    if (response.success) {
      toast({
        title: "Disciplina removida com sucesso",
        description: "A disciplina foi removida do concurso.",
      })
      window.location.reload()
    } else {
      toast({
        title: "Erro ao remover disciplina",
        description: response.error || "Ocorreu um erro ao remover a disciplina.",
        variant: "destructive",
      })
    }
  }

  const getNivelBadge = (level: number) => {
    if (level >= 8) return "Especialista"
    if (level >= 6) return "Avançado"
    if (level >= 4) return "Intermediário"
    if (level >= 2) return "Iniciante"
    return "Novo"
  }

  const getBadgeColor = (level: number) => {
    if (level >= 8) return "bg-purple-100 text-purple-700 border-purple-200"
    if (level >= 6) return "bg-blue-100 text-blue-700 border-blue-200"
    if (level >= 4) return "bg-green-100 text-green-700 border-green-200"
    if (level >= 2) return "bg-amber-100 text-amber-700 border-amber-200"
    return "bg-gray-100 text-gray-700 border-gray-200"
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-green-500"
    if (progress >= 75) return "bg-blue-500"
    if (progress >= 50) return "bg-purple-500"
    if (progress >= 25) return "bg-amber-500"
    return "bg-gray-400"
  }

  // Filter disciplinas based on search term
  const disciplinasFiltradas = disciplinas.filter(disciplina =>
    disciplina.disciplina.nome.toLowerCase().includes((termoPesquisa || '').toLowerCase())
  )

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="space-y-3 p-5">
              <Skeleton className="h-5 w-3/4 bg-gray-200" />
              <Skeleton className="h-4 w-1/2 bg-gray-200" />
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 bg-gray-200" />
                <Skeleton className="h-6 w-16 bg-gray-200" />
              </div>
              <Skeleton className="h-2 w-full bg-gray-200" />
              <div className="flex justify-between">
                <Skeleton className="h-8 w-20 bg-gray-200" />
                <Skeleton className="h-8 w-20 bg-gray-200" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {disciplinasFiltradas.map((disciplina) => {
        const progressoColor = getProgressColor(disciplina.progresso)

        return (
          <Card 
            key={disciplina.id} 
            className="group border border-gray-200 shadow-sm bg-white hover:shadow-md transition-all duration-200 hover:border-gray-300"
          >
            {/* Simple top border indicator */}
            <div className={`h-1 ${progressoColor} rounded-t-lg`} />
            
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <GraduationCap className="h-5 w-5 text-gray-600" />
                    {disciplina.disciplina.nome}
                  </CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    onClick={() => router.push(`/disciplina/${disciplina.disciplinaId}/materiais`)}
                    title="Materiais de Estudo"
                  >
                    <Book className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-red-50 hover:text-red-600 transition-colors"
                    onClick={() => handleRemover(disciplina.disciplinaId)}
                    title="Remover Disciplina"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              {/* Level and XP Status */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Nível {disciplina.level}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-600">{disciplina.xp} XP</span>
                </div>
              </div>

              {/* Streak and Level Badge */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-sm border border-orange-200">
                  <Flame className="h-3 w-3" />
                  {disciplina.streak} dias
                </div>
                <div className={`px-2.5 py-1 rounded-full text-sm font-medium border ${getBadgeColor(disciplina.level || 1)}`}>
                  {getNivelBadge(disciplina.level || 1)}
                </div>
              </div>

              {/* Material Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progresso dos Materiais</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-900">{Math.round(disciplina.progresso)}%</span>
                    {disciplina.progresso >= 100 && (
                      <Star className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
                <Progress 
                  value={disciplina.progresso} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{disciplina.paginasLidas} páginas lidas</span>
                  <span>de {disciplina.totalPaginas}</span>
                </div>
              </div>

              {/* Materials List */}
              {disciplina.materiais.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium flex items-center gap-2 text-gray-700">
                    <Book className="h-4 w-4" />
                    <span>Materiais ({disciplina.materiais.length})</span>
                    {disciplina.materiais.every(m => (m.paginasLidas / m.totalPaginas) * 100 >= 100) && (
                      <Medal className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <ScrollArea className="h-[100px] w-full rounded-md border border-gray-200">
                    <div className="p-3 space-y-2">
                      {disciplina.materiais.map((material) => {
                        const materialProgresso = (material.paginasLidas / material.totalPaginas) * 100
                        const progressoColor = getProgressColor(materialProgresso)
                        
                        return (
                          <div 
                            key={material.id}
                            className="flex flex-col gap-2 text-sm hover:bg-gray-50 rounded-md p-2 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className={`h-4 w-4 ${materialProgresso >= 100 ? 'text-green-500' : 'text-gray-500'} flex-shrink-0`} />
                              <span className="truncate text-gray-700">{material.nome}</span>
                            </div>
                            <Progress 
                              value={materialProgresso} 
                              className="h-1.5"
                            />
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {disciplinasFiltradas.length === 0 && (
        <Card className="col-span-full p-8 border border-gray-200 shadow-sm bg-white">
          <div className="text-center text-gray-500">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium text-gray-700 mb-1">Nenhuma disciplina cadastrada</p>
            <p className="text-sm">Crie disciplinas para começar a organizar seus estudos</p>
          </div>
        </Card>
      )}
    </div>
  )
} 