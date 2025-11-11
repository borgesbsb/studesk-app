'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { listarDisciplinas } from '@/interface/actions/disciplina/list'
import { DisciplinaPlanejada } from './planejamento-disciplinas'
import { 
  FileText, Video, Book, Clock, Target, Plus, 
  ChevronLeft, ChevronRight, Check, Users, Calendar,
  ArrowLeft, ArrowRight, Trash2
} from 'lucide-react'
import { toast } from 'sonner'

interface Disciplina {
  id: string
  nome: string
  descricao?: string | null
}

interface WizardAdicionarCicloProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (disciplinas: DisciplinaPlanejada[]) => void
  semanaNumero: number
}

const tiposVeiculo = [
  { value: 'pdf', label: 'PDF', icon: FileText, description: 'Estudar através de PDFs' },
  { value: 'video', label: 'Vídeo', icon: Video, description: 'Assistir videoaulas' },
  { value: 'livro', label: 'Livro', icon: Book, description: 'Leitura de livros físicos' },
  { value: 'apostila', label: 'Apostila', icon: FileText, description: 'Material impresso' }
]

const diasSemana = [
  { key: 'seg', label: 'Seg', nome: 'Segunda-feira' },
  { key: 'ter', label: 'Ter', nome: 'Terça-feira' },
  { key: 'qua', label: 'Qua', nome: 'Quarta-feira' },
  { key: 'qui', label: 'Qui', nome: 'Quinta-feira' },
  { key: 'sex', label: 'Sex', nome: 'Sexta-feira' },
  { key: 'sab', label: 'Sáb', nome: 'Sábado' },
  { key: 'dom', label: 'Dom', nome: 'Domingo' }
]

