'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { PlanejamentoDisciplinas, DisciplinaPlanejada } from './planejamento-disciplinas'
import { PlanejamentoRapido } from './planejamento-rapido'
import { PlanejamentoAgil } from './planejamento-agil'
import { PlanejamentoSimples } from './planejamento-simples'
import { getPlanoEstudoById } from '@/interface/actions/plano-estudo/get-by-id'
import { addWeeks, format, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Save, X } from 'lucide-react'
import { toast } from 'sonner'

interface AdicionarCicloModalProps {
  planoId: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface PlanoEstudo {
  id: string
  nome: string
  dataInicio: string
  dataFim: string
  semanas: Array<{
    numeroSemana: number
    dataInicio: string
    dataFim: string
  }>
}

export function AdicionarCicloModal({ planoId, isOpen, onClose, onSuccess }: AdicionarCicloModalProps) {
  const [loading, setLoading] = useState(false)
  const [plano, setPlano] = useState<PlanoEstudo | null>(null)
  const [loadingPlano, setLoadingPlano] = useState(false)
  const [disciplinas, setDisciplinas] = useState<DisciplinaPlanejada[]>([])
  const [formData, setFormData] = useState({
    dataInicio: '',
    dataFim: '',
    observacoes: ''
  })

  useEffect(() => {
    if (planoId && isOpen) {
      carregarPlano()
    }
  }, [planoId, isOpen])

  const carregarPlano = async () => {
    if (!planoId) return
    
    setLoadingPlano(true)
    try {
      const resultado = await getPlanoEstudoById(planoId)
      if (resultado.success && resultado.data) {
        // Converter datas para string para compatibilidade com a interface
        const planoData = {
          ...resultado.data,
          dataInicio: resultado.data.dataInicio.toString(),
          dataFim: resultado.data.dataFim.toString(),
          semanas: resultado.data.semanas.map(semana => ({
            ...semana,
            dataInicio: semana.dataInicio.toString(),
            dataFim: semana.dataFim.toString()
          }))
        }
        setPlano(planoData)
        
        // Calcular próxima semana automaticamente
        const ultimaSemana = resultado.data.semanas[resultado.data.semanas.length - 1]
        if (ultimaSemana) {
          const proximaDataInicio = addWeeks(new Date(ultimaSemana.dataFim), 1)
          const proximaDataFim = addWeeks(proximaDataInicio, 1)
          proximaDataFim.setDate(proximaDataFim.getDate() - 1) // Termina no domingo
          
          setFormData({
            dataInicio: format(proximaDataInicio, 'yyyy-MM-dd'),
            dataFim: format(proximaDataFim, 'yyyy-MM-dd'),
            observacoes: ''
          })
        }
      }
    } catch (error) {
      console.error('Erro ao carregar plano:', error)
      toast.error('Erro ao carregar dados do plano')
    } finally {
      setLoadingPlano(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plano) return

    // Validar se há pelo menos uma disciplina configurada
    if (disciplinas.length === 0) {
      toast.error('Adicione pelo menos uma disciplina antes de salvar o ciclo')
      return
    }

    // Validar se todas as disciplinas têm pelo menos um dia selecionado
    const disciplinasSemDias = disciplinas.filter(d => !d.diasEstudo || d.diasEstudo.length === 0)
    if (disciplinasSemDias.length > 0) {
      toast.error('Selecione pelo menos um dia da semana para cada disciplina')
      return
    }

    setLoading(true)
    try {
      const proximoNumero = (plano.semanas.length || 0) + 1
      
      // Preparar dados do novo ciclo
      const novoCicloData = {
        planoId: plano.id,
        numeroSemana: proximoNumero,
        dataInicio: new Date(formData.dataInicio),
        dataFim: new Date(formData.dataFim),
        observacoes: formData.observacoes,
        totalHoras: disciplinas.reduce((total, d) => total + d.horasPlanejadas, 0),
        disciplinas: disciplinas.map(d => ({
          disciplinaId: d.disciplinaId,
          horasPlanejadas: d.horasPlanejadas,
          tipoVeiculo: d.tipoVeiculo,
          materialNome: d.materialNome,
          questoesPlanejadas: d.questoesPlanejadas || 0,
          tempoVideoPlanejado: d.tempoVideoPlanejado || 0,
          parametro: d.parametro,
          diasEstudo: d.diasEstudo ? d.diasEstudo.join(',') : '' // Converter array para string
        }))
      }

      // Chamar API para adicionar ciclo
      const response = await fetch('/api/plano-estudos/adicionar-ciclo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(novoCicloData),
      })

      if (response.ok) {
        toast.success('Ciclo adicionado com sucesso!')
        onSuccess()
        onClose()
        resetForm()
      } else {
        // Obter mensagem de erro específica da API
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Erro ao adicionar ciclo'
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Erro ao adicionar ciclo:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao adicionar ciclo. Tente novamente.'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setDisciplinas([])
    setFormData({
      dataInicio: '',
      dataFim: '',
      observacoes: ''
    })
    setPlano(null)
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Adicionar Novo Ciclo
          </DialogTitle>
          <DialogDescription>
            {plano ? `Adicionar um novo ciclo ao plano "${plano.nome}"` : 'Carregando dados do plano...'}
          </DialogDescription>
        </DialogHeader>

        {loadingPlano ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : plano ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações do Ciclo */}
            <Card>
              <CardHeader>
                <CardTitle>Informações do Ciclo {(plano.semanas.length || 0) + 1}</CardTitle>
                <CardDescription>
                  Configure as datas e detalhes básicos do novo ciclo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dataInicio">Data de Início *</Label>
                    <Input
                      id="dataInicio"
                      type="date"
                      value={formData.dataInicio}
                      onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dataFim">Data de Fim *</Label>
                    <Input
                      id="dataFim"
                      type="date"
                      value={formData.dataFim}
                      onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações do Ciclo</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Observações específicas para este ciclo..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Planejamento de Disciplinas */}
            <PlanejamentoSimples
              semanaNumero={(plano.semanas.length || 0) + 1}
              disciplinasPlanejadas={disciplinas}
              onDisciplinasChange={setDisciplinas}
            />

            {/* Aviso quando não há disciplinas */}
            {disciplinas.length === 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Calendar className="h-5 w-5" />
                    <p className="font-medium">
                      Adicione pelo menos uma disciplina e configure os dias de estudo antes de salvar o ciclo.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botões de Ação */}
            <div className="flex gap-4 justify-end">
              <Button type="button" variant="outline" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading || disciplinas.length === 0}
                className="relative"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Adicionando...' : 'Adicionar Ciclo'}
                {disciplinas.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {disciplinas.length} disciplina{disciplinas.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
