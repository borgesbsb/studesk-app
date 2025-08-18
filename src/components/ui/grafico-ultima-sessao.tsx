'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, BookOpen, Calendar, TrendingUp } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface DadosUltimaSessao {
  id: string
  ordem: number
  pagina: number
  horario: string
  tempoLeituraMinutos: number
  dataLeitura: string
}

interface EstatisticasUltimaSessao {
  totalPaginasLidas: number
  tempoTotalMinutos: number
  paginaInicial: number
  paginaFinal: number
  dataUltimaSessao: string | null
  totalRegistros: number
}

interface GraficoUltimaSessaoProps {
  materialId: string
}

export function GraficoUltimaSessao({ materialId }: GraficoUltimaSessaoProps) {
  const [dados, setDados] = useState<DadosUltimaSessao[]>([])
  const [estatisticas, setEstatisticas] = useState<EstatisticasUltimaSessao | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregando(true)
        const response = await fetch(`/api/material/${materialId}/historico-leitura/ultima-sessao`)
        const dadosApi = await response.json()
        
        if (dadosApi.success) {
          setDados(dadosApi.dadosUltimaSessao || [])
          setEstatisticas(dadosApi.estatisticas || null)
        }
      } catch (error) {
        console.error('Erro ao carregar dados da última sessão:', error)
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
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (!dados.length || !estatisticas) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhuma sessão encontrada</h3>
        <p className="text-sm text-gray-500">
          Inicie uma sessão de leitura para ver seus dados aqui
        </p>
      </div>
    )
  }

  const formatarData = (dataString: string) => {
    const data = new Date(dataString)
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatarTempo = (minutos: number) => {
    if (minutos < 60) return `${minutos}min`
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    return `${horas}h ${mins}min`
  }

  // Tooltip customizado para o gráfico
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <div className="font-medium text-gray-900 mb-1">📖 {label}</div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Página: {data.pagina}</div>
            <div>Tempo: {formatarTempo(data.tempoLeituraMinutos)}</div>
            <div>Ordem: {data.ordem}º registro</div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas da última sessão */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-800">Páginas Lidas</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{estatisticas.totalPaginasLidas}</div>
          <div className="text-xs text-blue-600">
            {estatisticas.paginaInicial} → {estatisticas.paginaFinal}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-800">Tempo Total</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {formatarTempo(estatisticas.tempoTotalMinutos)}
          </div>
          <div className="text-xs text-green-600">{estatisticas.totalRegistros} registros</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-800">Ritmo Médio</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {estatisticas.tempoTotalMinutos > 0 ? 
              Math.round(estatisticas.totalPaginasLidas / (estatisticas.tempoTotalMinutos / 60) * 10) / 10 : 0
            }
          </div>
          <div className="text-xs text-purple-600">páginas/hora</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-orange-600" />
            <span className="text-xs font-medium text-orange-800">Data</span>
          </div>
          <div className="text-lg font-bold text-orange-900">
            {estatisticas.dataUltimaSessao ? formatarData(estatisticas.dataUltimaSessao) : 'N/A'}
          </div>
          <div className="text-xs text-orange-600">última sessão</div>
        </div>
      </div>



      {/* Gráfico de progresso da sessão */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
          <h4 className="font-medium text-gray-900">Progresso da Última Sessão</h4>
          <Badge variant="secondary" className="ml-auto">
            {dados.length} marcos
          </Badge>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dados} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="colorPagina" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="horario" 
                stroke="#6B7280"
                fontSize={12}
                tick={{ fill: '#6B7280' }}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
                tick={{ fill: '#6B7280' }}
                label={{ value: 'Página', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="pagina"
                stroke="#3B82F6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPagina)"
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2, fill: '#FFFFFF' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda do gráfico */}
        <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Progresso de leitura por horário</span>
          </div>
        </div>
      </div>

      {/* Timeline detalhado */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Timeline da Sessão
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {dados.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 p-2 bg-white rounded border">
              <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                {item.ordem}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Página {item.pagina}</span>
                  <span className="text-sm text-gray-500">{item.horario}</span>
                </div>
                <div className="text-xs text-gray-600">
                  Tempo de leitura: {formatarTempo(item.tempoLeituraMinutos)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 