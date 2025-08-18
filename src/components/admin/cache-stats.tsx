'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Database, 
  HardDrive, 
  Coins, 
  Trash2, 
  RefreshCw,
  TrendingUp,
  Activity
} from 'lucide-react'
import { toast } from 'sonner'

interface EstatisticasCache {
  totalChunks: number
  totalTokens: number
  espacoEmMB: number
}

export function CacheStats() {
  const [stats, setStats] = useState<EstatisticasCache | null>(null)
  const [loading, setLoading] = useState(true)
  const [limpando, setLimpando] = useState(false)

  const carregarEstatisticas = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/cache/estatisticas')
      
      if (!response.ok) {
        throw new Error('Erro ao buscar estatísticas')
      }

      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      } else {
        throw new Error(data.message || 'Erro desconhecido')
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      toast.error('Erro ao carregar estatísticas do cache')
    } finally {
      setLoading(false)
    }
  }

  const limparCache = async (dias: number = 30) => {
    try {
      setLimpando(true)
      
      const response = await fetch(`/api/cache/estatisticas?dias=${dias}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Erro ao limpar cache')
      }

      const data = await response.json()
      
      if (data.success) {
        toast.success(`Cache limpo: ${data.chunksRemovidos} chunks removidos`)
        await carregarEstatisticas() // Recarregar estatísticas
      } else {
        throw new Error(data.message || 'Erro desconhecido')
      }
    } catch (error) {
      console.error('Erro ao limpar cache:', error)
      toast.error('Erro ao limpar cache')
    } finally {
      setLimpando(false)
    }
  }

  useEffect(() => {
    carregarEstatisticas()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache de Chunks IA
          </CardTitle>
          <CardDescription>
            Sistema de cache para reduzir custos de processamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatarNumero = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num)
  }

  const calcularEconomiaEstimada = (tokens: number) => {
    // Estimativa baseada em preços da OpenAI (GPT-3.5-turbo ~$0.002/1k tokens)
    const custoEstimado = (tokens / 1000) * 0.002
    return custoEstimado.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 4 
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Cache de Chunks IA
        </CardTitle>
        <CardDescription>
          Sistema de cache para reduzir custos de processamento de texto com IA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {stats ? (
          <>
            {/* Estatísticas principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  Total de Chunks
                </div>
                <div className="text-2xl font-bold">
                  {formatarNumero(stats.totalChunks)}
                </div>
                <Badge variant="secondary" className="text-xs">
                  Textos processados
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coins className="h-4 w-4" />
                  Tokens Economizados
                </div>
                <div className="text-2xl font-bold">
                  {formatarNumero(stats.totalTokens)}
                </div>
                <Badge variant="outline" className="text-xs">
                  ~{calcularEconomiaEstimada(stats.totalTokens)} economizados
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <HardDrive className="h-4 w-4" />
                  Espaço Utilizado
                </div>
                <div className="text-2xl font-bold">
                  {stats.espacoEmMB} MB
                </div>
                <Badge variant="outline" className="text-xs">
                  Armazenamento
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Informações adicionais */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Benefícios do Cache
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <div className="font-medium">💰 Redução de Custos</div>
                  <div className="text-muted-foreground">
                    Evita reprocessamento de textos já analisados pela IA
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">⚡ Performance</div>
                  <div className="text-muted-foreground">
                    Respostas instantâneas para textos em cache
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">🔄 Reutilização</div>
                  <div className="text-muted-foreground">
                    Textos similares aproveitam processamentos anteriores
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">📊 Otimização</div>
                  <div className="text-muted-foreground">
                    Hash SHA256 garante precisão e evita duplicatas
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={carregarEstatisticas}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={() => limparCache(30)}
                disabled={limpando}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {limpando ? 'Limpando...' : 'Limpar Cache (30+ dias)'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => limparCache(7)}
                disabled={limpando}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Limpar Cache (7+ dias)
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma estatística disponível</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 