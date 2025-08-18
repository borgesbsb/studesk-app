'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TrendingUp, Clock, Calendar, BarChart3 } from 'lucide-react'
import { GraficoProgressoTemporalNoSSR } from './chart-no-ssr'
import { GraficoUltimaSessao } from './grafico-ultima-sessao'

interface HistoricoProgressoComAbasProps {
  materialId: string
}

export function HistoricoProgressoComAbas({ materialId }: HistoricoProgressoComAbasProps) {
  const [abaAtiva, setAbaAtiva] = useState<'historico' | 'ultima-sessao'>('historico')

  return (
    <div className="w-full">
      {/* Botões de Navegação */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Button
          variant={abaAtiva === 'historico' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setAbaAtiva('historico')}
          className={abaAtiva === 'historico' 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'border-green-200 hover:bg-green-50'
          }
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          <span className="hidden md:inline">Histórico (30 dias)</span>
          <span className="md:hidden">Histórico</span>
        </Button>
        
        <Button
          variant={abaAtiva === 'ultima-sessao' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setAbaAtiva('ultima-sessao')}
          className={abaAtiva === 'ultima-sessao' 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'border-green-200 hover:bg-green-50'
          }
        >
          <Clock className="h-4 w-4 mr-2" />
          <span className="hidden md:inline">Última Sessão</span>
          <span className="md:hidden">Sessão</span>
        </Button>
      </div>
      
      {/* Conteúdo */}
      {abaAtiva === 'historico' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <BarChart3 className="h-4 w-4" />
            <span>Progresso dos últimos 30 dias</span>
          </div>
          <GraficoProgressoTemporalNoSSR materialId={materialId} />
        </div>
      )}
      
      {abaAtiva === 'ultima-sessao' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Calendar className="h-4 w-4" />
            <span>Detalhes da sua última sessão de leitura</span>
          </div>
          <GraficoUltimaSessao materialId={materialId} />
        </div>
      )}
    </div>
  )
} 