"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SimuladosTable } from "@/components/simulado/simulados-table"
import { AdicionarSimuladoModal } from "@/components/simulado/adicionar-simulado-modal"
import { EvolucaoChart } from "@/components/simulado/evolucao-chart"
import { Input } from "@/components/ui/input"
import { ClipboardList, Search, TrendingUp, Award, BarChart2 } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { useHeader } from "@/contexts/header-context"
import { SimuladoComMetrics } from "@/application/services/simulado.service"

export default function SimuladosPage() {
  const [termoPesquisa, setTermoPesquisa] = useState('')
  const [simulados, setSimulados] = useState<SimuladoComMetrics[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const { setTitle } = useHeader()

  useEffect(() => {
    setTitle("Simulados")
    return () => setTitle("Dashboard")
  }, [setTitle])

  const handleLoad = useCallback((data: SimuladoComMetrics[]) => {
    setSimulados(data)
  }, [])

  const totalSimulados = simulados.length
  const totalQuestoes = simulados.reduce((s, sim) => s + sim.totalQuestoes, 0)
  const totalAcertos = simulados.reduce((s, sim) => s + sim.totalAcertos, 0)
  const mediaGeral = totalQuestoes > 0
    ? Math.round((totalAcertos / totalQuestoes) * 1000) / 10
    : 0

  return (
    <div className="h-full md:h-auto overflow-y-auto md:overflow-visible">
      <div className="space-y-6 pb-6 md:pb-0 pt-6 px-6">

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-border shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Simulados</p>
                  <h3 className="text-3xl font-bold text-card-foreground mt-2">{totalSimulados}</h3>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Média Geral</p>
                  <h3 className={`text-3xl font-bold mt-2 ${
                    mediaGeral >= 70 ? 'text-green-600' : mediaGeral >= 50 ? 'text-yellow-600' : 'text-card-foreground'
                  }`}>
                    {totalSimulados > 0 ? `${mediaGeral.toFixed(1)}%` : '-'}
                  </h3>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Acertos</p>
                  <h3 className="text-3xl font-bold text-card-foreground mt-2">
                    {totalSimulados > 0 ? `${totalAcertos}/${totalQuestoes}` : '-'}
                  </h3>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Award className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Evolução */}
        {simulados.length >= 2 && (
          <Card className="border border-border shadow-sm bg-card">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <BarChart2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-base font-semibold">Evolução por Disciplina</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <EvolucaoChart simulados={simulados} />
            </CardContent>
          </Card>
        )}

        {/* Tabela de Simulados */}
        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="pb-5 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-card-foreground">
                    Todos os Simulados
                  </CardTitle>
                  <p className="text-muted-foreground text-sm mt-1">
                    Acompanhe seu desempenho e evolução por disciplinas
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-0 mb-6">
              <AdicionarSimuladoModal
                onSuccess={() => setRefreshKey(k => k + 1)}
              />
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar simulados..."
                  value={termoPesquisa}
                  onChange={(e) => setTermoPesquisa(e.target.value)}
                  className="pl-10 w-full md:w-80 h-10 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg shadow-sm transition-all duration-200"
                />
              </div>
            </div>
            <SimuladosTable
              key={refreshKey}
              termoPesquisa={termoPesquisa}
              onLoad={handleLoad}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
