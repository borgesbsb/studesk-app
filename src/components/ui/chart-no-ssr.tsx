'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Clock, BookOpen, TrendingUp, Activity, Target, Calendar, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  VictoryChart, 
  VictoryLine, 
  VictoryArea, 
  VictoryBar, 
  VictoryScatter,
  VictoryAxis, 
  VictoryTooltip, 
  VictoryLabel,
  VictoryLegend,
  VictoryTheme,
  VictoryContainer
} from 'victory'

interface GraficoProps {
  materialId: string
}

// Tema minimalista
const MinimalTheme = {
  ...VictoryTheme.material,
  axis: {
    ...(VictoryTheme.material.axis || {}),
    style: {
      ...(VictoryTheme.material.axis?.style || {}),
      tickLabels: { 
        fontSize: 12, 
        padding: 6, 
        fill: "#6B7280",
        fontFamily: "system-ui, sans-serif"
      },
      grid: { 
        stroke: "#F1F5F9", 
        strokeWidth: 1
      },
      axis: {
        stroke: "#E2E8F0",
        strokeWidth: 1
      }
    }
  },
  dependentAxis: {
    ...(VictoryTheme.material.dependentAxis || {}),
    style: {
      ...(VictoryTheme.material.dependentAxis?.style || {}),
      tickLabels: { 
        fontSize: 12, 
        padding: 6, 
        fill: "#6B7280",
        fontFamily: "system-ui, sans-serif"
      },
      grid: { 
        stroke: "#F1F5F9", 
        strokeWidth: 1
      },
      axis: {
        stroke: "#E2E8F0",
        strokeWidth: 1
      }
    }
  }
}



