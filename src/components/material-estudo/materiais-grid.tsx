"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, BookOpen, Clock, FileText, TrendingUp, Eye } from "lucide-react"
import { useState, useEffect } from "react"
import { listarMateriaisDaDisciplina } from "@/interface/actions/material-estudo/disciplina"
import { deletarMaterialEstudo } from "@/interface/actions/material-estudo/delete"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"

// Componente de progresso circular elegante
interface ProgressCircleProps {
  progress: number
  size?: number
  strokeWidth?: number
}

function ProgressCircle({ progress, size = 80, strokeWidth = 6 }: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'rgb(34 197 94)' // green-500
    if (progress >= 75) return 'rgb(59 130 246)' // blue-500
    if (progress >= 50) return 'rgb(168 85 247)' // purple-500
    if (progress >= 25) return 'rgb(245 158 11)' // amber-500
    return 'rgb(156 163 175)' // gray-400
  }

  const progressColor = getProgressColor(progress)
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Círculo de fundo */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgb(229 231 235)" // gray-200
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Círculo de progresso */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      {/* Conteúdo central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold text-gray-700">
          {Math.round(progress)}%
        </span>
        <span className="text-xs text-gray-500">
          completo
        </span>
      </div>
    </div>
  )
}

interface MateriaisGridProps {
  disciplinaId: string
}

interface MaterialEstudoResponse {
  id: string
  nome: string
  arquivoPdfUrl: string | null
  totalPaginas: number
  paginasLidas: number
  createdAt: string
  updatedAt: string
}

export function MateriaisGrid({ disciplinaId }: MateriaisGridProps) {
  const router = useRouter()
  const [materiais, setMateriais] = useState<MaterialEstudoResponse[]>([])
  const [loading, setLoading] = useState(true)

  const carregarMateriais = async () => {
    try {
      const response = await listarMateriaisDaDisciplina(disciplinaId)
      if (response.success && response.data) {
        setMateriais(response.data.map(dm => ({
          ...dm.material,
          createdAt: dm.material.createdAt.toString(),
          updatedAt: dm.material.updatedAt.toString()
        })))
      }
    } catch (error) {
      toast.error("Erro ao carregar materiais de estudo")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarMateriais()
  }, [disciplinaId])

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este material?")) return

    try {
      const response = await deletarMaterialEstudo(id)
      if (response.success) {
        toast.success("Material excluído com sucesso!")
        carregarMateriais()
      } else {
        toast.error(response.error || "Erro ao excluir material")
      }
    } catch (error) {
      toast.error("Erro ao excluir material")
    }
  }

  const getStatusInfo = (progresso: number) => {
    if (progresso === 100) return { text: 'Concluído', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' }
    if (progresso >= 75) return { text: 'Quase lá', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' }
    if (progresso >= 50) return { text: 'No meio', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' }
    if (progresso >= 25) return { text: 'Iniciado', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' }
    return { text: 'Novo', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border border-gray-200 shadow-sm bg-white">
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <Skeleton className="h-5 w-20 bg-gray-200" />
                <Skeleton className="h-6 w-16 bg-gray-200" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-6 w-4/5 bg-gray-200" />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-24 bg-gray-200" />
                  <Skeleton className="h-4 w-20 bg-gray-200" />
                </div>
              </div>
              
              <div className="flex justify-center py-4">
                <Skeleton className="h-20 w-20 rounded-full bg-gray-200" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 mx-auto bg-gray-200" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1 bg-gray-200" />
                  <Skeleton className="h-9 w-9 bg-gray-200" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (materiais.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum material encontrado</h3>
        <p className="text-gray-500 mb-6">Adicione materiais de estudo para começar</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {materiais.map((material) => {
        const progresso = material.totalPaginas > 0 ? (material.paginasLidas / material.totalPaginas) * 100 : 0
        const statusInfo = getStatusInfo(progresso)

        return (
          <Card 
            key={material.id} 
            className="group border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 bg-white hover:border-gray-300 cursor-pointer"
            onClick={() => router.push(`/material/${material.id}`)}
          >
            <CardContent className="p-5 space-y-4">
              {/* Header com status */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FileText className="h-4 w-4" />
                  <span>Material de estudo</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>
                  {statusInfo.text}
                </span>
              </div>

              {/* Título e metadados */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 leading-tight">
                  {material.nome}
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{material.totalPaginas} páginas</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(material.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              {/* Progresso com gráfico circular */}
              <div className="flex flex-col items-center py-4 bg-gray-50 rounded-lg">
                <ProgressCircle progress={progresso} size={80} strokeWidth={6} />
                
                <div className="mt-3 text-center">
                  <div className="text-sm font-medium text-gray-700">
                    {material.paginasLidas} de {material.totalPaginas} páginas
                  </div>
                  <div className="text-xs text-gray-500 flex items-center justify-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    Progresso de leitura
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/material/${material.id}`)
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Abrir Material
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(material.id)
                  }}
                  title="Excluir material"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
} 