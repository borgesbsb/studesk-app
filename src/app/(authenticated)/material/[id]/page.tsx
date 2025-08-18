"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Book, BookOpen, Clock, FileText, RefreshCw, Play, Pause, RotateCcw, TrendingUp, Calendar, BarChart3, Plus, X, Check, CalendarDays, RotateCcw as RotateCcwIcon, CheckCircle, Trash2 } from "lucide-react"
import { useEffect, useState, useCallback, useRef } from "react"
import { MaterialEstudo } from "@/domain/entities/MaterialEstudo"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { ProgressPizza } from "@/components/ui/progress-pizza"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import WebViewerPdfModal from '@/components/material-estudo/webviewer-clean'

import { GraficoLeituraDiariaNoSSR, GraficoProgressoTemporalNoSSR } from '@/components/ui/chart-no-ssr'
import { HistoricoProgressoComAbas } from '@/components/ui/historico-progresso-com-abas'

interface MiniSessao {
  id: string
  paginaAtual: number
  tempoLeituraSegundos: number
  dataLeitura: string
  createdAt: string
  assuntosEstudados?: string
  nomeSessao?: string
}

interface EstatisticasMiniSessoes {
  totalMiniSessoes: number
  totalTempoMinutos: number
  totalTempoSegundos: number
  paginasUnicas: number
  periodoInicio: string | null
  periodoFim: string | null
}



// Função para gerar nome padrão da sessão
function gerarNomePadraoSessao(): string {
  const agora = new Date()
  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
  const diaSemana = diasSemana[agora.getDay()]
  const data = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  
  return `${diaSemana} - ${data} - ${hora}`
}

// Gera nome da sessão a partir de uma data específica
function gerarNomeSessaoPorData(dataRef: Date): string {
  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
  const diaSemana = diasSemana[dataRef.getDay()]
  const data = dataRef.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = dataRef.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${diaSemana} - ${data} - ${hora}`
}

// Componente de estado vazio reutilizável
function EstadoVazio({ 
  icone: Icone, 
  titulo, 
  descricao, 
  cor = "blue" 
}: { 
  icone: any; 
  titulo: string; 
  descricao: string; 
  cor?: "blue" | "purple" | "green" | "yellow" 
}) {
  const cores = {
    blue: "from-blue-100 to-purple-100 text-blue-600",
    purple: "from-purple-100 to-blue-100 text-purple-600", 
    green: "from-green-100 to-emerald-100 text-green-600",
    yellow: "from-yellow-100 to-orange-100 text-yellow-600"
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
      <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${cores[cor]} rounded-full mb-4`}>
        <Icone className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{titulo}</h3>
      <p className="text-gray-500 max-w-sm mx-auto">{descricao}</p>
    </div>
  )
}

