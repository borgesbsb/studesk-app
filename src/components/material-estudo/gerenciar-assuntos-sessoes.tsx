'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, BookOpen, Calendar, Save, Edit3, X, Check, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface SessaoLeitura {
  id: string
  dataLeitura: string
  paginaAtual: number
  tempoLeituraSegundos: number
  assuntosEstudados: string | null
  createdAt: string
}

interface SessaoEstudo {
  id: string
  nome: string
  assuntos: string
  sessoesLeitura: SessaoLeitura[]
  tempoTotal: number
  dataInicio: string
  dataFim: string
}

interface GerenciarAssuntosSessoesProps {
  materialId: string
}

export function GerenciarAssuntosSessoes({ materialId }: GerenciarAssuntosSessoesProps) {
  const [sessoesLeitura, setSessoesLeitura] = useState<SessaoLeitura[]>([])
  const [sessoesEstudo, setSessoesEstudo] = useState<SessaoEstudo[]>([])
  const [sessoesLeituraSelecionadas, setSessoesLeituraSelecionadas] = useState<string[]>([])
  const [nomeSessaoEstudo, setNomeSessaoEstudo] = useState('')
  const [assuntosSessaoEstudo, setAssuntosSessaoEstudo] = useState('')
  const [editandoSessaoEstudo, setEditandoSessaoEstudo] = useState<string | null>(null)
  const [editandoNome, setEditandoNome] = useState('')
  const [editandoAssuntos, setEditandoAssuntos] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [materialId])

  const carregarDados = async () => {
    try {
      const response = await fetch(`/api/material/${materialId}/historico-leitura`)
      if (response.ok) {
        const data = await response.json()
        setSessoesLeitura(data.historico || [])
        
        // Simular sessões de estudo (você pode implementar uma API específica depois)
        const sessoesEstudoMock: SessaoEstudo[] = []
        setSessoesEstudo(sessoesEstudoMock)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const formatarTempo = (segundos: number) => {
    const minutos = Math.floor(segundos / 60)
    const horas = Math.floor(minutos / 60)
    const minutosRestantes = minutos % 60
    
    if (horas > 0) {
      return `${horas}h ${minutosRestantes}min`
    }
    return `${minutos}min`
  }

  const formatarData = (dataString: string) => {
    const data = new Date(dataString)
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const adicionarSessaoLeitura = (sessaoId: string) => {
    if (!sessoesLeituraSelecionadas.includes(sessaoId)) {
      setSessoesLeituraSelecionadas([...sessoesLeituraSelecionadas, sessaoId])
    }
  }

  const removerSessaoLeitura = (sessaoId: string) => {
    setSessoesLeituraSelecionadas(sessoesLeituraSelecionadas.filter(id => id !== sessaoId))
  }

  const obterSessoesLeituraDisponiveis = () => {
    return sessoesLeitura.filter(sessao => !sessoesLeituraSelecionadas.includes(sessao.id))
  }

  const obterSessoesLeituraSelecionadas = () => {
    return sessoesLeitura.filter(sessao => sessoesLeituraSelecionadas.includes(sessao.id))
  }

  const calcularTempoTotal = () => {
    return obterSessoesLeituraSelecionadas().reduce((total, sessao) => total + sessao.tempoLeituraSegundos, 0)
  }

  const criarSessaoEstudo = async () => {
    if (sessoesLeituraSelecionadas.length === 0) {
      toast.error('Selecione pelo menos uma sessão de leitura')
      return
    }

    if (!nomeSessaoEstudo.trim()) {
      toast.error('Digite um nome para a sessão de estudo')
      return
    }

    if (!assuntosSessaoEstudo.trim()) {
      toast.error('Digite os assuntos estudados')
      return
    }

    setSalvando(true)
    try {
      const sessoesLeituraData = obterSessoesLeituraSelecionadas()
      const tempoTotal = calcularTempoTotal()
      const dataInicio = sessoesLeituraData[0]?.dataLeitura
      const dataFim = sessoesLeituraData[sessoesLeituraData.length - 1]?.dataLeitura

      // Aqui você pode implementar uma API para salvar a sessão de estudo
      // Por enquanto, vou simular localmente
      const novaSessaoEstudo: SessaoEstudo = {
        id: Date.now().toString(),
        nome: nomeSessaoEstudo.trim(),
        assuntos: assuntosSessaoEstudo.trim(),
        sessoesLeitura: sessoesLeituraData,
        tempoTotal,
        dataInicio,
        dataFim
      }

      setSessoesEstudo([...sessoesEstudo, novaSessaoEstudo])
      
      // Limpar formulário
      setNomeSessaoEstudo('')
      setAssuntosSessaoEstudo('')
      setSessoesLeituraSelecionadas([])
      
      toast.success('Sessão de estudo criada com sucesso!')
    } catch (error) {
      console.error('Erro ao criar sessão de estudo:', error)
      toast.error('Erro ao criar sessão de estudo')
    } finally {
      setSalvando(false)
    }
  }

  const iniciarEdicaoSessaoEstudo = (sessaoEstudo: SessaoEstudo) => {
    setEditandoSessaoEstudo(sessaoEstudo.id)
    setEditandoNome(sessaoEstudo.nome)
    setEditandoAssuntos(sessaoEstudo.assuntos)
  }

  const cancelarEdicaoSessaoEstudo = () => {
    setEditandoSessaoEstudo(null)
    setEditandoNome('')
    setEditandoAssuntos('')
  }

  const salvarEdicaoSessaoEstudo = async () => {
    if (!editandoSessaoEstudo) return

    setSalvando(true)
    try {
      // Aqui você implementaria a API para atualizar a sessão de estudo
      setSessoesEstudo(sessoesEstudo.map(sessao => 
        sessao.id === editandoSessaoEstudo 
          ? { ...sessao, nome: editandoNome.trim(), assuntos: editandoAssuntos.trim() }
          : sessao
      ))

      setEditandoSessaoEstudo(null)
      setEditandoNome('')
      setEditandoAssuntos('')
      
      toast.success('Sessão de estudo atualizada com sucesso')
    } catch (error) {
      console.error('Erro ao salvar edição:', error)
      toast.error('Erro ao salvar edição')
    } finally {
      setSalvando(false)
    }
  }

  const excluirSessaoEstudo = async (sessaoEstudoId: string) => {
    try {
      // Aqui você implementaria a API para excluir a sessão de estudo
      setSessoesEstudo(sessoesEstudo.filter(sessao => sessao.id !== sessaoEstudoId))
      toast.success('Sessão de estudo excluída com sucesso')
    } catch (error) {
      console.error('Erro ao excluir sessão de estudo:', error)
      toast.error('Erro ao excluir sessão de estudo')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            📝 Sessões de Estudo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Carregando dados...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          📝 Sessões de Estudo
          <Badge variant="outline" className="ml-auto">
            {sessoesLeitura.length} sessões de leitura
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sessoesLeitura.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>Nenhuma sessão de leitura encontrada</p>
            <p className="text-xs mt-1">As sessões aparecerão aqui após você estudar o material</p>
          </div>
        ) : (
          <>
            {/* Área para criar nova sessão de estudo */}
            <div className="bg-blue-50 rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-medium text-blue-800">Criar Nova Sessão de Estudo</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Nome da Sessão de Estudo:
                  </label>
                  <Input
                    value={nomeSessaoEstudo}
                    onChange={(e) => setNomeSessaoEstudo(e.target.value)}
                    placeholder="Ex: Estudo de Gestão de Projetos - Capítulo 1"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Adicionar Sessões de Leitura:
                  </label>
                  <Select value="" onValueChange={adicionarSessaoLeitura}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma sessão de leitura para adicionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {obterSessoesLeituraDisponiveis().map((sessao) => (
                        <SelectItem key={sessao.id} value={sessao.id}>
                          <div className="flex items-center gap-2">
                            <span>{formatarData(sessao.dataLeitura)}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-600">Pág. {sessao.paginaAtual}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-600">{formatarTempo(sessao.tempoLeituraSegundos)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sessões de leitura selecionadas */}
                {sessoesLeituraSelecionadas.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">
                      Sessões Selecionadas ({sessoesLeituraSelecionadas.length}):
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {obterSessoesLeituraSelecionadas().map((sessao) => (
                        <div key={sessao.id} className="flex items-center justify-between bg-white rounded p-2 border">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            <span>{formatarData(sessao.dataLeitura)}</span>
                            <span className="text-gray-500">•</span>
                            <span>Pág. {sessao.paginaAtual}</span>
                            <span className="text-gray-500">•</span>
                            <span>{formatarTempo(sessao.tempoLeituraSegundos)}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removerSessaoLeitura(sessao.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      Tempo total: {formatarTempo(calcularTempoTotal())}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Assuntos Estudados:
                  </label>
                  <Textarea
                    value={assuntosSessaoEstudo}
                    onChange={(e) => setAssuntosSessaoEstudo(e.target.value)}
                    placeholder="Digite os assuntos estudados nesta sessão..."
                    className="min-h-[80px]"
                  />
                </div>

                <Button
                  onClick={criarSessaoEstudo}
                  disabled={salvando || sessoesLeituraSelecionadas.length === 0 || !nomeSessaoEstudo.trim() || !assuntosSessaoEstudo.trim()}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {salvando ? 'Criando...' : 'Criar Sessão de Estudo'}
                </Button>
              </div>
            </div>

            {/* Lista de sessões de estudo criadas */}
            {sessoesEstudo.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Sessões de Estudo Criadas</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {sessoesEstudo.map((sessaoEstudo) => (
                    <div
                      key={sessaoEstudo.id}
                      className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="space-y-3">
                        {/* Cabeçalho da sessão de estudo */}
                        {editandoSessaoEstudo === sessaoEstudo.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editandoNome}
                              onChange={(e) => setEditandoNome(e.target.value)}
                              placeholder="Nome da sessão de estudo..."
                            />
                            <Textarea
                              value={editandoAssuntos}
                              onChange={(e) => setEditandoAssuntos(e.target.value)}
                              placeholder="Assuntos estudados..."
                              className="min-h-[60px]"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={salvarEdicaoSessaoEstudo}
                                disabled={salvando}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelarEdicaoSessaoEstudo}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{sessaoEstudo.nome}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                <span>{sessaoEstudo.sessoesLeitura.length} sessões</span>
                                <span>•</span>
                                <span>{formatarTempo(sessaoEstudo.tempoTotal)}</span>
                                <span>•</span>
                                <span>{formatarData(sessaoEstudo.dataInicio)} - {formatarData(sessaoEstudo.dataFim)}</span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => iniciarEdicaoSessaoEstudo(sessaoEstudo)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => excluirSessaoEstudo(sessaoEstudo.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Assuntos */}
                        {editandoSessaoEstudo !== sessaoEstudo.id && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Assuntos:</p>
                            <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                              {sessaoEstudo.assuntos}
                            </p>
                          </div>
                        )}

                        {/* Sessões de leitura incluídas */}
                        {editandoSessaoEstudo !== sessaoEstudo.id && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">Sessões de Leitura:</p>
                            <div className="grid grid-cols-1 gap-1">
                              {sessaoEstudo.sessoesLeitura.map((sessaoLeitura) => (
                                <div key={sessaoLeitura.id} className="text-xs text-gray-600 bg-gray-50 rounded p-1">
                                  {formatarData(sessaoLeitura.dataLeitura)} • Pág. {sessaoLeitura.paginaAtual} • {formatarTempo(sessaoLeitura.tempoLeituraSegundos)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
} 