export function WizardAdicionarCiclo({ 
  isOpen, 
  onClose, 
  onConfirm, 
  semanaNumero 
}: WizardAdicionarCicloProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<Disciplina[]>([])
  const [loading, setLoading] = useState(true)
  
  // Dados do wizard
  const [disciplinasSelecionadas, setDisciplinasSelecionadas] = useState<Set<string>>(new Set())
  const [horasPorDisciplina, setHorasPorDisciplina] = useState<Record<string, number>>({})
  const [questoesPorDisciplina, setQuestoesPorDisciplina] = useState<Record<string, number>>({})
  const [veiculoPorDisciplina, setVeiculoPorDisciplina] = useState<Record<string, string>>({})
  const [parametroPorDisciplina, setParametroPorDisciplina] = useState<Record<string, string>>({})
  const [diasPorDisciplina, setDiasPorDisciplina] = useState<Record<string, Set<string>>>({})
  const [filtro, setFiltro] = useState('')

  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100

  useEffect(() => {
    if (isOpen) {
      carregarDisciplinas()
      resetWizard()
    }
  }, [isOpen])

  const carregarDisciplinas = async () => {
    setLoading(true)
    try {
      const resultado = await listarDisciplinas()
      if (resultado.success) {
        const lista: Disciplina[] = Array.isArray(resultado.data) ? (resultado.data as Disciplina[]) : []
        setDisciplinasDisponiveis(lista)
      }
    } catch (error) {
      toast.error('Erro ao carregar disciplinas')
    } finally {
      setLoading(false)
    }
  }

  const resetWizard = () => {
    setCurrentStep(1)
    setDisciplinasSelecionadas(new Set())
    setHorasPorDisciplina({})
    setQuestoesPorDisciplina({})
    setVeiculoPorDisciplina({})
    setParametroPorDisciplina({})
    setDiasPorDisciplina({})
    setFiltro('')
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleDisciplinaToggle = (disciplinaId: string) => {
    const novasSelecionadas = new Set(disciplinasSelecionadas)
    if (novasSelecionadas.has(disciplinaId)) {
      novasSelecionadas.delete(disciplinaId)
      // Remove dados relacionados quando deseleciona
      const { [disciplinaId]: _, ...restoHoras } = horasPorDisciplina
      const { [disciplinaId]: __, ...restoQuestoes } = questoesPorDisciplina
      const { [disciplinaId]: ___, ...restoVeiculo } = veiculoPorDisciplina
      const { [disciplinaId]: ____, ...restoParametro } = parametroPorDisciplina
      const { [disciplinaId]: _____, ...restoDias } = diasPorDisciplina
      setHorasPorDisciplina(restoHoras)
      setQuestoesPorDisciplina(restoQuestoes)
      setVeiculoPorDisciplina(restoVeiculo)
      setParametroPorDisciplina(restoParametro)
      setDiasPorDisciplina(restoDias)
    } else {
      novasSelecionadas.add(disciplinaId)
      // Inicializa com valores padrão
      setHorasPorDisciplina(prev => ({ ...prev, [disciplinaId]: 2 }))
      setQuestoesPorDisciplina(prev => ({ ...prev, [disciplinaId]: 10 }))
      setVeiculoPorDisciplina(prev => ({ ...prev, [disciplinaId]: 'pdf' }))
      setParametroPorDisciplina(prev => ({ ...prev, [disciplinaId]: '' }))
      setDiasPorDisciplina(prev => ({ ...prev, [disciplinaId]: new Set() }))
    }
    setDisciplinasSelecionadas(novasSelecionadas)
  }

  const handleDiaToggle = (disciplinaId: string, dia: string) => {
    setDiasPorDisciplina(prev => {
      const diasDisciplina = new Set(prev[disciplinaId] || new Set())
      if (diasDisciplina.has(dia)) {
        diasDisciplina.delete(dia)
      } else {
        diasDisciplina.add(dia)
      }
      return { ...prev, [disciplinaId]: diasDisciplina }
    })
  }

  const canProceedStep1 = disciplinasSelecionadas.size > 0
  const canProceedStep2 = Array.from(disciplinasSelecionadas).every(id => 
    horasPorDisciplina[id] && horasPorDisciplina[id] > 0 &&
    questoesPorDisciplina[id] !== undefined && questoesPorDisciplina[id] >= 0
  )
  const canProceedStep3 = Array.from(disciplinasSelecionadas).every(id => 
    veiculoPorDisciplina[id] && veiculoPorDisciplina[id].length > 0
  )
  const canComplete = Array.from(disciplinasSelecionadas).every(id => 
    diasPorDisciplina[id] && diasPorDisciplina[id].size > 0
  )

  const handleComplete = () => {
    const disciplinasConfiguradas: DisciplinaPlanejada[] = Array.from(disciplinasSelecionadas).map(disciplinaId => {
      const disciplina = disciplinasDisponiveis.find(d => d.id === disciplinaId)!
      return {
        disciplinaId,
        disciplinaNome: disciplina.nome,
        horasPlanejadas: horasPorDisciplina[disciplinaId] || 0,
        horasRealizadas: 0,
        tipoVeiculo: veiculoPorDisciplina[disciplinaId] || 'pdf',
        questoesPlanejadas: questoesPorDisciplina[disciplinaId] || 0,
        tempoVideoPlanejado: 0,
        parametro: parametroPorDisciplina[disciplinaId] || '',
        diasEstudo: Array.from(diasPorDisciplina[disciplinaId] || new Set())
      }
    })

    onConfirm(disciplinasConfiguradas)
    onClose()
    toast.success(`Ciclo ${semanaNumero} configurado com ${disciplinasConfiguradas.length} disciplinas`)
  }

  const renderStep1 = () => {
    const disciplinasFiltradasDisponiveis = disciplinasDisponiveis
      .filter(d => !disciplinasSelecionadas.has(d.id))
      .filter(d => 
        !filtro || 
        d.nome.toLowerCase().includes(filtro.toLowerCase()) ||
        (d.descricao && d.descricao.toLowerCase().includes(filtro.toLowerCase()))
      )

    const disciplinasOrdenadas = Array.from(disciplinasSelecionadas)
      .map(id => disciplinasDisponiveis.find(d => d.id === id))
      .filter(Boolean)

    const handleSelecionarTodas = () => {
      const todasIds = new Set(disciplinasDisponiveis.map(d => d.id))
      setDisciplinasSelecionadas(todasIds)
      
      // Inicializar valores padrão para todas
      const novosHoras: Record<string, number> = {}
      const novosQuestoes: Record<string, number> = {}
      const novosVeiculo: Record<string, string> = {}
      const novosParametro: Record<string, string> = {}
      const novosDias: Record<string, Set<string>> = {}
      
      disciplinasDisponiveis.forEach(d => {
        novosHoras[d.id] = 2
        novosQuestoes[d.id] = 10
        novosVeiculo[d.id] = 'pdf'
        novosParametro[d.id] = ''
        novosDias[d.id] = new Set()
      })
      
      setHorasPorDisciplina(novosHoras)
      setQuestoesPorDisciplina(novosQuestoes)
      setVeiculoPorDisciplina(novosVeiculo)
      setParametroPorDisciplina(novosParametro)
      setDiasPorDisciplina(novosDias)
    }

    const handleRemoverTodas = () => {
      setDisciplinasSelecionadas(new Set())
      setHorasPorDisciplina({})
      setQuestoesPorDisciplina({})
      setVeiculoPorDisciplina({})
      setParametroPorDisciplina({})
      setDiasPorDisciplina({})
    }

    const handleMoverParaSelecionadas = (disciplinaId: string) => {
      const novasSelecionadas = new Set(disciplinasSelecionadas)
      novasSelecionadas.add(disciplinaId)
      setDisciplinasSelecionadas(novasSelecionadas)
      
      // Inicializar com valores padrão
      setHorasPorDisciplina(prev => ({ ...prev, [disciplinaId]: 2 }))
      setQuestoesPorDisciplina(prev => ({ ...prev, [disciplinaId]: 10 }))
      setVeiculoPorDisciplina(prev => ({ ...prev, [disciplinaId]: 'pdf' }))
      setParametroPorDisciplina(prev => ({ ...prev, [disciplinaId]: '' }))
      setDiasPorDisciplina(prev => ({ ...prev, [disciplinaId]: new Set() }))
    }

    const handleRemoverDeSelecionadas = (disciplinaId: string) => {
      const novasSelecionadas = new Set(disciplinasSelecionadas)
      novasSelecionadas.delete(disciplinaId)
      setDisciplinasSelecionadas(novasSelecionadas)
      
      // Remove dados relacionados
      const { [disciplinaId]: _, ...restoHoras } = horasPorDisciplina
      const { [disciplinaId]: __, ...restoQuestoes } = questoesPorDisciplina
      const { [disciplinaId]: ___, ...restoVeiculo } = veiculoPorDisciplina
      const { [disciplinaId]: ____, ...restoParametro } = parametroPorDisciplina
      const { [disciplinaId]: _____, ...restoDias } = diasPorDisciplina
      setHorasPorDisciplina(restoHoras)
      setQuestoesPorDisciplina(restoQuestoes)
      setVeiculoPorDisciplina(restoVeiculo)
      setParametroPorDisciplina(restoParametro)
      setDiasPorDisciplina(restoDias)
    }

    return (
      <div className="space-y-4 w-full">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Selecione as Disciplinas</h3>
          <p className="text-sm text-muted-foreground">
            Duplo clique nas disciplinas para movê-las entre os cards
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">Carregando disciplinas...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[400px] w-full">
            {/* Card de Disciplinas Disponíveis */}
            <Card className="w-full">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Disciplinas Disponíveis
                    <Badge variant="outline" className="ml-2">
                      {disciplinasFiltradasDisponiveis.length}
                    </Badge>
                  </CardTitle>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Buscar..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelecionarTodas}
                    disabled={disciplinasDisponiveis.length === 0}
                    className="w-full text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Todas
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 p-4">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {disciplinasFiltradasDisponiveis.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      {filtro ? 'Nenhuma disciplina encontrada' : 'Todas as disciplinas foram selecionadas'}
                    </div>
                  ) : (
                    disciplinasFiltradasDisponiveis.map(disciplina => (
                      <div
                        key={disciplina.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 hover:border-blue-300 active:scale-95"
                        onDoubleClick={() => handleMoverParaSelecionadas(disciplina.id)}
                        title="Duplo clique para selecionar"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{disciplina.nome}</h4>
                          {disciplina.descricao && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {disciplina.descricao}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-50" />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card de Disciplinas Selecionadas */}
            <Card className="w-full">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Selecionadas para o Ciclo
                    <Badge variant="secondary" className="ml-2">
                      {disciplinasSelecionadas.size}
                    </Badge>
                  </CardTitle>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoverTodas}
                  disabled={disciplinasSelecionadas.size === 0}
                  className="w-full text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              </CardHeader>
              <CardContent className="pt-0 p-4">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {disciplinasSelecionadas.size === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma disciplina selecionada</p>
                      <p className="text-xs">Duplo clique nas disciplinas à esquerda</p>
                    </div>
                  ) : (
                    disciplinasOrdenadas.map(disciplina => disciplina && (
                      <div
                        key={disciplina.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border border-blue-200 bg-blue-50/50 cursor-pointer transition-all hover:bg-blue-100/50 hover:border-blue-300 active:scale-95"
                        onDoubleClick={() => handleRemoverDeSelecionadas(disciplina.id)}
                        title="Duplo clique para remover"
                      >
                        <ArrowLeft className="h-3 w-3 text-blue-600 opacity-50" />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-blue-900">{disciplina.nome}</h4>
                          {disciplina.descricao && (
                            <p className="text-xs text-blue-700/70 line-clamp-1">
                              {disciplina.descricao}
                            </p>
                          )}
                        </div>
                        <Check className="h-3 w-3 text-blue-600" />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Resumo no final */}
        {disciplinasSelecionadas.size > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-center">
              <Badge variant="secondary" className="text-sm px-4 py-2">
                {disciplinasSelecionadas.size} disciplina(s) selecionada(s) para o Ciclo {semanaNumero}
              </Badge>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Defina Horas e Questões</h3>
        <p className="text-sm text-muted-foreground">
          Configure horas de estudo e questões planejadas para cada disciplina
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from(disciplinasSelecionadas).map(disciplinaId => {
              const disciplina = disciplinasDisponiveis.find(d => d.id === disciplinaId)!
              return (
                <div key={disciplinaId} className="p-4 border rounded-lg space-y-4">
                  <div>
                    <h4 className="font-medium">{disciplina.nome}</h4>
                    {disciplina.descricao && (
                      <p className="text-sm text-muted-foreground">{disciplina.descricao}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Horas por semana</Label>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0.5"
                          max="40"
                          step="0.5"
                          value={horasPorDisciplina[disciplinaId] || ''}
                          onChange={(e) => setHorasPorDisciplina(prev => ({
                            ...prev,
                            [disciplinaId]: parseFloat(e.target.value) || 0
                          }))}
                          className="w-20 text-center"
                          placeholder="0"
                        />
                        <span className="text-sm text-muted-foreground">h</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm">Questões planejadas</Label>
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0"
                          max="1000"
                          value={questoesPorDisciplina[disciplinaId] || ''}
                          onChange={(e) => setQuestoesPorDisciplina(prev => ({
                            ...prev,
                            [disciplinaId]: parseInt(e.target.value) || 0
                          }))}
                          className="w-20 text-center"
                          placeholder="0"
                        />
                        <span className="text-sm text-muted-foreground">q</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="pt-4 border-t">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span>Total de horas semanais:</span>
            <span className="font-medium">
              {Object.values(horasPorDisciplina).reduce((total, horas) => total + (horas || 0), 0)}h
            </span>
          </div>
          <div className="flex justify-between">
            <span>Total de questões:</span>
            <span className="font-medium">
              {Object.values(questoesPorDisciplina).reduce((total, questoes) => total + (questoes || 0), 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Escolha o Veículo de Estudo</h3>
        <p className="text-sm text-muted-foreground">
          Como cada disciplina será estudada
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from(disciplinasSelecionadas).map(disciplinaId => {
          const disciplina = disciplinasDisponiveis.find(d => d.id === disciplinaId)!
          return (
            <div key={disciplinaId} className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{disciplina.nome}</h4>
                <Badge variant="outline">
                  {horasPorDisciplina[disciplinaId]}h/semana
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {tiposVeiculo.map(veiculo => {
                  const Icon = veiculo.icon
                  const isSelected = veiculoPorDisciplina[disciplinaId] === veiculo.value
                  return (
                    <div
                      key={veiculo.value}
                      className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => setVeiculoPorDisciplina(prev => ({
                        ...prev,
                        [disciplinaId]: veiculo.value
                      }))}
                    >
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-muted-foreground'}`} />
                      <div>
                        <p className={`text-sm font-medium ${isSelected ? 'text-blue-600' : ''}`}>
                          {veiculo.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {veiculo.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`parametro-${disciplinaId}`} className="text-sm">
                  Parâmetro adicional (opcional)
                </Label>
                <Input
                  id={`parametro-${disciplinaId}`}
                  value={parametroPorDisciplina[disciplinaId] || ''}
                  onChange={(e) => setParametroPorDisciplina(prev => ({
                    ...prev,
                    [disciplinaId]: e.target.value
                  }))}
                  placeholder="Ex: Capítulos 1-5, Link do curso, etc."
                  className="text-sm"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Selecione os Dias da Semana</h3>
        <p className="text-sm text-muted-foreground">
          Em quais dias cada disciplina será estudada
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from(disciplinasSelecionadas).map(disciplinaId => {
          const disciplina = disciplinasDisponiveis.find(d => d.id === disciplinaId)!
          const diasSelecionados = diasPorDisciplina[disciplinaId] || new Set()
          const veiculo = tiposVeiculo.find(v => v.value === veiculoPorDisciplina[disciplinaId])
          
          return (
            <div key={disciplinaId} className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{disciplina.nome}</h4>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {horasPorDisciplina[disciplinaId]}h/semana
                  </Badge>
                  {veiculo && (
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <veiculo.icon className="h-3 w-3" />
                      <span>{veiculo.label}</span>
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {diasSemana.map(dia => {
                  const isSelected = diasSelecionados.has(dia.key)
                  return (
                    <div
                      key={dia.key}
                      className={`flex flex-col items-center p-2 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => handleDiaToggle(disciplinaId, dia.key)}
                    >
                      <Calendar className={`h-4 w-4 mb-1 ${
                        isSelected ? 'text-blue-600' : 'text-muted-foreground'
                      }`} />
                      <span className={`text-xs font-medium ${
                        isSelected ? 'text-blue-600' : 'text-muted-foreground'
                      }`}>
                        {dia.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {diasSelecionados.size > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Array.from(diasSelecionados).map(diaKey => {
                    const dia = diasSemana.find(d => d.key === diaKey)
                    return (
                      <Badge key={diaKey} variant="secondary" className="text-xs">
                        {dia?.nome}
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[70%] max-w-[70%] max-h-[90vh] flex flex-col overflow-hidden" style={{ width: '70%', maxWidth: '70%' }}>
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Adicionar Ciclo {semanaNumero}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2 flex-shrink-0 px-1">
          <div className="flex justify-between text-sm">
            <span>Passo {currentStep} de {totalSteps}</span>
            <span>{Math.round(progress)}% concluído</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps */}
        <div className="flex justify-center space-x-4 py-4 flex-shrink-0">
          {[1, 2, 3, 4].map(step => (
            <div
              key={step}
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                step === currentStep
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : step < currentStep
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-muted-foreground text-muted-foreground'
              }`}
            >
              {step < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="text-sm font-medium">{step}</span>
              )}
            </div>
          ))}
        </div>

        {/* Content com scroll forçado */}
        <div className="flex-1 overflow-y-auto min-h-0 px-1">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Actions fixos na parte inferior */}
        <div className="flex justify-between border-t pt-4 flex-shrink-0">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onClose : handlePrevious}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{currentStep === 1 ? 'Cancelar' : 'Anterior'}</span>
          </Button>

          <Button
            onClick={currentStep === totalSteps ? handleComplete : handleNext}
            disabled={
              currentStep === 1 ? !canProceedStep1 :
              currentStep === 2 ? !canProceedStep2 :
              currentStep === 3 ? !canProceedStep3 :
              currentStep === 4 ? !canComplete : false
            }
            className="flex items-center space-x-2"
          >
            <span>{currentStep === totalSteps ? 'Finalizar' : 'Próximo'}</span>
            {currentStep === totalSteps ? (
              <Check className="h-4 w-4" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}