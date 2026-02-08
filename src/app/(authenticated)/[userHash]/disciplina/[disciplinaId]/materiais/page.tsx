"use client"

import { MateriaisTable } from "@/components/material-estudo/materiais-table"
import { UltimosMateriaisCard } from "@/components/material-estudo/ultimos-materiais-card"
import { AdicionarMaterialModal } from "@/components/material-estudo/adicionar-material-modal"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Book, GraduationCap, FileText, Clock } from "lucide-react"
import { useEffect, useState } from "react"
import { buscarDisciplinaPorId } from "@/interface/actions/disciplina/list"
import { Disciplina } from "@/domain/entities/Disciplina"
import { Skeleton } from "@/components/ui/skeleton"
import { useUserHash } from "@/contexts/user-hash-context"
import { useHeader } from "@/contexts/header-context"

const MateriaisPage = () => {
  const { hash } = useUserHash()
  const { setTitle } = useHeader()
  const params = useParams()
  const router = useRouter()
  const disciplinaId = params?.disciplinaId as string
  const [disciplina, setDisciplina] = useState<Disciplina | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTitle("Materiais")
  }, [setTitle])

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
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header Card - altura fixa */}
      <Card className="border border-border shadow-sm rounded-none border-b-0 flex-shrink-0">
        <CardHeader className="pb-5 border-b border-border">
          {/* Desktop: flex-row | Mobile: flex-col */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-10 w-10 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {loading ? (
              <div className="space-y-2 flex-1">
                <Skeleton className="h-7 w-full md:w-64 bg-muted" />
                <Skeleton className="h-4 w-full md:w-40 bg-muted" />
              </div>
            ) : (
              <div className="flex-1 w-full md:w-auto">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-1">
                  <div className="p-2 bg-muted rounded-lg w-fit">
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h1 className="text-xl md:text-2xl font-semibold text-foreground">
                    {disciplina?.nome || "Disciplina não encontrada"}
                  </h1>
                </div>
                <p className="text-muted-foreground text-sm flex items-center gap-2">
                  <Book className="h-4 w-4" />
                  Materiais de estudo e recursos de aprendizagem
                </p>
              </div>
            )}

            {/* Mobile: botão full width | Desktop: auto */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <AdicionarMaterialModal
                disciplinaId={disciplinaId}
                onSuccess={() => {
                  window.location.reload()
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-sm hover:shadow-md transition-all duration-200 w-full md:w-auto"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Layout: Materiais (3 colunas) + Últimos Acessados (1 coluna) */}
      <div
        className="flex-1 grid gap-4 overflow-hidden p-4"
        style={{ gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1fr)' }}
      >
        {/* Coluna Esquerda: Materiais da Disciplina (75%) */}
        <Card className="border border-border shadow-sm flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="pb-5 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  Materiais da Disciplina
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  Gerencie os materiais de estudo desta disciplina
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 flex-1 overflow-y-auto">
            <MateriaisTable disciplinaId={disciplinaId} />
          </CardContent>
        </Card>

        {/* Coluna Direita: Últimos Materiais Acessados (25%) */}
        <Card className="border border-border shadow-sm flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="pb-5 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  Últimos Materiais Acessados
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  Continue de onde você parou
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 flex-1 overflow-y-auto">
            <UltimosMateriaisCard disciplinaId={disciplinaId} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MateriaisPage
