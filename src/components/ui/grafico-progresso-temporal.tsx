'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Calendar, BookOpen, Clock, TrendingUp, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DadosProgresso {
  data: string
  dataFormatada: string
  paginaMaxima: number
  paginasLidas: number
  sessoes: number
  tempoMinutos: number
}

interface EstatisticasProgresso {
  totalDias: number
  totalPaginasLidas: number
  totalSessoes: number
  totalTempo: number
  paginaMaximaGeral: number
  mediaPaginasPorDia: number
  mediaTemposPorDia: number
}

interface GraficoProgressoTemporalProps {
  materialId: string
}

export function GraficoProgressoTemporal({ materialId }: GraficoProgressoTemporalProps) {
  const [dados, setDados] = useState<DadosProgresso[]>([])
  const [estatisticas, setEstatisticas] = useState<EstatisticasProgresso | null>(null)
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

  // Função para tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg min-w-[200px]">
          <p className="font-semibold text-gray-800 mb-2">{data.dataFormatada}</p>
          {tipoVisualizacao === 'paginas' ? (
            <>
              <p className="text-green-600 font-medium">{`Páginas Lidas: ${data.paginasLidas}`}</p>
              <p className="text-sm text-gray-600">{`Sessões: ${data.sessoes}`}</p>
              <p className="text-sm text-gray-600">{`Tempo: ${data.tempoMinutos}min`}</p>
            </>
          ) : (
            <>
              <p className="text-purple-600 font-medium">{`Página Máxima: ${data.paginaMaxima}`}</p>
              <p className="text-sm text-gray-600">{`Sessões: ${data.sessoes}`}</p>
              <p className="text-sm text-gray-600">{`Tempo: ${data.tempoMinutos}min`}</p>
            </>
          )}
        </div>
      )
    }
    return null
  }

  if (carregando) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">Progresso Temporal</h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    )
  }

  if (!dados.length) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">Progresso Temporal</h3>
        </div>
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Nenhum dado de progresso ainda</p>
          <p className="text-sm text-gray-400">Continue lendo para ver seu progresso ao longo do tempo!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">Progresso Temporal</h3>
        </div>
        
        {/* Botões de tipo de visualização */}
        <div className="flex gap-2">
          <Button
            variant={tipoVisualizacao === 'paginas' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTipoVisualizacao('paginas')}
          >
            <BookOpen className="h-4 w-4 mr-1" />
            Páginas Lidas
          </Button>
          <Button
            variant={tipoVisualizacao === 'progresso' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTipoVisualizacao('progresso')}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Progresso
          </Button>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-64 animate-chart-scale-in">
        <ResponsiveContainer width="100%" height="100%">
          {tipoVisualizacao === 'paginas' ? (
            <BarChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="dataFormatada" 
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={{ stroke: '#9CA3AF' }}
                axisLine={{ stroke: '#D1D5DB' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={{ stroke: '#9CA3AF' }}
                axisLine={{ stroke: '#D1D5DB' }}
                label={{ value: 'Páginas Lidas', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 12 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="paginasLidas"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          ) : (
            <BarChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="dataFormatada" 
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={{ stroke: '#9CA3AF' }}
                axisLine={{ stroke: '#D1D5DB' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={{ stroke: '#9CA3AF' }}
                axisLine={{ stroke: '#D1D5DB' }}
                label={{ value: 'Página Máxima', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 12 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="paginaMaxima"
                fill="#8B5CF6"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Estatísticas do período */}
      {estatisticas && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-chart-fade-in mt-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 stat-card-hover cursor-pointer">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-800">Dias Ativos</span>
            </div>
            <div className="text-lg font-bold text-blue-900">{estatisticas.totalDias}</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 stat-card-hover cursor-pointer">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-800">Total Páginas</span>
            </div>
            <div className="text-lg font-bold text-green-900">{estatisticas.totalPaginasLidas}</div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 stat-card-hover cursor-pointer">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-800">Tempo Total</span>
            </div>
            <div className="text-lg font-bold text-orange-900">{estatisticas.totalTempo}min</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 stat-card-hover cursor-pointer">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-800">Média/Dia</span>
            </div>
            <div className="text-lg font-bold text-purple-900">{estatisticas.mediaPaginasPorDia}</div>
          </div>
        </div>
      )}
    </div>
  )
} 