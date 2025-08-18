"use client"

import { MateriaisTable } from "@/components/material-estudo/materiais-table"
import { AdicionarMaterialModal } from "@/components/material-estudo/adicionar-material-modal"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Book, GraduationCap } from "lucide-react"
import { useEffect, useState } from "react"
import { buscarDisciplinaPorId } from "@/interface/actions/disciplina/list"
import { Disciplina } from "@/domain/entities/Disciplina"
import { Skeleton } from "@/components/ui/skeleton"

const MateriaisPage = () => {
  const params = useParams()
  const router = useRouter()
  const concursoId = params?.id as string
  const disciplinaId = params?.disciplinaId as string
  const [disciplina, setDisciplina] = useState<Disciplina | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregarDisciplina = async () => {
      if (!disciplinaId) return
      try {
        const response = await buscarDisciplinaPorId(disciplinaId)
        if (response.success && response.data) {
          setDisciplina(response.data)
        }
      } catch (error) {
        console.error("Erro ao carregar disciplina:", error)
      } finally {
        setLoading(false)
      }
    }
    carregarDisciplina()
  }, [disciplinaId])

  if (!disciplinaId || !concursoId) {
    return <div>ID da disciplina ou concurso não encontrado</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
      <div className="container py-6 space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="relative">
          {/* Background sutil */}
          <div className="absolute inset-0 bg-white rounded-2xl shadow-sm border border-gray-100" />
          
          <div className="relative p-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/concurso/${concursoId}/disciplinas`)}
                className="h-10 w-10 hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-7 w-64 bg-gray-200" />
                  <Skeleton className="h-4 w-40 bg-gray-200" />
                </div>
              ) : (
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <GraduationCap className="h-5 w-5 text-gray-600" />
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                      {disciplina?.nome || "Disciplina não encontrada"}
                    </h1>
                  </div>
                  <p className="text-gray-600 text-sm flex items-center gap-2">
                    <Book className="h-4 w-4" />
                    Materiais de estudo e recursos de aprendizagem
                  </p>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <AdicionarMaterialModal 
                  disciplinaId={disciplinaId}
                  onSuccess={() => {
                    window.location.reload()
                  }}
                  className="bg-gray-900 hover:bg-gray-800 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Section: somente tabela */}
        <div className="space-y-6">
          <MateriaisTable disciplinaId={disciplinaId} />
        </div>
      </div>
    </div>
  )
}

export default MateriaisPage 