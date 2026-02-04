"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SimuladosTable } from "@/components/simulado/simulados-table"
import { AdicionarSimuladoModal } from "@/components/simulado/adicionar-simulado-modal"
import { Input } from "@/components/ui/input"
import { ClipboardList, Search, TrendingUp, Target, Award } from "lucide-react"
import { useState, useEffect } from "react"
import { useHeader } from "@/contexts/header-context"
import { listarSimulados } from "@/interface/actions/simulado/list"
import { getAllSemanasEstudo } from "@/interface/actions/plano-estudo/get-all-semanas"

interface SimuladoMetrics {
  totalSimulados: number
  simuladosFinalizados: number
  mediaAproveitamento: number
  totalQuestoes: number
}

export default function SimuladosPage() {
  const [termoPesquisa, setTermoPesquisa] = useState('')
  const [metrics, setMetrics] = useState<SimuladoMetrics>({
    totalSimulados: 0,
    simuladosFinalizados: 0,
    mediaAproveitamento: 0,
    totalQuestoes: 0
  })
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [ciclosEstudo, setCiclosEstudo] = useState<Array<{ id: string; nome: string }>>([])
  const { setTitle } = useHeader()

  useEffect(() => {
    setTitle("Simulados")
    return () => {
      setTitle("Dashboard")
    }
  }, [setTitle])

  useEffect(() => {
    const carregarDados = async () => {
      try {
        // Carregar ciclos de estudo (semanas)
        console.log('[Simulados Page] Carregando ciclos...')
        const ciclosResponse = await getAllSemanasEstudo()
        console.log('[Simulados Page] Resposta ciclos:', ciclosResponse)
        if (ciclosResponse.success && ciclosResponse.data) {
          const ciclos = ciclosResponse.data.map(semana => ({
            id: semana.id,
            nome: `${semana.plano.nome} - Ciclo ${semana.numeroSemana}`
          }))
          console.log('[Simulados Page] Ciclos formatados:', ciclos)
          setCiclosEstudo(ciclos)
        }

        // Carregar métricas dos simulados
        const response = await listarSimulados()
        if (response.success && response.data) {
          const simulados = response.data
          const totalSimulados = simulados.length
          const simuladosFinalizados = simulados.filter(s => s.status === 'finalizado').length
          const totalQuestoes = simulados.reduce((sum, s) => sum + s.totalQuestoes, 0)

          // Calcular média de aproveitamento apenas dos simulados finalizados
          const simuladosComQuestoes = simulados.filter(s => s.totalQuestoes > 0)
          const mediaAproveitamento = simuladosComQuestoes.length > 0
            ? simuladosComQuestoes.reduce((sum, s) => sum + s.percentualGeral, 0) / simuladosComQuestoes.length
            : 0

          setMetrics({
            totalSimulados,
            simuladosFinalizados,
            mediaAproveitamento: Math.round(mediaAproveitamento * 10) / 10,
            totalQuestoes
          })
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoadingMetrics(false)
      }
    }

    carregarDados()
  }, [])

  return (
    <div className="h-full md:h-auto overflow-y-auto md:overflow-visible">
      <div className="space-y-6 pb-6 md:pb-0 pt-6 px-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total de Simulados */}
          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total de Simulados</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">
                    {loadingMetrics ? '-' : metrics.totalSimulados}
                  </h3>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Simulados Finalizados */}
          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Finalizados</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">
                    {loadingMetrics ? '-' : metrics.simuladosFinalizados}
                  </h3>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Média de Aproveitamento */}
          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Média Geral</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">
                    {loadingMetrics ? '-' : `${metrics.mediaAproveitamento.toFixed(1)}%`}
                  </h3>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total de Questões */}
          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total de Questões</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">
                    {loadingMetrics ? '-' : metrics.totalQuestoes}
                  </h3>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Award className="h-6 w-6 text-orange-600" />
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
                  <ClipboardList className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Todos os Simulados
                  </CardTitle>
                  <p className="text-gray-500 text-sm mt-1">
                    Acompanhe seu desempenho e evolução por disciplinas
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Barra de pesquisa e botão adicionar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-0 mb-6">
              <AdicionarSimuladoModal
                ciclosEstudo={ciclosEstudo}
                onSuccess={() => {
                  window.location.reload()
                }}
              />
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar simulados..."
                  value={termoPesquisa}
                  onChange={(e) => setTermoPesquisa(e.target.value)}
                  className="pl-10 w-full md:w-80 h-10 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg shadow-sm transition-all duration-200"
                />
              </div>
            </div>

            <SimuladosTable termoPesquisa={termoPesquisa} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
