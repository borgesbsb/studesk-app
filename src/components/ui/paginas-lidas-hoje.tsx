'use client'

import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface DadosLeitura {
  id: string
  hora: string
  horaCompleta: string
  paginaAtual: number
  paginasLidas: number
  tempoSegundos: number
  tempoMinutos: number
  sessao: number
}

interface PaginasLidasHojeProps {
  materialId: string
}

export function PaginasLidasHoje({ materialId }: PaginasLidasHojeProps) {
  const [dados, setDados] = useState<DadosLeitura[]>([])
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

  if (carregando) {
    return (
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (!dados.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhuma página lida hoje</h3>
        <p className="text-sm text-gray-500">
          Inicie uma sessão de leitura para ver suas páginas aqui
        </p>
      </div>
    )
  }

  const formatarTempo = (minutos: number) => {
    if (minutos < 60) return `${minutos}min`
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    return `${horas}h ${mins}min`
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-green-600" />
        <h4 className="font-medium text-gray-900">Páginas Lidas Hoje</h4>
        <Badge variant="outline" className="ml-auto border-green-200 text-green-700">
          {(() => {
            const paginasUnicas = new Set(dados.map(item => item.paginaAtual))
            return `${paginasUnicas.size} páginas`
          })()}
        </Badge>
      </div>
      
      {/* Grid de páginas */}
      <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-2">
        {(() => {
          const paginasVisitadas = dados.map(item => item.paginaAtual)
          const paginaMinima = Math.min(...paginasVisitadas)
          const paginaMaxima = Math.max(...paginasVisitadas)
          
          // Criar array sequencial de páginas do intervalo
          const paginasSequenciais = Array.from(
            { length: paginaMaxima - paginaMinima + 1 }, 
            (_, i) => paginaMinima + i
          )
          
          return paginasSequenciais.map((pagina, index) => {
            const sessoesPagina = dados.filter(item => item.paginaAtual === pagina)
            const foiLida = sessoesPagina.length > 0
            const tempoTotalPagina = sessoesPagina.reduce((acc, item) => acc + item.tempoMinutos, 0)
            const numeroSessoes = sessoesPagina.length
            
            return (
              <div 
                key={`pagina-${pagina}`}
                className="group relative"
              >
                <div 
                  className={`
                    w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium
                    transition-all duration-200 cursor-help
                    ${!foiLida 
                      ? 'bg-gray-100 text-gray-400 border border-gray-200' 
                      : tempoTotalPagina > 15 
                      ? 'bg-green-600 text-white shadow-md' 
                      : tempoTotalPagina > 8 
                      ? 'bg-green-400 text-white' 
                      : 'bg-green-200 text-green-800'
                    }
                    hover:scale-110 hover:shadow-lg
                    ${numeroSessoes > 1 ? 'ring-2 ring-orange-300' : ''}
                  `}
                  title={foiLida 
                    ? `Página ${pagina} - ${formatarTempo(tempoTotalPagina)} (${numeroSessoes} sessão${numeroSessoes > 1 ? 'ões' : ''})` 
                    : `Página ${pagina} - Não visitada`
                  }
                >
                  {pagina}
                </div>
                
                {/* Tooltip no hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  {foiLida ? (
                    <>
                      Pág. {pagina} - {formatarTempo(tempoTotalPagina)}
                      <div className="text-gray-300">
                        {numeroSessoes} sessão{numeroSessoes > 1 ? 'ões' : ''}
                        {numeroSessoes > 1 && ' (revisitada)'}
                      </div>
                    </>
                  ) : (
                    <>Pág. {pagina} - Não visitada</>
                  )}
                </div>
              </div>
            )
          })
        })()}
      </div>
      
      {/* Legenda das cores */}
      <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-600 border-t pt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
          <span>Não visitada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-200 rounded"></div>
          <span>≤ 8min</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-400 rounded"></div>
          <span>8-15min</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-600 rounded"></div>
          <span>&gt; 15min</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-400 rounded ring-2 ring-orange-300"></div>
          <span>Revisitada</span>
        </div>
      </div>
    </div>
  )
} 