// Implementação do gráfico de leitura diária com Victory
const GraficoLeituraDiariaVictory = ({ materialId }: GraficoProps) => {
  const [dados, setDados] = useState<any[]>([])
  const [estatisticas, setEstatisticas] = useState<any>(null)
  const [tipoGrafico, setTipoGrafico] = useState<'tempo' | 'paginas'>('tempo')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregando(true)
        const response = await fetch(`/api/material/${materialId}/estatisticas-leitura`)
        const dadosApi = await response.json()
        
        if (dadosApi.success) {
          setDados(dadosApi.dados || [])
          setEstatisticas(dadosApi.estatisticas || null)
        }
      } catch (error) {
        console.error('Erro ao carregar dados de leitura diária:', error)
      } finally {
        setCarregando(false)
      }
    }

    if (materialId) {
      carregarDados()
    }
  }, [materialId])

  if (carregando) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-blue-500 rounded-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Atividade Diária</h3>
        </div>
        <div className="h-72 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-500"></div>
        </div>
      </div>
    )
  }

  if (!dados.length) {
    return (
      <div className="bg-gradient-to-br from-white via-slate-50/30 to-gray-50/50 rounded-2xl p-8 shadow-lg border border-gray-100/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-gray-400 to-gray-500 rounded-xl shadow-lg">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-600 to-gray-700 bg-clip-text text-transparent">
            Atividade Diária
          </h3>
        </div>
        <div className="text-center py-16">
          <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl inline-block mb-6 shadow-inner">
            <BookOpen className="h-20 w-20 text-blue-300 mx-auto" />
          </div>
          <p className="text-xl font-semibold text-gray-600 mb-2">Nenhum dado de leitura hoje</p>
          <p className="text-gray-500">Comece a ler para ver seu progresso em tempo real!</p>
        </div>
      </div>
    )
  }

  // Preparar dados para Victory com tooltip detalhado
  const dadosVictory = dados.map((item, index) => ({
    x: item.hora,
    y: tipoGrafico === 'tempo' ? item.tempoMinutos : (item.paginasLidas || item.pagina || 0),
    label: `🕐 ${item.hora}\n${tipoGrafico === 'tempo' ? '⏱️ Tempo:' : '📚 Páginas:'} ${tipoGrafico === 'tempo' ? `${item.tempoMinutos} min` : `${item.paginasLidas || 0}`}\n📖 Sessão: ${item.sessao || index + 1}\n📄 Página: ${item.paginaAtual || item.paginasLidas || 0}`,
    sessao: item.sessao || index + 1,
    paginaAtual: item.paginaAtual || item.paginasLidas || 0,
    tempoMinutos: item.tempoMinutos
  }))

  // Usar estatísticas da API ou calcular como fallback
  const totalTempo = estatisticas?.totalMinutos || dados.reduce((sum, item) => sum + item.tempoMinutos, 0)
  const totalSessoes = estatisticas?.totalSessoes || dados.length
  const totalPaginasLidas = estatisticas?.totalPaginasLidas || dados.reduce((sum, item) => sum + (item.paginasLidas || 0), 0)
  const paginaAtual = estatisticas?.paginaMaxima || Math.max(...dados.map(item => item.paginaAtual || item.paginasLidas || 0), 0)
  const tempoMedioSessao = estatisticas?.tempoMedioSessao || (totalSessoes > 0 ? Math.round(totalTempo / totalSessoes) : 0)

  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 rounded-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Atividade Diária</h3>
            <p className="text-sm text-gray-500">Acompanhe seu ritmo de leitura</p>
          </div>
        </div>
        
        {/* Estatísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg mb-2">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalSessoes}</div>
            <div className="text-xs text-gray-500">Sessões</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-lg mb-2">
              <BookOpen className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalPaginasLidas}</div>
            <div className="text-xs text-gray-500">Páginas Lidas</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-50 rounded-lg mb-2">
              <Timer className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalTempo}min</div>
            <div className="text-xs text-gray-500">Tempo Total</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-orange-50 rounded-lg mb-2">
              <Target className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{paginaAtual}</div>
            <div className="text-xs text-gray-500">Página Atual</div>
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="flex gap-2 mb-8">
        <Button
          variant={tipoGrafico === 'tempo' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTipoGrafico('tempo')}
          className="transition-colors"
        >
          <Clock className="h-4 w-4 mr-2" />
          Tempo
        </Button>
        <Button
          variant={tipoGrafico === 'paginas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTipoGrafico('paginas')}
          className="transition-colors"
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Páginas
        </Button>
      </div>

      {/* Gráfico Victory Premium */}
      <div className="h-80 bg-gradient-to-br from-white/80 to-gray-50/50 rounded-2xl p-4 shadow-inner border border-gray-100/50 backdrop-blur-sm">
        <VictoryChart
          theme={MinimalTheme}
          height={300}
          width={700}
          padding={{ left: 70, top: 60, right: 40, bottom: 60 }}
          containerComponent={<VictoryContainer responsive={true} />}
        >
          {/* Legenda do gráfico */}
          <VictoryLegend
            x={70} 
            y={10}
            orientation="horizontal"
            gutter={20}
            style={{
              border: { stroke: "#E5E7EB", strokeWidth: 1 },
              title: { fontSize: 14, fill: "#374151", fontFamily: "Inter, system-ui, sans-serif" },
              labels: { fontSize: 12, fill: "#6B7280", fontFamily: "Inter, system-ui, sans-serif" }
            }}
            data={[
              { 
                name: tipoGrafico === 'tempo' ? 'Tempo de Leitura (min)' : 'Páginas Lidas', 
                symbol: { 
                  fill: tipoGrafico === 'tempo' ? "#3B82F6" : "#10B981",
                  type: tipoGrafico === 'tempo' ? "triangleUp" : "square"
                }
              }
            ]}
          />
          <VictoryAxis 
            dependentAxis
            tickFormat={(t) => `${Math.round(t)}${tipoGrafico === 'tempo' ? 'm' : 'p'}`}
            style={{
              tickLabels: { 
                fontSize: 13, 
                fill: "#64748B",
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 600
              },
              grid: { 
                stroke: "#E2E8F0", 
                strokeWidth: 1,
                strokeDasharray: "3,3"
              }
            }}
          />
          <VictoryAxis 
            style={{
              tickLabels: { 
                fontSize: 13, 
                fill: "#64748B", 
                angle: -45,
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 600
              },
              grid: { stroke: "transparent" }
            }}
          />
          
                     {tipoGrafico === 'tempo' ? (
             <VictoryArea
               data={dadosVictory}
               style={{
                 data: { 
                   fill: "url(#tempoGradient)", 
                   fillOpacity: 0.6,
                   stroke: "#3B82F6", 
                   strokeWidth: 2,
                   strokeLinecap: "round"
                 }
               }}
               animate={{
                 duration: 800,
                 onLoad: { duration: 400 }
               }}
               labelComponent={
                 <VictoryTooltip
                   flyoutStyle={{
                     stroke: "#3B82F6",
                     fill: "white",
                     strokeWidth: 1
                   }}
                   flyoutPadding={8}
                   pointerLength={4}
                   cornerRadius={4}
                   style={{ 
                     fontSize: 11, 
                     fill: "#374151",
                     fontFamily: "system-ui, sans-serif",
                     fontWeight: 500,
                     textAnchor: "middle"
                   }}
                 />
               }
             />
           ) : (
             <VictoryBar
               data={dadosVictory}
               style={{
                 data: { 
                   fill: ({ datum }) => datum.y > 0 ? "#10B981" : "#E5E7EB",
                   fillOpacity: 0.8,
                   stroke: "transparent"
                 }
               }}
               animate={{
                 duration: 800,
                 onLoad: { duration: 400 }
               }}
               labelComponent={
                 <VictoryTooltip
                   flyoutStyle={{
                     stroke: "#10B981",
                     fill: "white",
                     strokeWidth: 1
                   }}
                   flyoutPadding={8}
                   pointerLength={4}
                   cornerRadius={4}
                   style={{ 
                     fontSize: 11, 
                     fill: "#374151",
                     fontFamily: "system-ui, sans-serif",
                     fontWeight: 500,
                     textAnchor: "middle"
                   }}
                 />
               }
               cornerRadius={4}
               barWidth={24}
             />
           )}
        </VictoryChart>
        
        {/* Gradiente SVG para área */}
        <svg width="0" height="0">
          <defs>
            <linearGradient id="tempoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#6366F1" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Resumo das Sessões */}
      {dados.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Resumo das Sessões de Hoje
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Tempo Médio/Sessão</span>
                <Timer className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-lg font-bold text-gray-900">{tempoMedioSessao}min</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Ritmo de Leitura</span>
                <BookOpen className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                {totalTempo > 0 ? Math.round((totalPaginasLidas / totalTempo) * 60) : 0} pág/h
              </div>
            </div>
          </div>
          
          {/* Lista de Sessões */}
          <div className="mt-4">
            <h5 className="text-xs font-semibold text-gray-600 mb-2">Sessões de Hoje:</h5>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {dados.map((sessao, index) => (
                <div key={index} className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-200 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                      #{sessao.sessao}
                    </span>
                    <span className="text-gray-600">{sessao.hora}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{sessao.paginasLidas} pág</span>
                    <span>{sessao.tempoMinutos}min</span>
                    <span className="text-gray-400">→ p.{sessao.paginaAtual}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


    </div>
  )
}

// Implementação do gráfico de progresso temporal com Victory
const GraficoProgressoTemporalVictory = ({ materialId }: GraficoProps) => {
  const [dados, setDados] = useState<any[]>([])
  const [estatisticas, setEstatisticas] = useState<any>(null)
  const [tipoVisualizacao, setTipoVisualizacao] = useState<'paginas' | 'progresso'>('paginas')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregando(true)
        const response = await fetch(`/api/material/${materialId}/historico-progresso`)
        const dadosApi = await response.json()
        
        if (dadosApi.success) {
          setDados(dadosApi.dados || [])
          setEstatisticas(dadosApi.estatisticas || null)
        }
      } catch (error) {
        console.error('Erro ao carregar dados de progresso temporal:', error)
      } finally {
        setCarregando(false)
      }
    }

    if (materialId) {
      carregarDados()
    }
  }, [materialId])

  if (carregando) {
    return (
      <div className="bg-gradient-to-br from-white via-slate-50/30 to-gray-50/50 rounded-2xl p-8 shadow-xl border border-gray-100/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-r from-purple-400 to-purple-500 rounded-xl shadow-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
            Progresso Temporal
          </h3>
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    )
  }

  if (!dados.length) {
    return (
      <div className="bg-gradient-to-br from-white via-slate-50/30 to-gray-50/50 rounded-2xl p-8 shadow-xl border border-gray-100/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-r from-gray-400 to-gray-500 rounded-xl shadow-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-600 to-gray-700 bg-clip-text text-transparent">
            Progresso Temporal
          </h3>
        </div>
        <div className="text-center py-20">
          <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-100 rounded-3xl inline-block mb-6 shadow-inner">
            <TrendingUp className="h-24 w-24 text-purple-300 mx-auto" />
          </div>
          <p className="text-xl font-semibold text-gray-600 mb-2">Nenhum histórico de progresso ainda</p>
          <p className="text-gray-500">Continue lendo para ver sua evolução ao longo do tempo!</p>
        </div>
      </div>
    )
  }

  // Preparar dados para Victory - sem labels nos pontos visíveis
  const dadosVictory = dados.map((item, index) => ({
    x: item.dataFormatada || `Dia ${index + 1}`,
    y: tipoVisualizacao === 'paginas' ? item.paginasLidas : item.paginaMaxima
  }))

  // Dados separados com labels apenas para tooltips
  const dadosTooltip = dados.map((item, index) => ({
    x: item.dataFormatada || `Dia ${index + 1}`,
    y: tipoVisualizacao === 'paginas' ? item.paginasLidas : item.paginaMaxima,
    label: `${item.dataFormatada || `Dia ${index + 1}`}\n${tipoVisualizacao === 'paginas' ? 'Páginas' : 'Progresso'}: ${tipoVisualizacao === 'paginas' ? item.paginasLidas : item.paginaMaxima}\nSessões: ${item.sessoes}\nTempo: ${item.tempoMinutos}min`
  }))

     return (
    <div className="bg-gradient-to-br from-white via-slate-50/30 to-gray-50/50 rounded-2xl p-8 shadow-xl border border-gray-100/50">
      {/* Cabeçalho */}
       <div className="flex items-center justify-between mb-6">
         <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-purple-400 to-purple-500 rounded-xl shadow-lg">
            <TrendingUp className="h-6 w-6 text-white" />
           </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
               Progresso Temporal
             </h3>
         </div>
        
        {/* Botões de tipo de visualização */}
         <div className="flex gap-2">
          <button
             onClick={() => setTipoVisualizacao('paginas')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tipoVisualizacao === 'paginas'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
           >
            <BookOpen className="h-4 w-4 inline mr-2" />
             Páginas
          </button>
          <button
             onClick={() => setTipoVisualizacao('progresso')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tipoVisualizacao === 'progresso'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
           >
            <TrendingUp className="h-4 w-4 inline mr-2" />
             Progresso
          </button>
         </div>
      </div>

      {/* Gráfico */}
       <div className="h-96 bg-white rounded-lg p-4 border border-gray-200">
        <VictoryChart
          theme={MinimalTheme}
          height={360}
          width={800}
          padding={{ left: 70, top: 20, right: 40, bottom: 80 }}
          containerComponent={<VictoryContainer responsive={true} />}
        >
          <VictoryAxis 
            dependentAxis
            tickFormat={(t) => `${Math.round(t)}${tipoVisualizacao === 'paginas' ? 'p' : ''}`}
            style={{
              tickLabels: { 
                fontSize: 13, 
                fill: "#64748B",
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 600
              },
              grid: { 
                stroke: "#E2E8F0", 
                strokeWidth: 1,
                strokeDasharray: "3,3"
              }
            }}
          />
          <VictoryAxis 
            style={{
              tickLabels: { 
                fontSize: 12, 
                fill: "#64748B", 
                angle: -45,
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 600
              },
              grid: { stroke: "transparent" }
            }}
          />
          
          <VictoryBar
             data={dadosVictory}
             style={{
               data: { 
                fill: tipoVisualizacao === 'paginas' ? "#10B981" : "#8B5CF6", 
                opacity: 0.8
               }
             }}
             animate={{
               duration: 1200,
               onLoad: { duration: 600 }
             }}
            cornerRadius={4}
          />
          
          {/* Tooltips */}
           <VictoryScatter
             data={dadosTooltip}
            size={0}
             labelComponent={
               <VictoryTooltip
                style={{ fontSize: 12, fontFamily: "Inter, system-ui, sans-serif" }}
                 flyoutStyle={{
                  stroke: "#374151",
                  strokeWidth: 1,
                   fill: "white",
                  filter: "drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))"
                }}
                cornerRadius={8}
                pointerLength={6}
              />
            }
            labels={({ datum }) => datum.label}
           />
                </VictoryChart>
      </div>

      {/* Estatísticas */}
       {estatisticas && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 shadow-sm border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Dias Ativos</span>
             </div>
            <div className="text-2xl font-bold text-blue-900">{estatisticas.totalDias}</div>
           </div>
           
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 shadow-sm border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Total Páginas</span>
             </div>
            <div className="text-2xl font-bold text-green-900">{estatisticas.totalPaginasLidas}</div>
           </div>
           
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 shadow-sm border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">Tempo Total</span>
             </div>
            <div className="text-2xl font-bold text-orange-900">{estatisticas.totalTempo}min</div>
           </div>
           
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 shadow-sm border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Média/Dia</span>
             </div>
            <div className="text-2xl font-bold text-purple-900">{estatisticas.mediaPaginasPorDia}</div>
           </div>
         </div>
       )}
     </div>
  )
}