// Componente para criar sessão de estudo
function CriarSessaoEstudo({ materialId, nomeMaterial, onSessaoCriada }: { 
  materialId: string; 
  nomeMaterial: string;
  onSessaoCriada?: () => void;
}) {
  const [miniSessoes, setMiniSessoes] = useState<MiniSessao[]>([])
  const [estatisticas, setEstatisticas] = useState<EstatisticasMiniSessoes | null>(null)
  const [sessoesSelecionadas, setSessoesSelecionadas] = useState<string[]>([])
  const [nomeSessao, setNomeSessao] = useState('')
  const [nomeSessaoEditado, setNomeSessaoEditado] = useState(false)
  const [assuntosEstudados, setAssuntosEstudados] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  
  // Estados para mini sessão manual
  const [mostrarFormManual, setMostrarFormManual] = useState(false)
  const [paginaManual, setPaginaManual] = useState('')
  const [tempoManual, setTempoManual] = useState('')
  const [dataManual, setDataManual] = useState('')
  const [salvandoManual, setSalvandoManual] = useState(false)
  const [deletandoSessao, setDeletandoSessao] = useState<string | null>(null)
  const [refreshMiniSessoes, setRefreshMiniSessoes] = useState(0)

  useEffect(() => {
    setNomeSessao(gerarNomePadraoSessao())
  }, [])

  useEffect(() => {
    carregarMiniSessoes()
  }, [materialId])

  const carregarMiniSessoes = async () => {
    try {
      setCarregando(true)
      console.log('🔄 Carregando mini sessões para material:', materialId)
      
      const response = await fetch(`/api/material/${materialId}/mini-sessoes-nao-associadas`)
      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Mini sessões carregadas:', {
          total: data.miniSessoes?.length || 0,
          sessoes: data.miniSessoes?.map((s: any) => ({
            id: s.id,
            pagina: s.paginaAtual,
            assunto: s.assuntosEstudados,
            nomeSessao: s.nomeSessao
          }))
        })
        
        setMiniSessoes(data.miniSessoes || [])
        setEstatisticas(data.estatisticas || null)
      } else {
        console.error('❌ Erro ao carregar mini sessões:', data)
        toast.error('Erro ao carregar mini sessões')
      }
    } catch (error) {
      console.error('❌ Erro ao carregar mini sessões:', error)
      toast.error('Erro ao carregar mini sessões')
    } finally {
      setCarregando(false)
    }
  }

  const formatarTempo = (segundos: number) => {
    const horas = Math.floor(segundos / 3600)
    const minutos = Math.floor((segundos % 3600) / 60)
    const segs = segundos % 60

    if (horas > 0) {
      return `${horas}h ${minutos}m`
    }
    return `${minutos}m ${segs}s`
  }

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const toggleSessao = (sessaoId: string) => {
    setSessoesSelecionadas(prev => 
      prev.includes(sessaoId) 
        ? prev.filter(id => id !== sessaoId)
        : [...prev, sessaoId]
    )
  }

  const selecionarTodas = () => {
    setSessoesSelecionadas(miniSessoes.map(s => s.id))
  }

  const deselecionarTodas = () => {
    setSessoesSelecionadas([])
  }

  const calcularTempoTotal = () => {
    return sessoesSelecionadas.reduce((total, sessaoId) => {
      const sessao = miniSessoes.find(s => s.id === sessaoId)
      return total + (sessao?.tempoLeituraSegundos || 0)
    }, 0)
  }

  const coletarAssuntosDasSessoes = () => {
    const assuntos = sessoesSelecionadas
      .map(sessaoId => {
        const sessao = miniSessoes.find(s => s.id === sessaoId)
        return sessao?.assuntosEstudados
      })
      .filter(assunto => assunto && assunto.trim() !== '')
      .map(assunto => assunto!.trim())

    // Remover duplicatas e juntar com vírgulas
    const assuntosUnicos = [...new Set(assuntos)]
    return assuntosUnicos.join(', ')
  }

  const handleCriarSessao = async () => {
    if (sessoesSelecionadas.length === 0) {
      toast.error('Selecione pelo menos uma mini sessão')
      return
    }

    if (!nomeSessao.trim()) {
      toast.error('Nome da sessão é obrigatório')
      return
    }

    // Verificar se todas as sessões selecionadas existem
    const sessoesValidas = sessoesSelecionadas.filter(id => 
      miniSessoes.some((s: MiniSessao) => s.id === id)
    )

    if (sessoesValidas.length !== sessoesSelecionadas.length) {
      const sessoesInvalidas = sessoesSelecionadas.filter(id => 
        !miniSessoes.some((s: MiniSessao) => s.id === id)
      )
      console.error('❌ Sessões inválidas encontradas:', sessoesInvalidas)
      toast.error('Algumas sessões selecionadas não são mais válidas. Recarregue a página.')
      return
    }

    // Coletar assuntos das mini sessões selecionadas
    const assuntosColetados = coletarAssuntosDasSessoes()
    
    // Se não há assuntos nas mini sessões, usar o campo manual
    const assuntosFinais = assuntosColetados || assuntosEstudados.trim()
    
    if (!assuntosFinais) {
      toast.error('Assuntos estudados são obrigatórios. Selecione mini sessões com assuntos ou digite manualmente.')
      return
    }

    setSalvando(true)
    try {
      // Determinar nome da sessão: se usuário não editou, usar a data da primeira mini sessão selecionada
      let nomeParaSalvar = nomeSessao.trim()
      if (!nomeSessaoEditado && sessoesSelecionadas.length > 0) {
        const sessoesSelecionadasObjs = sessoesSelecionadas
          .map(id => miniSessoes.find(s => s.id === id))
          .filter(Boolean) as MiniSessao[]
        if (sessoesSelecionadasObjs.length > 0) {
          const primeiraData = new Date(
            sessoesSelecionadasObjs
              .map(s => new Date(s.dataLeitura).getTime())
              .sort((a, b) => a - b)[0]
          )
          nomeParaSalvar = gerarNomeSessaoPorData(primeiraData)
          // Atualizar UI para refletir o nome sugerido
          setNomeSessao(nomeParaSalvar)
        }
      }
      console.log('📝 Criando sessão com dados:', {
        sessaoIds: sessoesSelecionadas,
        assuntosEstudados: assuntosFinais,
        nomeSessao: nomeSessao.trim(),
        totalSessoes: sessoesSelecionadas.length
      })

      const response = await fetch(`/api/material/${materialId}/mini-sessoes-nao-associadas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessaoIds: sessoesSelecionadas,
          assuntosEstudados: assuntosFinais,
          nomeSessao: nomeParaSalvar
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Sessão criada com sucesso:', result)
        
        toast.success(`Sessão "${nomeSessao}" criada com sucesso! Progresso atualizado para página ${result.sessaoCriada?.ultimaPagina || 'N/A'}.`)
        
        // Limpar seleções e formulário
        setSessoesSelecionadas([])
        setNomeSessao(gerarNomePadraoSessao())
        setNomeSessaoEditado(false)
        setAssuntosEstudados('')
        
        // Recarregar mini sessões
        await carregarMiniSessoes()
        
        // Notificar componente pai
        if (onSessaoCriada) {
          onSessaoCriada()
        }
      } else {
        const error = await response.json()
        console.error('❌ Erro ao criar sessão:', {
          status: response.status,
          statusText: response.statusText,
          error: error
        })
        
        // Mostrar erro mais detalhado
        if (error.detalhes) {
          toast.error(`${error.error} (${error.detalhes.solicitadas} solicitadas, ${error.detalhes.encontradas} encontradas)`)
        } else {
          toast.error(error.error || 'Erro ao criar sessão')
        }
      }
    } catch (error) {
      console.error('❌ Erro ao criar sessão:', error)
      toast.error('Erro ao criar sessão')
    } finally {
      setSalvando(false)
    }
  }

  const handleCriarMiniSessaoManual = async () => {
    if (!paginaManual.trim() || !tempoManual.trim()) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    const pagina = parseInt(paginaManual)
    const tempo = parseFloat(tempoManual)

    if (isNaN(pagina) || pagina <= 0) {
      toast.error('Página deve ser um número maior que 0')
      return
    }

    if (isNaN(tempo) || tempo <= 0) {
      toast.error('Tempo deve ser um número maior que 0')
      return
    }

    setSalvandoManual(true)
    try {
      const response = await fetch(`/api/material/${materialId}/mini-sessao-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paginaAtual: pagina,
          tempoLeituraMinutos: tempo,
          dataLeitura: dataManual || new Date().toISOString()
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        
        // Resetar formulário manual
        setPaginaManual('')
        setTempoManual('')
        setDataManual('')
        setMostrarFormManual(false)
        
        // Recarregar mini sessões
        await carregarMiniSessoes()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar mini sessão')
      }
    } catch (error) {
      console.error('Erro ao criar mini sessão manual:', error)
      toast.error('Erro ao criar mini sessão manual')
    } finally {
      setSalvandoManual(false)
    }
  }

  const handleDeletarMiniSessao = async (sessaoId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta mini sessão? Esta ação não pode ser desfeita.')) {
      return
    }

    setDeletandoSessao(sessaoId)
    try {
      const response = await fetch(`/api/material/${materialId}/historico-leitura`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessaoId: sessaoId
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        
        // Remover da seleção se estiver selecionada
        setSessoesSelecionadas(prev => prev.filter(id => id !== sessaoId))
        
        // Recarregar mini sessões
        await carregarMiniSessoes()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao excluir mini sessão')
      }
    } catch (error) {
      console.error('Erro ao excluir mini sessão:', error)
      toast.error('Erro ao excluir mini sessão')
    } finally {
      setDeletandoSessao(null)
    }
  }

  if (carregando) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    )
  }

  if (miniSessoes.length === 0) {
    return (
      <div className="space-y-4">
        {/* Botão para adicionar mini sessão manual */}
        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900">Mini Sessões</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarFormManual(!mostrarFormManual)}
            className="text-xs bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
          >
            {mostrarFormManual ? (
              <>
                <X className="h-3 w-3 mr-1" />
                Cancelar
              </>
            ) : (
              <>
                <Plus className="h-3 w-3 mr-1" />
                Adicionar Manual
              </>
            )}
          </Button>
        </div>

        {/* Formulário para adicionar mini sessão manual */}
        {mostrarFormManual && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
            <h4 className="text-sm font-semibold text-green-800 mb-3">Adicionar Mini Sessão Manual</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="paginaManual" className="text-xs text-green-700">
                  Página *
                </Label>
                <Input
                  id="paginaManual"
                  type="number"
                  placeholder="Ex: 15"
                  value={paginaManual}
                  onChange={(e) => setPaginaManual(e.target.value)}
                  className="mt-1 text-sm"
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor="tempoManual" className="text-xs text-green-700">
                  Tempo (minutos) *
                </Label>
                <Input
                  id="tempoManual"
                  type="number"
                  placeholder="Ex: 30"
                  value={tempoManual}
                  onChange={(e) => setTempoManual(e.target.value)}
                  className="mt-1 text-sm"
                  min="0.1"
                  step="0.1"
                />
              </div>
              <div>
                <Label htmlFor="dataManual" className="text-xs text-green-700">
                  Data (opcional)
                </Label>
                <Input
                  id="dataManual"
                  type="datetime-local"
                  value={dataManual}
                  onChange={(e) => setDataManual(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleCriarMiniSessaoManual}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={salvandoManual || !paginaManual.trim() || !tempoManual.trim()}
              >
                {salvandoManual ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Adicionar
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPaginaManual('')
                  setTempoManual('')
                  setDataManual('')
                  setMostrarFormManual(false)
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Mensagem quando não há mini sessões */}
        <EstadoVazio
          icone={CalendarDays}
          titulo="Nenhuma mini sessão disponível"
          descricao="Use o botão 'Adicionar Manual' acima para criar sua primeira mini sessão"
          cor="blue"
        />
      </div>
    )
  }

  return (
    <>
      {/* Coluna 1: Gerenciamento de Mini Sessões */}
      <div className="space-y-4">
        {/* Botão para adicionar mini sessão manual */}
        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900">Mini Sessões</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarFormManual(!mostrarFormManual)}
            className="text-xs bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
          >
            {mostrarFormManual ? (
              <>
                <X className="h-3 w-3 mr-1" />
                Cancelar
              </>
            ) : (
              <>
                <Plus className="h-3 w-3 mr-1" />
                Adicionar Manual
              </>
            )}
          </Button>
        </div>

        {/* Formulário para adicionar mini sessão manual */}
        {mostrarFormManual && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
            <h4 className="text-sm font-semibold text-green-800 mb-3">Adicionar Mini Sessão Manual</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="paginaManual" className="text-xs text-green-700">
                  Página *
                </Label>
                <Input
                  id="paginaManual"
                  type="number"
                  placeholder="Ex: 15"
                  value={paginaManual}
                  onChange={(e) => setPaginaManual(e.target.value)}
                  className="mt-1 text-sm"
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor="tempoManual" className="text-xs text-green-700">
                  Tempo (minutos) *
                </Label>
                <Input
                  id="tempoManual"
                  type="number"
                  placeholder="Ex: 30"
                  value={tempoManual}
                  onChange={(e) => setTempoManual(e.target.value)}
                  className="mt-1 text-sm"
                  min="0.1"
                  step="0.1"
                />
              </div>
              <div>
                <Label htmlFor="dataManual" className="text-xs text-green-700">
                  Data (opcional)
                </Label>
                <Input
                  id="dataManual"
                  type="datetime-local"
                  value={dataManual}
                  onChange={(e) => setDataManual(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleCriarMiniSessaoManual}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={salvandoManual || !paginaManual.trim() || !tempoManual.trim()}
              >
                {salvandoManual ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Adicionar
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPaginaManual('')
                  setTempoManual('')
                  setDataManual('')
                  setMostrarFormManual(false)
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Estatísticas */}
        {estatisticas && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-blue-700 font-medium">
                {estatisticas.totalMiniSessoes} mini sessões disponíveis
              </span>
              <span className="text-blue-600">
                {estatisticas.totalTempoMinutos}min total
              </span>
            </div>
            
            {/* Estatísticas de assuntos */}
            {miniSessoes.length > 0 && (
              <div className="mt-2 pt-2 border-t border-blue-200">
                <p className="text-xs text-blue-600 font-medium mb-1">Assuntos disponíveis:</p>
                <div className="flex flex-wrap gap-1">
                  {[...new Set(miniSessoes
                    .map(s => s.assuntosEstudados)
                    .filter(assunto => assunto && assunto.trim() !== '')
                  )].slice(0, 5).map((assunto, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      📝 {assunto}
                    </span>
                  ))}
                  {[...new Set(miniSessoes
                    .map(s => s.assuntosEstudados)
                    .filter(assunto => assunto && assunto.trim() !== '')
                  )].length > 5 && (
                    <span className="text-xs text-blue-500">
                      +{[...new Set(miniSessoes
                        .map(s => s.assuntosEstudados)
                        .filter(assunto => assunto && assunto.trim() !== '')
                      )].length - 5} mais
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Seleção de mini sessões */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-700">
              Mini Sessões Disponíveis ({miniSessoes.length})
            </Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selecionarTodas}
                className="text-xs"
                disabled={miniSessoes.length === 0}
              >
                Selecionar Todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselecionarTodas}
                className="text-xs"
                disabled={sessoesSelecionadas.length === 0}
              >
                Limpar
              </Button>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3 bg-gray-50">
            {miniSessoes.map((sessao) => (
              <div
                key={sessao.id}
                className={`flex items-center gap-3 p-2 rounded border transition-colors ${
                  sessoesSelecionadas.includes(sessao.id)
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Checkbox
                  checked={sessoesSelecionadas.includes(sessao.id)}
                  onCheckedChange={() => toggleSessao(sessao.id)}
                />
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => toggleSessao(sessao.id)}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      Página {sessao.paginaAtual}
                    </span>
                    <span className="text-gray-500">
                      {formatarTempo(sessao.tempoLeituraSegundos)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatarData(sessao.dataLeitura)}
                  </div>
                  {/* Mostrar assunto se disponível */}
                  {sessao.assuntosEstudados && (
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        📝 {sessao.assuntosEstudados}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeletarMiniSessao(sessao.id)
                  }}
                  disabled={deletandoSessao === sessao.id}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  {deletandoSessao === sessao.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>

          {sessoesSelecionadas.length > 0 && (
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-green-700 font-medium">
                  {sessoesSelecionadas.length} sessões selecionadas
                </span>
                <span className="text-green-600">
                  {formatarTempo(calcularTempoTotal())}
                </span>
              </div>
              
              {/* Mostrar assuntos que serão incluídos */}
              {coletarAssuntosDasSessoes() && (
                <div className="mt-2">
                  <p className="text-xs text-green-600 font-medium mb-1">Assuntos que serão incluídos:</p>
                  <div className="flex flex-wrap gap-1">
                    {coletarAssuntosDasSessoes().split(', ').map((assunto, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        📝 {assunto}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Coluna 2: Formulário da Sessão */}
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
          <h3 className="text-sm font-semibold text-purple-900 mb-3">Configuração da Sessão</h3>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="nomeSessao" className="text-sm font-medium text-gray-700">
                Nome da Sessão *
              </Label>
              <Input
                id="nomeSessao"
                placeholder="Nome da sessão de estudo"
                value={nomeSessao}
                onChange={(e) => { setNomeSessao(e.target.value); setNomeSessaoEditado(true) }}
                className="mt-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="assuntosEstudados" className="text-sm font-medium text-gray-700">
                  Assuntos Estudados *
                </Label>
                {sessoesSelecionadas.length > 0 && coletarAssuntosDasSessoes() !== '' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAssuntosEstudados(coletarAssuntosDasSessoes())}
                    className="text-xs h-6 px-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                  >
                    ✏️ Editar Manualmente
                  </Button>
                )}
              </div>
              <Textarea
                id="assuntosEstudados"
                placeholder="Os assuntos serão coletados automaticamente das mini sessões selecionadas..."
                value={sessoesSelecionadas.length > 0 && !assuntosEstudados ? coletarAssuntosDasSessoes() : assuntosEstudados}
                onChange={(e) => setAssuntosEstudados(e.target.value)}
                className="mt-1 min-h-[120px]"
              />
              {sessoesSelecionadas.length > 0 && coletarAssuntosDasSessoes() !== '' && !assuntosEstudados && (
                <p className="text-xs text-blue-600 mt-1">
                  💡 Assuntos coletados automaticamente das mini sessões selecionadas
                </p>
              )}
            </div>

            <Button
              onClick={handleCriarSessao}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              disabled={salvando || sessoesSelecionadas.length === 0 || !nomeSessao.trim()}
            >
              {salvando ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Criando Sessão...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Criar Sessão de Estudo
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// Componente para visualizar sessões de estudo criadas
function SessoesEstudoCriadas({ materialId, refreshTrigger }: { 
  materialId: string;
  refreshTrigger?: number;
}) {
  const [sessoesEstudo, setSessoesEstudo] = useState<any[]>([])
  const [sessoesFiltradas, setSessoesFiltradas] = useState<any[]>([])
  const [termoPesquisa, setTermoPesquisa] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [excluindo, setExcluindo] = useState<string | null>(null)

  useEffect(() => {
    carregarSessoesEstudo()
  }, [materialId])

  // Recarregar quando uma nova sessão for criada
  useEffect(() => {
    carregarSessoesEstudo()
  }, [materialId, refreshTrigger])

  // Filtrar sessões quando o termo de pesquisa mudar
  useEffect(() => {
    if (!termoPesquisa.trim()) {
      setSessoesFiltradas(sessoesEstudo)
    } else {
      const termo = termoPesquisa.toLowerCase().trim()
      const filtradas = sessoesEstudo.filter(sessao => {
        // Pesquisar no nome da sessão
        if (sessao.nome.toLowerCase().includes(termo)) {
          return true
        }
        // Pesquisar nos assuntos estudados
        if (sessao.assuntosEstudados && sessao.assuntosEstudados.toLowerCase().includes(termo)) {
          return true
        }
        return false
      })
      setSessoesFiltradas(filtradas)
    }
  }, [sessoesEstudo, termoPesquisa])

  const carregarSessoesEstudo = async () => {
    try {
      setCarregando(true)
      const response = await fetch(`/api/material/${materialId}/sessoes-estudo`)
      const data = await response.json()
      
      if (data.success) {
        setSessoesEstudo(data.sessoesEstudo || [])
        setSessoesFiltradas(data.sessoesEstudo || [])
      } else {
        toast.error('Erro ao carregar sessões de estudo')
      }
    } catch (error) {
      console.error('Erro ao carregar sessões de estudo:', error)
      toast.error('Erro ao carregar sessões de estudo')
    } finally {
      setCarregando(false)
    }
  }

  const formatarTempo = (segundos: number) => {
    const horas = Math.floor(segundos / 3600)
    const minutos = Math.floor((segundos % 3600) / 60)
    const segs = segundos % 60

    if (horas > 0) {
      return `${horas}h ${minutos}m`
    }
    return `${minutos}m ${segs}s`
  }

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleExcluirSessao = async (nomeSessao: string) => {
    if (!confirm(`Tem certeza que deseja excluir a sessão "${nomeSessao}"? As mini sessões serão desassociadas mas não serão deletadas.`)) {
      return
    }

    setExcluindo(nomeSessao)
    try {
      const response = await fetch(`/api/material/${materialId}/sessoes-estudo`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nomeSessao: nomeSessao
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        
        // Recarregar sessões
        await carregarSessoesEstudo()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao excluir sessão')
      }
    } catch (error) {
      console.error('Erro ao excluir sessão:', error)
      toast.error('Erro ao excluir sessão de estudo')
    } finally {
      setExcluindo(null)
    }
  }

  if (carregando) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    )
  }

  if (sessoesEstudo.length === 0) {
    return (
      <EstadoVazio
        icone={Book}
        titulo="Nenhuma sessão criada"
        descricao="Crie sua primeira sessão de estudo no tab 'Criar Sessão' para organizar suas mini sessões de leitura"
        cor="blue"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-blue-900 mb-2">Sessões de Estudo</h3>
            <p className="text-blue-700 text-sm">
              {sessoesEstudo.length} sessão{sessoesEstudo.length !== 1 ? 'ões' : ''} organizada{sessoesEstudo.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatarTempo(sessoesEstudo.reduce((total, sessao) => total + sessao.totalTempoSegundos, 0))}
              </div>
              <div className="text-xs text-blue-600 font-medium">Tempo Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {sessoesEstudo.reduce((total, sessao) => total + (sessao.paginasUnicas || 0), 0)}
              </div>
              <div className="text-xs text-purple-600 font-medium">Páginas Lidas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Campo de Pesquisa */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <BookOpen className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Pesquisar por nome da sessão ou assunto estudado..."
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              {termoPesquisa && (
                <button
                  onClick={() => setTermoPesquisa('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <span className="font-medium">{sessoesFiltradas.length}</span>
              <span>de {sessoesEstudo.length} sessões</span>
            </div>
            {termoPesquisa && (
              <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                Filtrado
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Sessões */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">#</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Sessão</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Tempo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Páginas</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-blue-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sessoesFiltradas.map((sessao, index) => (
                <React.Fragment key={sessao.id}>
                  {/* Linha Principal */}
                  <tr className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-gray-900 mb-1">{sessao.nome}</div>
                        <div className="text-xs text-gray-500">
                          {formatarData(sessao.periodoInicio)} - {formatarData(sessao.periodoFim)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-gray-900">{formatarTempo(sessao.totalTempoSegundos)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-gray-900">{sessao.paginasLidas}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExcluirSessao(sessao.nome);
                        }}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50"
                        disabled={excluindo === sessao.nome}
                      >
                        {excluindo === sessao.nome ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                  {/* Linha dos Assuntos */}
                  <tr className="bg-gray-50/50">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="w-full">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                            {sessao.assuntosEstudados.split(',').filter((assunto: string) => assunto.trim()).length} tópico{sessao.assuntosEstudados.split(',').filter((assunto: string) => assunto.trim()).length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-sm font-medium text-gray-700">Assuntos Estudados:</span>
                        </div>
                        <div className="w-full flex flex-wrap gap-2 items-start">
                          {sessao.assuntosEstudados.split(',').map((assunto: string, topicIndex: number) => {
                            const assuntoTrim = assunto.trim()
                            if (!assuntoTrim) return null
                            
                            return (
                              <span 
                                key={topicIndex} 
                                className="inline-flex items-center px-3 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border border-blue-300 hover:from-blue-200 hover:to-purple-200 transition-colors duration-200 shadow-sm"
                              >
                                {assuntoTrim}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>



      {/* Mensagem quando não há resultados na pesquisa */}
      {sessoesEstudo.length > 0 && sessoesFiltradas.length === 0 && termoPesquisa && (
        <div className="flex flex-col items-center justify-center py-12">
          <EstadoVazio
            icone={BookOpen}
            titulo="Nenhuma sessão encontrada"
            descricao={`Não encontramos sessões com o termo "${termoPesquisa}"`}
            cor="yellow"
          />
          <Button
            variant="outline"
            onClick={() => setTermoPesquisa('')}
            className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300 mt-4"
          >
            <X className="h-4 w-4 mr-2" />
            Limpar pesquisa
          </Button>
        </div>
      )}
    </div>
  )
}

interface MaterialData {
  id: string
  nome: string
  totalPaginas: number
  paginasLidas: number
  arquivoPdfUrl: string
  createdAt: string
  updatedAt: string
}

interface DataPoint {
  date: string
  value: number
}

interface AssuntoEstudado {
  id: string
  assunto: string
  data: string
}

function MaterialContent() {
  const params = useParams()
  const router = useRouter()
  const materialId = params?.id as string
  const [material, setMaterial] = useState<MaterialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [atualizandoProgresso, setAtualizandoProgresso] = useState(false)
  const [reiniciandoProgresso, setReiniciandoProgresso] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshSessoes, setRefreshSessoes] = useState(0)
  const [sincronizandoProgresso, setSincronizandoProgresso] = useState(false)
  const [activeTab, setActiveTab] = useState<'progresso' | 'criar-sessao' | 'sessoes' | 'historico'>('progresso')

  // Função para abrir o PDF diretamente
  const handleAbrirPdf = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open)
  }

  const handleVoltar = () => {
    router.back()
  }

  const handleSessaoCriada = async () => {
    setRefreshSessoes(prev => prev + 1)
    
    // Recarregar progresso baseado nas sessões
    if (material) {
      try {
        console.log('🔄 Recarregando progresso após criação de sessão...')
        const response = await fetch(`/api/material/${material.id}/progresso-sessoes`)
        if (response.ok) {
          const data = await response.json()
          console.log('📊 Dados do progresso recebidos:', data)
          
          if (data.success && data.progresso) {
            console.log('✅ Atualizando progresso para:', data.progresso.paginasLidas)
            setMaterial(prev => prev ? {
              ...prev,
              paginasLidas: data.progresso.paginasLidas
            } : null)
          } else {
            console.log('❌ Dados de progresso inválidos:', data)
          }
        } else {
          console.log('❌ Erro na resposta da API:', response.status)
        }
      } catch (error) {
        console.error('❌ Erro ao recarregar progresso:', error)
      }
    }
  }

  const handleMiniSessaoCriada = () => {
    // Recarregar mini sessões na aba de criar sessão
    setRefreshSessoes(prev => prev + 1)
  }

  const handleMaterialAtualizado = (materialAtualizado: { id: string; paginasLidas: number; totalPaginas: number }) => {
    // Atualizar o material no estado local
    setMaterial(prev => prev ? {
      ...prev,
      paginasLidas: materialAtualizado.paginasLidas
    } : null)
    
    console.log('📈 Material atualizado via WebViewer:', materialAtualizado)
  }


  const handleSincronizarProgresso = async () => {
    setSincronizandoProgresso(true)
    try {
      const response = await fetch(`/api/material/${materialId}/progresso-sessoes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMaterial(prev => prev ? {
            ...prev,
            paginasLidas: data.progresso.paginasLidas
          } : null)
          toast.success(`Progresso sincronizado: ${data.progresso.paginasLidas} páginas baseado nas sessões`)
        } else {
          toast.error(data.error || 'Erro ao sincronizar progresso')
        }
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Erro ao sincronizar progresso')
      }
    } catch (error) {
      console.error('Erro ao sincronizar progresso:', error)
      toast.error('Erro ao sincronizar progresso')
    } finally {
      setSincronizandoProgresso(false)
    }
  }

  useEffect(() => {
    async function loadMaterial() {
      if (!materialId) return
      
      try {
        // Carregar material e progresso baseado nas sessões
        const [materialResponse, progressoResponse] = await Promise.all([
          fetch(`/api/material/${materialId}`),
          fetch(`/api/material/${materialId}/progresso-sessoes`)
        ])
        
        const materialData = await materialResponse.json()
        const progressoData = await progressoResponse.json()
        
        console.log('📊 Dados do progresso carregados:', {
          materialData: materialData.material,
          progressoData: progressoData
        })
        
        if (materialData.material) {
          console.log('📚 Material carregado:', materialData.material)
          
          // Atualizar o material com o progresso baseado nas sessões
          const materialComProgresso = {
            ...materialData.material,
            paginasLidas: progressoData.success ? progressoData.progresso.paginasLidas : materialData.material.paginasLidas
          }
          
          console.log('✅ Material com progresso atualizado:', materialComProgresso)
          setMaterial(materialComProgresso)
        } else {
          toast.error("Material não encontrado")
        }
      } catch (error) {
        console.error('Erro ao carregar material:', error)
        toast.error('Erro ao carregar material')
      } finally {
        setLoading(false)
      }
    }

    loadMaterial()
  }, [materialId])

  const handleAtualizarProgresso = useCallback(async (pagina: number) => {
    // Evita re-renders desnecessários do WebViewer
    try {
      // Salva a página atual no banco de dados
      const response = await fetch(`/api/material/${materialId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paginasLidas: pagina,
        }),
      })

      if (response.ok) {
        const updatedData = await response.json()
        if (updatedData.success) {
          // Recarregar o progresso baseado nas sessões
          const progressoResponse = await fetch(`/api/material/${materialId}/progresso-sessoes`)
          const progressoData = await progressoResponse.json()
          
          // Atualiza apenas o estado local para refletir o novo progresso
          // Usando setTimeout para evitar bloquear o WebViewer
          setTimeout(() => {
            setMaterial(prev => prev ? {
              ...prev,
              paginasLidas: progressoData.success ? progressoData.progresso.paginasLidas : updatedData.material.paginasLidas
            } : null)
            toast.success(`Progresso marcado na página ${pagina}`)
          }, 0)
        } else {
          toast.error(updatedData.error || 'Erro ao atualizar progresso')
        }
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Erro ao atualizar progresso')
      }
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error)
      toast.error('Erro ao salvar progresso')
    }
  }, [materialId])

  const handleReiniciarProgresso = useCallback(async () => {
    if (!material) return

    if (!confirm('Tem certeza que deseja reiniciar o progresso? Isso irá zerar todas as páginas lidas.')) {
      return
    }

    setReiniciandoProgresso(true)
    try {
      const response = await fetch(`/api/material/${materialId}/reset-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Recarregar o progresso baseado nas sessões após reiniciar
          const progressoResponse = await fetch(`/api/material/${materialId}/progresso-sessoes`)
          const progressoData = await progressoResponse.json()
          
          setMaterial(prev => prev ? {
            ...prev,
            paginasLidas: progressoData.success ? progressoData.progresso.paginasLidas : 0
          } : null)
          toast.success('Progresso reiniciado com sucesso!')
        } else {
          toast.error(result.error || 'Erro ao reiniciar progresso')
        }
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Erro ao reiniciar progresso')
      }
    } catch (error) {
      console.error('Erro ao reiniciar progresso:', error)
      toast.error('Erro ao reiniciar progresso')
    } finally {
      setReiniciandoProgresso(false)
    }
  }, [materialId, material])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
        <div className="container py-6 space-y-6 max-w-6xl mx-auto">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (!material) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Material não encontrado</h1>
          <Button onClick={handleVoltar} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  const progresso = material.totalPaginas > 0 ? (material.paginasLidas / material.totalPaginas) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-6 space-y-6 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleVoltar}
              className="h-10 w-10 hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
                <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg w-fit">
                  <Book className="h-5 w-5 text-blue-600" />
                </div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                  {material?.nome}
                </h1>
              </div>
              <p className="text-gray-600 text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Material de estudo • {material.totalPaginas} páginas
              </p>
            </div>
            <div className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-lg w-fit">
              <span className="text-sm font-medium">
                {Math.round(progresso)}% concluído
              </span>
            </div>
          </div>
        </div>

        {/* Cards de estatísticas e ações */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('progresso')}
              className={`flex-1 py-4 px-4 text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'progresso'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden md:inline">Progresso de Leitura</span>
              <span className="md:hidden">Progresso</span>
            </button>
            <button
              onClick={() => setActiveTab('criar-sessao')}
              className={`flex-1 py-4 px-4 text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'criar-sessao'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span className="hidden md:inline">Criar Sessão</span>
              <span className="md:hidden">Criar</span>
            </button>
            <button
              onClick={() => setActiveTab('sessoes')}
              className={`flex-1 py-4 px-4 text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'sessoes'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Book className="h-4 w-4" />
              <span className="hidden md:inline">Sessões de Estudo</span>
              <span className="md:hidden">Sessões</span>
            </button>
            <button
              onClick={() => setActiveTab('historico')}
              className={`flex-1 py-4 px-4 text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'historico'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden md:inline">Histórico</span>
              <span className="md:hidden">Histórico</span>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 min-h-[600px]">
            {/* Tab: Progresso de Leitura */}
            {activeTab === 'progresso' && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Progresso de Leitura</h2>
                      <p className="text-sm text-gray-500">Acompanhe sua evolução no material</p>
                    </div>
                  </div>
                  <div className="sm:ml-auto px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm font-semibold w-fit">
                    {Math.round(progresso)}% concluído
                  </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                  {/* Gráfico de Pizza - Coluna Central */}
                  <div className="lg:col-span-1 flex flex-col items-center justify-center space-y-6 w-full">
                    <div className="text-center">
                      <ProgressPizza 
                        value={progresso} 
                        size={180}
                        strokeWidth={10}
                        showPercentage={true}
                        className="mb-4"
                      />
                    </div>
                    
                    {/* Estatísticas de Páginas */}
                    <div className="w-full max-w-xs space-y-4 mx-auto">
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">Páginas Lidas</span>
                          </div>
                          <span className="text-lg font-bold text-blue-600">{material.paginasLidas}</span>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">Total de Páginas</span>
                          </div>
                          <span className="text-lg font-bold text-gray-600">{material.totalPaginas}</span>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">Páginas Restantes</span>
                          </div>
                          <span className="text-lg font-bold text-green-600">{material.totalPaginas - material.paginasLidas}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Informações e Ações - Coluna Direita */}
                  <div className="lg:col-span-2 space-y-6 w-full">
                    {/* Informação sobre Progresso Baseado em Sessões */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <RefreshCw className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-blue-900 mb-2">
                            Progresso Baseado nas Sessões de Estudo
                          </h3>
                          <p className="text-blue-700 leading-relaxed">
                            O progresso é calculado automaticamente com base nas páginas registradas nas suas sessões de estudo criadas no tab "Criar Sessão". 
                            Mini sessões individuais (adicionadas no WebViewer) não atualizam o progresso automaticamente - elas precisam ser associadas a uma sessão de estudo.
                          </p>
                          <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                            <p className="text-sm text-blue-800 font-medium">
                              💡 <strong>Como atualizar o progresso:</strong> Vá para o tab "Criar Sessão", selecione as mini sessões desejadas e crie uma sessão de estudo.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Progresso Detalhada */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Progresso Detalhado</h3>
                        <span className="text-sm text-gray-500">
                          {material.paginasLidas} de {material.totalPaginas} páginas
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progresso}%` }}
                          ></div>
                        </div>
                        
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>0 páginas</span>
                          <span className="font-medium">{Math.round(progresso)}% concluído</span>
                          <span>{material.totalPaginas} páginas</span>
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      <Button
                        onClick={handleAbrirPdf}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12"
                        size="lg"
                      >
                        <FileText className="h-5 w-5 mr-2" />
                        Abrir PDF
                      </Button>
                      
                      <Button
                        onClick={handleSincronizarProgresso}
                        variant="outline"
                        className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 h-12"
                        size="lg"
                        disabled={sincronizandoProgresso}
                      >
                        {sincronizandoProgresso ? (
                          <>
                            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                            Sincronizando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-5 w-5 mr-2" />
                            Sincronizar
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={handleReiniciarProgresso}
                        variant="outline"
                        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200 h-12"
                        size="lg"
                        disabled={reiniciandoProgresso || material.paginasLidas === 0}
                      >
                        {reiniciandoProgresso ? (
                          <>
                            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                            Reiniciando...
                          </>
                        ) : (
                          <>
                            <RotateCcwIcon className="h-5 w-5 mr-2" />
                            Reiniciar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Criar Sessão de Estudo */}
            {activeTab === 'criar-sessao' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Criar Sessão de Estudo</h2>
                    <p className="text-sm text-gray-500">Associe mini sessões e defina assuntos</p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <CriarSessaoEstudo 
                    materialId={material.id} 
                    nomeMaterial={material.nome} 
                    onSessaoCriada={handleSessaoCriada}
                  />
                </div>
              </div>
            )}

            {/* Tab: Sessões de Estudo */}
            {activeTab === 'sessoes' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
                    <Book className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Sessões de Estudo</h2>
                    <p className="text-sm text-gray-500">Visualize suas sessões organizadas</p>
                  </div>
                </div>

                <SessoesEstudoCriadas 
                  materialId={material.id} 
                  refreshTrigger={refreshSessoes}
                />
              </div>
            )}

            {/* Tab: Histórico de Progresso */}
            {activeTab === 'historico' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Histórico de Progresso</h2>
                      <p className="text-sm text-gray-500">Análise detalhada do seu desempenho</p>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    30 Dias
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div>
                    <HistoricoProgressoComAbas materialId={material.id} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {material?.arquivoPdfUrl && (
          <WebViewerPdfModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            pdfUrl={material.arquivoPdfUrl}
            paginaProgresso={material.paginasLidas}
            onAtualizarProgresso={handleAtualizarProgresso}
            materialId={material.id}
            onMiniSessaoCriada={handleMiniSessaoCriada}
            onMaterialAtualizado={handleMaterialAtualizado}
          />
        )}
      </div>
    </div>
  )
}

export default function MaterialPage() {
  return <MaterialContent />
} 