'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DisciplinaPlanejada } from './planejamento-disciplinas'
import { listarDisciplinas } from '@/interface/actions/disciplina/list'
import { Zap, FileText, Video, Book, Clock, Target, Plus, Settings } from 'lucide-react'
import { toast } from 'sonner'

interface Disciplina {
  id: string
  nome: string
  descricao?: string | null
}

interface PlanejamentoRapidoProps {
  disciplinasPlanejadas: DisciplinaPlanejada[]
  onDisciplinasChange: (disciplinas: DisciplinaPlanejada[]) => void
  semanaNumero: number
}

interface TemplateEstudo {
  id: string
  nome: string
  descricao: string
  icon: any
  configuracao: {
    tipoVeiculo: string
    questoesPorHora: number
    tempoVideoPorHora: number
  }
}

const templates: TemplateEstudo[] = [
  {
    id: 'intensivo',
    nome: 'Estudo Intensivo',
    descricao: 'Foco em questões e revisão rápida',
    icon: Zap,
    configuracao: {
      tipoVeiculo: 'pdf',
      questoesPorHora: 15,
      tempoVideoPorHora: 0
    }
  },
  {
    id: 'video-aulas',
    nome: 'Video-aulas',
    descricao: 'Aprendizado através de vídeos',
    icon: Video,
    configuracao: {
      tipoVeiculo: 'video',
      questoesPorHora: 5,
      tempoVideoPorHora: 45
    }
  },
  {
    id: 'leitura',
    nome: 'Leitura Focada',
    descricao: 'Estudo teórico com material escrito',
    icon: Book,
    configuracao: {
      tipoVeiculo: 'livro',
      questoesPorHora: 8,
      tempoVideoPorHora: 0
    }
  }
]