// Loading components Premium
const ChartLoadingState = ({ height = "h-80" }: { height?: string }) => (
  <div className={`${height} bg-gradient-to-br from-white to-gray-50 rounded-2xl animate-pulse flex items-center justify-center shadow-lg border border-gray-100`}>
    <div className="text-center">
      <div className="relative mb-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 mx-auto"></div>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0 left-1/2 transform -translate-x-1/2"></div>
      </div>
      <div className="text-gray-500 font-medium">Carregando gráfico...</div>
    </div>
  </div>
)

// Wrapper que só renderiza no cliente
const ClientOnlyWrapper = ({ children }: { children: React.ReactNode }) => {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <ChartLoadingState />
  }

  return <>{children}</>
}

// Componentes Victory isolados
const GraficoLeituraDiariaInternal = dynamic(
  () => Promise.resolve(GraficoLeituraDiariaVictory),
  { 
    ssr: false,
    loading: () => <ChartLoadingState height="h-64" />
  }
)

const GraficoProgressoTemporalInternal = dynamic(
  () => Promise.resolve(GraficoProgressoTemporalVictory),
  { 
    ssr: false,
    loading: () => <ChartLoadingState height="h-80" />
  }
)

// Exportações finais
export const GraficoLeituraDiariaNoSSR = ({ materialId }: GraficoProps) => (
  <ClientOnlyWrapper>
    <GraficoLeituraDiariaInternal materialId={materialId} />
  </ClientOnlyWrapper>
)

export const GraficoProgressoTemporalNoSSR = ({ materialId }: GraficoProps) => (
  <ClientOnlyWrapper>
    <GraficoProgressoTemporalInternal materialId={materialId} />
  </ClientOnlyWrapper>
) 