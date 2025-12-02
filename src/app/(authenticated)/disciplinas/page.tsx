"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdicionarDisciplinaModal } from "@/components/disciplina/adicionar-disciplina-modal"
import { DisciplinasTable } from "@/components/disciplina/disciplinas-table"
import { Input } from "@/components/ui/input"
import { BookOpen, Users, Search, CheckCircle2, FileText, Video } from "lucide-react"
import { useState, useEffect } from "react"
import { useHeader } from "@/contexts/header-context"
import { listarDisciplinas } from "@/interface/actions/disciplina/list"
import { listarMateriaisDaDisciplina } from "@/interface/actions/material-estudo/disciplina"

interface DisciplinaMetrics {
  totalDisciplinas: number
  disciplinasCompletas: number
  totalPdfs: number
  totalVideos: number
}

export default function DisciplinasPage() {
  const [termoPesquisa, setTermoPesquisa] = useState('')
  const [metrics, setMetrics] = useState<DisciplinaMetrics>({
    totalDisciplinas: 0,
    disciplinasCompletas: 0,
    totalPdfs: 0,
    totalVideos: 0
  })
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const { setTitle } = useHeader()

  useEffect(() => {
    setTitle("Gerenciar Disciplinas")
    return () => {
      setTitle("Dashboard")
    }
  }, [setTitle])

  useEffect(() => {
    const carregarMetricas = async () => {
      try {
        const response = await listarDisciplinas()
        if (response.success && response.data) {
          const disciplinasData = response.data
          let totalPdfs = 0
          let totalVideos = 0
          let disciplinasCompletas = 0

          // Carregar materiais de cada disciplina
          await Promise.all(
            disciplinasData.map(async (disc) => {
              const materiaisResponse = await listarMateriaisDaDisciplina(disc.id)
              if (materiaisResponse.success && materiaisResponse.data) {
                const materiais = materiaisResponse.data.map(dm => dm.material)

                // Contar PDFs e Vídeos
                const pdfs = materiais.filter(m => m.tipo === 'PDF')
                const videos = materiais.filter(m => m.tipo === 'VIDEO')
                totalPdfs += pdfs.length
                totalVideos += videos.length

                // Verificar se disciplina está completa (100% de progresso)
                const pdfsTotalPaginas = pdfs.reduce((sum, m) => sum + m.totalPaginas, 0)
                const pdfsPaginasLidas = pdfs.reduce((sum, m) => sum + m.paginasLidas, 0)
                const videosTotalDuracao = videos.reduce((sum, m) => sum + (m.duracaoSegundos || 0), 0)
                const videosTempoAssistido = videos.reduce((sum, m) => sum + (m.tempoAssistido || 0), 0)

                const progressoPdf = pdfsTotalPaginas > 0 ? (pdfsPaginasLidas / pdfsTotalPaginas) * 100 : 100
                const progressoVideo = videosTotalDuracao > 0 ? (videosTempoAssistido / videosTotalDuracao) * 100 : 100

                // Considerar completa se ambos os progressos forem 100% (ou não houver materiais desse tipo)
                if (progressoPdf === 100 && progressoVideo === 100 && materiais.length > 0) {
                  disciplinasCompletas++
                }
              }
            })
          )

          setMetrics({
            totalDisciplinas: disciplinasData.length,
            disciplinasCompletas,
            totalPdfs,
            totalVideos
          })
        }
      } catch (error) {
        console.error('Erro ao carregar métricas:', error)
      } finally {
        setLoadingMetrics(false)
      }
    }

    carregarMetricas()
  }, [])

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Disciplinas */}
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total de Disciplinas</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">
                  {loadingMetrics ? '-' : metrics.totalDisciplinas}
                </h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disciplinas Completas */}
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Disciplinas Completas</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">
                  {loadingMetrics ? '-' : metrics.disciplinasCompletas}
                </h3>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total de PDFs */}
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total de PDFs</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">
                  {loadingMetrics ? '-' : metrics.totalPdfs}
                </h3>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <FileText className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total de Vídeos */}
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total de Vídeos</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">
                  {loadingMetrics ? '-' : metrics.totalVideos}
                </h3>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Video className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Card */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <BookOpen className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Todas as Disciplinas
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
          {/* Barra de pesquisa e botão adicionar */}
          <div className="flex items-center justify-between mb-6">
            <AdicionarDisciplinaModal
              onSuccess={() => {
                window.location.reload()
              }}
            />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Pesquisar disciplinas..."
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                className="pl-10 w-80 h-10 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg shadow-sm transition-all duration-200"
              />
            </div>
          </div>

          <DisciplinasTable termoPesquisa={termoPesquisa} />
        </CardContent>
      </Card>
    </div>
  )
}