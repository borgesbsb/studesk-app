'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Calendar, Target } from 'lucide-react'
import { toast } from 'sonner'
import { adicionarTempoManual } from '@/interface/actions/dashboard/adicionar-tempo-manual'

interface Disciplina {
  id: string
  nome: string
}

interface CicloAtual {
  disciplinaSemanaId: string
  disciplinaNome: string
  numeroSemana: number
  horasPlanejadas: number
  horasRealizadas: number
  dataInicio: string
  dataFim: string
}

interface AdicionarTempoCicloDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materialId: string
  tempoDecorridoMinutos: number
  onConfirm: () => void
}

export function AdicionarTempoCicloDialog({
  open,
  onOpenChange,
  materialId,
  tempoDecorridoMinutos,
  onConfirm
}: AdicionarTempoCicloDialogProps) {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<string | null>(null)
  const [cicloAtual, setCicloAtual] = useState<CicloAtual | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Carregar disciplinas do material
  useEffect(() => {
    if (open && materialId) {
      setLoadingDisciplinas(true)
      fetch(`/api/material/${materialId}/disciplinas`)
        .then(res => res.json())
        .then(data => {
          setDisciplinas(data)
          // Se houver apenas uma disciplina, selecionar automaticamente
          if (data.length === 1) {
            setDisciplinaSelecionada(data[0].id)
          }
        })
        .catch(error => {
          console.error('Erro ao carregar disciplinas:', error)
          toast.error('Erro ao carregar disciplinas')
        })
        .finally(() => {
          setLoadingDisciplinas(false)
        })
    }
  }, [open, materialId])

  // Carregar ciclo atual quando disciplina for selecionada
  useEffect(() => {
    if (disciplinaSelecionada) {
      setLoading(true)
      fetch(`/api/disciplina/${disciplinaSelecionada}/ciclo-atual`)
        .then(res => {
          if (!res.ok) {
            // Não lançar erro, apenas retornar null para tratar graciosamente
            return null
          }
          return res.json()
        })
        .then(data => {
          if (data) {
            setCicloAtual(data)
          } else {
            setCicloAtual(null)
            toast.error('Esta disciplina não está no ciclo de estudos atual')
          }
        })
        .catch(error => {
          // Apenas capturar erros reais de rede
          console.error('Erro de rede ao carregar ciclo:', error)
          setCicloAtual(null)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setCicloAtual(null)
    }
  }, [disciplinaSelecionada])

  const handleAdicionarTempo = async () => {
    if (!disciplinaSelecionada || !cicloAtual) return

    console.log('🔍 [DIALOG] Chamando adicionarTempoManual:', {
      disciplinaSelecionada,
      tempoDecorridoMinutos,
      cicloAtual: {
        horasRealizadasAtual: cicloAtual.horasRealizadas,
        horasPlanejadas: cicloAtual.horasPlanejadas
      }
    })

    setSalvando(true)
    try {
      const resultado = await adicionarTempoManual(disciplinaSelecionada, tempoDecorridoMinutos)

      console.log('🔍 [DIALOG] Resultado de adicionarTempoManual:', resultado)

      if (resultado.success) {
        toast.success(resultado.message)
        onConfirm()
        onOpenChange(false)
      } else {
        toast.error(resultado.message)
      }
    } catch (error) {
      console.error('Erro ao adicionar tempo:', error)
      toast.error('Erro ao adicionar tempo ao ciclo')
    } finally {
      setSalvando(false)
    }
  }

  const handlePular = () => {
    onConfirm()
    onOpenChange(false)
  }

  const formatarTempo = (minutos: number) => {
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    if (horas > 0) {
      return `${horas}h ${mins}min`
    }
    return `${mins}min`
  }

  const formatarData = (dataStr: string) => {
    const data = new Date(dataStr)
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar tempo ao ciclo de estudos?</DialogTitle>
          <DialogDescription>
            Você estudou por {formatarTempo(tempoDecorridoMinutos)}. Deseja adicionar este tempo ao ciclo de estudos atual?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Seleção de Disciplina */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Disciplina</label>
            {loadingDisciplinas ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                Carregando disciplinas...
              </div>
            ) : disciplinas.length === 0 ? (
              <div className="text-sm text-gray-500">
                Este material não está associado a nenhuma disciplina
              </div>
            ) : disciplinas.length === 1 ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Badge variant="secondary">{disciplinas[0].nome}</Badge>
                <span className="text-xs text-gray-500">(Selecionada automaticamente)</span>
              </div>
            ) : (
              <div className="grid gap-2">
                {disciplinas.map(disciplina => (
                  <button
                    key={disciplina.id}
                    onClick={() => setDisciplinaSelecionada(disciplina.id)}
                    className={`p-3 text-left border rounded-md transition-colors ${
                      disciplinaSelecionada === disciplina.id
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">{disciplina.nome}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informações do Ciclo */}
          {loading && disciplinaSelecionada && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              Carregando informações do ciclo...
            </div>
          )}

          {cicloAtual && !loading && (
            <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Semana {cicloAtual.numeroSemana}</span>
                <span className="text-gray-400">•</span>
                <span className="text-xs text-gray-500">
                  {formatarData(cicloAtual.dataInicio)} - {formatarData(cicloAtual.dataFim)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-purple-600 mt-0.5" />
                  <div>
                    <div className="text-xs text-gray-600">Planejado</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {cicloAtual.horasPlanejadas}h
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <div className="text-xs text-gray-600">Realizado</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {Math.round((cicloAtual.horasRealizadas / 60) * 100) / 100}h
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-blue-300">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Após adicionar:</span>
                  <span className="font-semibold text-green-700">
                    {Math.round(((cicloAtual.horasRealizadas + tempoDecorridoMinutos) / 60) * 100) / 100}h
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handlePular}
            disabled={salvando}
          >
            Não, apenas salvar progresso
          </Button>
          <Button
            onClick={handleAdicionarTempo}
            disabled={!disciplinaSelecionada || !cicloAtual || loading || salvando}
            className="bg-green-600 hover:bg-green-700"
          >
            {salvando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Adicionando...
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Sim, adicionar tempo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
