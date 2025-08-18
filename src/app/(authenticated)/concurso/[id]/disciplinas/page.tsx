"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdicionarDisciplinaModal } from "@/components/disciplina/adicionar-disciplina-modal"
import { DisciplinasTable } from "@/components/disciplina/disciplinas-table"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, GraduationCap, BookOpen, Target, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { buscarConcursoPorId } from "@/interface/actions/concurso/get-by-id"
import { Concurso } from "@/domain/entities/Concurso"
import { Skeleton } from "@/components/ui/skeleton"
 

export default function DisciplinasPage() {
  const params = useParams()
  const router = useRouter()
  const concursoId = params?.id as string
  const [concurso, setConcurso] = useState<Concurso | null>(null)
  const [loading, setLoading] = useState(true)
 

  useEffect(() => {
    const carregarConcurso = async () => {
      if (!concursoId) return
      try {
        const response = await buscarConcursoPorId(concursoId)
        if (response.success && response.data) {
          const concursoData = {
            ...response.data,
            dataProva: response.data.dataProva ? new Date(response.data.dataProva) : null,
            dataPublicacao: response.data.dataPublicacao ? new Date(response.data.dataPublicacao) : null,
            inicioCurso: response.data.inicioCurso ? new Date(response.data.inicioCurso) : null,
            createdAt: new Date(response.data.createdAt),
            updatedAt: new Date(response.data.updatedAt)
          }
          setConcurso(concursoData)
        }
      } catch (error) {
        console.error("Erro ao carregar concurso:", error)
      } finally {
        setLoading(false)
      }
    }
    carregarConcurso()
  }, [concursoId])

  if (!concursoId) {
    return <div>ID do concurso não encontrado</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
      <div className="container py-6 space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-white rounded-2xl shadow-sm border border-gray-100" />
          
          <div className="relative p-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
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
                      {concurso?.nome || "Concurso não encontrado"}
                    </h1>
                  </div>
                  <p className="text-gray-600 text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    {concurso?.orgao} • {concurso?.cargo}
                  </p>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <AdicionarDisciplinaModal 
                  concursoId={concursoId}
                  onSuccess={() => {
                    window.location.reload()
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        

        {/* Content */}
        {
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <BookOpen className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Disciplinas do Concurso
                    </CardTitle>
                    <p className="text-gray-500 text-sm mt-1">
                      Organize suas disciplinas e acompanhe o progresso
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                  <Users className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Área de estudos
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <DisciplinasTable concursoId={concursoId} />
            </CardContent>
          </Card>
        }
        
      </div>
    </div>
  )
} 