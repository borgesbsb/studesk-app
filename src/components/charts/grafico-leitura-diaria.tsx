'use client'

import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Clock, BookOpen, TrendingUp, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DadosLeitura {
  id: string
  hora: string
  horaCompleta: string
  pagina: number
  tempoSegundos: number
  tempoMinutos: number
  sessao: number
}

interface GraficoLeituraDiariaProps {
  materialId: string
}

export function GraficoLeituraDiaria({ materialId }: GraficoLeituraDiariaProps) {
  const [dados, setDados] = useState<DadosLeitura[]>([])
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

  // Função para tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{`Sessão ${data.sessao}`}</p>
          <p className="text-sm text-gray-600">{`Horário: ${data.horaCompleta}`}</p>
          {tipoGrafico === 'tempo' ? (
            <p className="text-blue-600 font-medium">{`Tempo: ${data.tempoMinutos} min`}</p>
          ) : (
            <p className="text-green-600 font-medium">{`Página: ${data.pagina}`}</p>
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
          <Activity className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Atividade Diária</h3>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!dados.length) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Atividade Diária</h3>
        </div>
        <div className="text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum dado de leitura hoje</p>
          <p className="text-sm text-gray-400">Comece a ler para ver seu progresso!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Atividade Diária</h3>
        </div>
        
        {/* Estatísticas rápidas */}
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {dados.reduce((sum, item) => sum + item.tempoMinutos, 0)}min
            </div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {Math.max(...dados.map(item => item.pagina), 0)}
            </div>
            <div className="text-xs text-gray-500">Última Página</div>
          </div>
        </div>
      </div>

      {/* Botões de alternância */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={tipoGrafico === 'tempo' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTipoGrafico('tempo')}
        >
          <Clock className="h-4 w-4 mr-1" />
          Tempo
        </Button>
        <Button
          variant={tipoGrafico === 'paginas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTipoGrafico('paginas')}
        >
          <BookOpen className="h-4 w-4 mr-1" />
          Páginas
        </Button>
      </div>

      {/* Gráfico */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          {tipoGrafico === 'tempo' ? (
            <AreaChart data={dados}>
              <defs>
                <linearGradient id="tempoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="hora" 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={{ stroke: '#9CA3AF' }}
                axisLine={{ stroke: '#D1D5DB' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={{ stroke: '#9CA3AF' }}
                axisLine={{ stroke: '#D1D5DB' }}
                label={{ value: 'Minutos', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 12 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="tempoMinutos"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#tempoGradient)"
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#1D4ED8' }}
              />
            </AreaChart>
          ) : (
            <BarChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="hora" 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={{ stroke: '#9CA3AF' }}
                axisLine={{ stroke: '#D1D5DB' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={{ stroke: '#9CA3AF' }}
                axisLine={{ stroke: '#D1D5DB' }}
                label={{ value: 'Página', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 12 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="pagina" 
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      
      {/* Dica de interpretação */}
      <div className="text-xs text-gray-500 text-center">
        {tipoGrafico === 'tempo' ? 
          '📊 Tempo de leitura por sessão ao longo do dia' : 
          '📖 Páginas lidas em cada sessão do dia'
        }
      </div>
    </div>
  )
} 