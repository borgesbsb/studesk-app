"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdicionarDisciplinaModal } from "@/components/disciplina/adicionar-disciplina-modal"
import { DisciplinasGrid } from "@/components/disciplina/disciplinas-grid"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, GraduationCap } from "lucide-react"
import { useEffect, useState } from "react"
import { buscarConcursoPorId } from "@/interface/actions/concurso/get-by-id"
import { Concurso } from "@/domain/entities/Concurso"
import { Skeleton } from "@/components/ui/skeleton"

export default function ConcursoPage() {
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
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {loading ? (
          <div className="space-y-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
              {concurso?.nome || "Concurso não encontrado"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {concurso?.orgao} - {concurso?.cargo}
            </p>
          </div>
        )}
        <div className="ml-auto">
          <AdicionarDisciplinaModal 
            concursoId={concursoId}
            onSuccess={() => {
              window.location.reload()
            }}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            Disciplinas do Concurso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DisciplinasGrid concursoId={concursoId} />
        </CardContent>
      </Card>
    </div>
  )
} 