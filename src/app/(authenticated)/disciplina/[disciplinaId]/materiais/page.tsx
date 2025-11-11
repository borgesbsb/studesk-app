"use client"

import { MateriaisTable } from "@/components/material-estudo/materiais-table"
import { AdicionarMaterialModal } from "@/components/material-estudo/adicionar-material-modal"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Book, GraduationCap, FileText } from "lucide-react"
import { useEffect, useState } from "react"
import { buscarDisciplinaPorId } from "@/interface/actions/disciplina/list"
import { Disciplina } from "@/domain/entities/Disciplina"
import { Skeleton } from "@/components/ui/skeleton"

const MateriaisPage = () => {
  const params = useParams()
  const router = useRouter()
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

  if (!disciplinaId) {
    return <div>ID da disciplina não encontrado</div>
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/disciplinas`)}
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
        </CardHeader>
      </Card>

      {/* Content Card */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Materiais da Disciplina
              </CardTitle>
              <p className="text-gray-500 text-sm mt-1">
                Gerencie os materiais de estudo desta disciplina
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <MateriaisTable disciplinaId={disciplinaId} />
        </CardContent>
      </Card>
    </div>
  )
}

export default MateriaisPage