export function PlanejamentoRapido({ 
  disciplinasPlanejadas, 
  onDisciplinasChange,
  semanaNumero 
}: PlanejamentoRapidoProps) {
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<Disciplina[]>([])
  const [loading, setLoading] = useState(true)
  const [templateSelecionado, setTemplateSelecionado] = useState<string>('')
  const [disciplinasSelecionadas, setDisciplinasSelecionadas] = useState<Set<string>>(new Set())
  
  // Configuração em massa
  const [configMassa, setConfigMassa] = useState({
    horasPorDisciplina: 4,
    tipoVeiculo: 'pdf',
    materialNome: '',
    aplicarQuestoes: true,
    aplicarVideo: false
  })

  useEffect(() => {
    carregarDisciplinas()
  }, [])

  useEffect(() => {
    // Marcar disciplinas já selecionadas apenas na inicialização
    const disciplinasExistentes = new Set(disciplinasPlanejadas.map(d => d.disciplinaId))
    setDisciplinasSelecionadas(prev => {
      // Se não há seleções anteriores (estado inicial), usar as existentes
      if (prev.size === 0) {
        return disciplinasExistentes
      }
      // Caso contrário, manter as seleções do usuário
      return prev
    })
  }, [disciplinasPlanejadas])

  const carregarDisciplinas = async () => {
    try {
      const resultado = await listarDisciplinas()
      if (resultado.success && resultado.data) {
        setDisciplinasDisponiveis(resultado.data)
      }
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error)
      toast.error('Erro ao carregar disciplinas')
    } finally {
      setLoading(false)
    }
  }

  const aplicarTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setConfigMassa(prev => ({
        ...prev,
        tipoVeiculo: template.configuracao.tipoVeiculo,
        aplicarQuestoes: template.configuracao.questoesPorHora > 0,
        aplicarVideo: template.configuracao.tempoVideoPorHora > 0
      }))
      setTemplateSelecionado(templateId)
      toast.success(`Template "${template.nome}" aplicado!`)
    }
  }

  const toggleDisciplina = (disciplinaId: string) => {
    const novaSelecao = new Set(disciplinasSelecionadas)
    if (novaSelecao.has(disciplinaId)) {
      novaSelecao.delete(disciplinaId)
    } else {
      novaSelecao.add(disciplinaId)
    }
    setDisciplinasSelecionadas(novaSelecao)
  }

  const selecionarTodas = () => {
    const todasDisciplinas = new Set(disciplinasDisponiveis.map(d => d.id))
    setDisciplinasSelecionadas(todasDisciplinas)
  }

  const limparSelecao = () => {
    setDisciplinasSelecionadas(new Set())
  }

  const calcularValores = (horas: number, template?: TemplateEstudo) => {
    const config = template?.configuracao || {
      questoesPorHora: configMassa.aplicarQuestoes ? 10 : 0,
      tempoVideoPorHora: configMassa.aplicarVideo ? 40 : 0
    }
    
    return {
      questoes: Math.round(horas * config.questoesPorHora),
      tempoVideo: Math.round(horas * config.tempoVideoPorHora)
    }
  }

  const aplicarConfiguracao = () => {
    if (disciplinasSelecionadas.size === 0) {
      toast.error('Selecione pelo menos uma disciplina')
      return
    }

    const template = templates.find(t => t.id === templateSelecionado)
    const novasDisciplinas: DisciplinaPlanejada[] = []
    
    // Manter disciplinas não selecionadas
    disciplinasPlanejadas.forEach(disciplina => {
      if (!disciplinasSelecionadas.has(disciplina.disciplinaId)) {
        novasDisciplinas.push(disciplina)
      }
    })

    // Adicionar/atualizar disciplinas selecionadas
    disciplinasSelecionadas.forEach(disciplinaId => {
      const disciplina = disciplinasDisponiveis.find(d => d.id === disciplinaId)
      if (disciplina) {
        const valores = calcularValores(configMassa.horasPorDisciplina, template)
        
        novasDisciplinas.push({
          disciplinaId: disciplina.id,
          disciplinaNome: disciplina.nome,
          minutosPlanejados: configMassa.horasPorDisciplina,
          tipoVeiculo: configMassa.tipoVeiculo,
          materialNome: configMassa.materialNome || `Material de ${disciplina.nome}`,
          questoesPlanejadas: valores.questoes,
          tempoVideoPlanejado: valores.tempoVideo
        })
      }
    })

    onDisciplinasChange(novasDisciplinas)
    toast.success(`${disciplinasSelecionadas.size} disciplina(s) configurada(s) rapidamente!`)
  }

  const calcularTotalHoras = () => {
    return disciplinasPlanejadas.reduce((total, disciplina) => total + disciplina.minutosPlanejados, 0)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                {semanaNumero}
              </span>
              <Zap className="h-5 w-5 text-primary" />
              Planejamento Rápido - Ciclo {semanaNumero}
            </CardTitle>
            <CardDescription>
              Configure múltiplas disciplinas de uma vez com templates pré-definidos
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Total de Horas</p>
            <p className="text-2xl font-bold text-primary">{calcularTotalHoras()}h</p>
            <p className="text-xs text-muted-foreground">
              {disciplinasPlanejadas.length} disciplina{disciplinasPlanejadas.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Templates */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">1. Escolha um Template (Opcional)</Label>
          <div className="grid gap-3 md:grid-cols-3">
            {templates.map((template) => {
              const IconeTemplate = template.icon
              const isSelected = templateSelecionado === template.id
              
              return (
                <Button
                  key={template.id}
                  variant={isSelected ? "default" : "outline"}
                  className={`h-auto p-4 flex-col gap-2 ${isSelected ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => aplicarTemplate(template.id)}
                >
                  <IconeTemplate className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-semibold">{template.nome}</div>
                    <div className="text-xs opacity-80">{template.descricao}</div>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Seleção de Disciplinas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">2. Selecione as Disciplinas</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selecionarTodas}>
                Selecionar Todas
              </Button>
              <Button variant="outline" size="sm" onClick={limparSelecao}>
                Limpar
              </Button>
            </div>
          </div>
          
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-60 overflow-y-auto border rounded-lg p-4">
            {disciplinasDisponiveis.map((disciplina) => (
              <div key={disciplina.id} className="flex items-center space-x-2">
                <Checkbox
                  id={disciplina.id}
                  checked={disciplinasSelecionadas.has(disciplina.id)}
                  onCheckedChange={(checked) => {
                    setDisciplinasSelecionadas(prev => {
                      const novaSelecao = new Set(prev)
                      if (checked) {
                        novaSelecao.add(disciplina.id)
                      } else {
                        novaSelecao.delete(disciplina.id)
                      }
                      return novaSelecao
                    })
                  }}
                />
                <Label htmlFor={disciplina.id} className="text-sm cursor-pointer">
                  {disciplina.nome}
                </Label>
              </div>
            ))}
          </div>
          
          {disciplinasSelecionadas.size > 0 && (
            <Badge variant="secondary">
              {disciplinasSelecionadas.size} disciplina{disciplinasSelecionadas.size !== 1 ? 's' : ''} selecionada{disciplinasSelecionadas.size !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Configuração em Massa */}
        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4" />
            3. Configuração Geral
          </Label>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Horas por Disciplina</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={configMassa.horasPorDisciplina}
                onChange={(e) => setConfigMassa(prev => ({ 
                  ...prev, 
                  horasPorDisciplina: parseInt(e.target.value) || 1 
                }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Material</Label>
              <Select
                value={configMassa.tipoVeiculo}
                onValueChange={(value) => setConfigMassa(prev => ({ ...prev, tipoVeiculo: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">📄 PDF</SelectItem>
                  <SelectItem value="video">🎥 Vídeo</SelectItem>
                  <SelectItem value="livro">📚 Livro</SelectItem>
                  <SelectItem value="apostila">📋 Apostila</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label>Nome Base do Material (opcional)</Label>
              <Input
                value={configMassa.materialNome}
                onChange={(e) => setConfigMassa(prev => ({ ...prev, materialNome: e.target.value }))}
                placeholder="Ex: Curso Completo, Apostila 2024..."
              />
              <p className="text-xs text-muted-foreground">
                Se vazio, será usado "Material de [Nome da Disciplina]"
              </p>
            </div>
          </div>

          {/* Preview das configurações */}
          {disciplinasSelecionadas.size > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">Preview da Configuração:</p>
              <div className="grid gap-2 md:grid-cols-4 text-xs">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {configMassa.horasPorDisciplina}h por disciplina
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {calcularValores(configMassa.horasPorDisciplina).questoes} questões
                </div>
                {configMassa.tipoVeiculo === 'video' && (
                  <div className="flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    {calcularValores(configMassa.horasPorDisciplina).tempoVideo}min de vídeo
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span>📊</span>
                  Total: {disciplinasSelecionadas.size * configMassa.horasPorDisciplina}h
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Botão de Aplicar */}
        <div className="flex gap-4 justify-end">
          <Button 
            type="button"
            onClick={aplicarConfiguracao}
            disabled={disciplinasSelecionadas.size === 0}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Aplicar Configuração ({disciplinasSelecionadas.size} disciplinas)
          </Button>
        </div>

        {/* Lista Atual (se houver disciplinas) */}
        {disciplinasPlanejadas.length > 0 && (
          <div className="space-y-3">
            <Separator />
            <Label className="text-base font-semibold">Disciplinas Configuradas</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {disciplinasPlanejadas.map((disciplina, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {disciplina.tipoVeiculo === 'pdf' ? '📄' : 
                       disciplina.tipoVeiculo === 'video' ? '🎥' : 
                       disciplina.tipoVeiculo === 'livro' ? '📚' : '📋'}
                    </Badge>
                    <span className="font-medium">{disciplina.disciplinaNome}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{disciplina.minutosPlanejados}h</span>
                    {disciplina.questoesPlanejadas > 0 && (
                      <span>{disciplina.questoesPlanejadas} questões</span>
                    )}
                    {disciplina.tempoVideoPlanejado > 0 && (
                      <span>{disciplina.tempoVideoPlanejado}min vídeo</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
