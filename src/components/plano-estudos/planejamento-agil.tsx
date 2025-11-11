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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { DisciplinaPlanejada } from './planejamento-disciplinas'
import { listarDisciplinas } from '@/interface/actions/disciplina/list'
import { 
  Zap, FileText, Video, Book, Clock, Target, Plus, Settings, 
  ChevronDown, ChevronRight, Edit, Users, Trash2 
} from 'lucide-react'
import { toast } from 'sonner'

interface Disciplina {
  id: string
  nome: string
  descricao?: string | null
}

interface PlanejamentoAgilProps {
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
    parametroDefault: string
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
      tempoVideoPorHora: 0,
      parametroDefault: 'Revisão e Questões'
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
      tempoVideoPorHora: 45,
      parametroDefault: 'Aulas Teóricas'
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
      tempoVideoPorHora: 0,
      parametroDefault: 'Estudo Teórico'
    }
  }
]

export function PlanejamentoAgil({ 
  disciplinasPlanejadas, 
  onDisciplinasChange,
  semanaNumero 
}: PlanejamentoAgilProps) {
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<Disciplina[]>([])
  const [loading, setLoading] = useState(true)
  const [disciplinasSelecionadas, setDisciplinasSelecionadas] = useState<Set<string>>(new Set())
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set())
  const [modoEdicao, setModoEdicao] = useState<Set<number>>(new Set())
  
  // Configuração padrão para aplicação em massa
  const [configPadrao, setConfigPadrao] = useState({
    horasPorDisciplina: 4,
    tipoVeiculo: 'pdf' as string,
    questoesPorHora: 10,
    tempoVideoPorHora: 0,
    parametro: 'Estudo Geral'
  })

  useEffect(() => {
    carregarDisciplinas()
  }, [])

  useEffect(() => {
    // Marcar disciplinas já selecionadas
    const disciplinasExistentes = new Set(disciplinasPlanejadas.map(d => d.disciplinaId))
    setDisciplinasSelecionadas(disciplinasExistentes)
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
      setConfigPadrao(prev => ({
        ...prev,
        tipoVeiculo: template.configuracao.tipoVeiculo,
        questoesPorHora: template.configuracao.questoesPorHora,
        tempoVideoPorHora: template.configuracao.tempoVideoPorHora,
        parametro: template.configuracao.parametroDefault
      }))
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

  const adicionarDisciplinasSelecionadas = () => {
    if (disciplinasSelecionadas.size === 0) {
      toast.error('Selecione pelo menos uma disciplina')
      return
    }

    const novasDisciplinas: DisciplinaPlanejada[] = [...disciplinasPlanejadas]
    
    disciplinasSelecionadas.forEach(disciplinaId => {
      // Só adiciona se não existir
      if (!novasDisciplinas.find(d => d.disciplinaId === disciplinaId)) {
        const disciplina = disciplinasDisponiveis.find(d => d.id === disciplinaId)
        if (disciplina) {
          novasDisciplinas.push({
            disciplinaId: disciplina.id,
            disciplinaNome: disciplina.nome,
            horasPlanejadas: configPadrao.horasPorDisciplina,
            horasRealizadas: 0,
            tipoVeiculo: configPadrao.tipoVeiculo,
            materialNome: `Material de ${disciplina.nome}`,
            questoesPlanejadas: configPadrao.horasPorDisciplina * configPadrao.questoesPorHora,
            tempoVideoPlanejado: configPadrao.horasPorDisciplina * configPadrao.tempoVideoPorHora,
            parametro: configPadrao.parametro
          })
        }
      }
    })

    onDisciplinasChange(novasDisciplinas)
    setDisciplinasSelecionadas(new Set())
    toast.success(`${disciplinasSelecionadas.size} disciplina(s) adicionada(s)!`)
  }

  const atualizarDisciplina = (index: number, campo: keyof DisciplinaPlanejada, valor: any) => {
    const novaLista = disciplinasPlanejadas.map((disciplina, i) => {
      if (i === index) {
        const disciplinaAtualizada = { ...disciplina, [campo]: valor }
        
        // Recalcular questões e tempo de vídeo baseado nas horas
        if (campo === 'horasPlanejadas') {
          const horas = parseInt(valor) || 0
          disciplinaAtualizada.questoesPlanejadas = Math.round(horas * 10) // 10 questões por hora default
          if (disciplinaAtualizada.tipoVeiculo === 'video') {
            disciplinaAtualizada.tempoVideoPlanejado = Math.round(horas * 45) // 45 min por hora default
          }
        }
        
        return disciplinaAtualizada
      }
      return disciplina
    })
    onDisciplinasChange(novaLista)
  }

  const removerDisciplina = (index: number) => {
    const novaLista = disciplinasPlanejadas.filter((_, i) => i !== index)
    onDisciplinasChange(novaLista)
    toast.success('Disciplina removida')
  }

  const toggleExpansao = (index: number) => {
    const novaExpandidas = new Set(expandidas)
    if (novaExpandidas.has(index)) {
      novaExpandidas.delete(index)
    } else {
      novaExpandidas.add(index)
    }
    setExpandidas(novaExpandidas)
  }

  const toggleEdicao = (index: number) => {
    const novoModoEdicao = new Set(modoEdicao)
    if (novoModoEdicao.has(index)) {
      novoModoEdicao.delete(index)
    } else {
      novoModoEdicao.add(index)
    }
    setModoEdicao(novoModoEdicao)
  }

  const calcularTotalHoras = () => {
    return disciplinasPlanejadas.reduce((total, disciplina) => total + disciplina.horasPlanejadas, 0)
  }

  const obterIconeVeiculo = (tipo: string) => {
    switch (tipo) {
      case 'video': return Video
      case 'pdf': return FileText
      case 'livro': return Book
      case 'apostila': return FileText
      default: return Book
    }
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
              Planejamento Ágil - Ciclo {semanaNumero}
            </CardTitle>
            <CardDescription>
              Adicione disciplinas rapidamente e personalize individualmente
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
        {/* Seção de Adição Rápida */}
        <Card className="border-dashed">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Adicionar Disciplinas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Templates */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Templates Rápidos (Opcional)</Label>
              <div className="grid gap-2 md:grid-cols-3">
                {templates.map((template) => {
                  const IconeTemplate = template.icon
                  return (
                    <Button
                      key={template.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto p-3 flex-col gap-1"
                      onClick={() => aplicarTemplate(template.id)}
                    >
                      <IconeTemplate className="h-4 w-4" />
                      <span className="text-xs">{template.nome}</span>
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Configuração Padrão */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">Horas por Disciplina</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={configPadrao.horasPorDisciplina}
                  onChange={(e) => setConfigPadrao(prev => ({ 
                    ...prev, 
                    horasPorDisciplina: parseInt(e.target.value) || 1 
                  }))}
                  className="h-8"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Veículo</Label>
                <Select
                  value={configPadrao.tipoVeiculo}
                  onValueChange={(value) => setConfigPadrao(prev => ({ ...prev, tipoVeiculo: value }))}
                >
                  <SelectTrigger className="h-8">
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
              
              <div className="space-y-1">
                <Label className="text-xs">Questões/Hora</Label>
                <Input
                  type="number"
                  min="0"
                  value={configPadrao.questoesPorHora}
                  onChange={(e) => setConfigPadrao(prev => ({ 
                    ...prev, 
                    questoesPorHora: parseInt(e.target.value) || 0 
                  }))}
                  className="h-8"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Parâmetro</Label>
                <Input
                  value={configPadrao.parametro}
                  onChange={(e) => setConfigPadrao(prev => ({ ...prev, parametro: e.target.value }))}
                  placeholder="Ex: Teoria, Questões..."
                  className="h-8"
                />
              </div>
            </div>

            {/* Seleção de Disciplinas */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Selecionar Disciplinas</Label>
              <div className="grid gap-2 md:grid-cols-3 max-h-32 overflow-y-auto border rounded p-3">
                {disciplinasDisponiveis
                  .filter(d => !disciplinasPlanejadas.find(dp => dp.disciplinaId === d.id))
                  .map((disciplina) => (
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
              
              <Button 
                type="button"
                onClick={adicionarDisciplinasSelecionadas}
                disabled={disciplinasSelecionadas.size === 0}
                className="w-full"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar {disciplinasSelecionadas.size} Disciplina{disciplinasSelecionadas.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Disciplinas Configuradas */}
        {disciplinasPlanejadas.length > 0 && (
          <div className="space-y-3">
            <Label className="text-lg font-semibold">Disciplinas Configuradas</Label>
            
            {disciplinasPlanejadas.map((disciplina, index) => {
              const IconeVeiculo = obterIconeVeiculo(disciplina.tipoVeiculo)
              const isExpanded = expandidas.has(index)
              const isEditing = modoEdicao.has(index)
              
              return (
                <Card key={index} className="border">
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpansao(index)}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <IconeVeiculo className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium">{disciplina.disciplinaNome}</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{disciplina.horasPlanejadas}h planejadas</span>
                              <span>•</span>
                              <span>{disciplina.questoesPlanejadas} questões</span>
                              {disciplina.tipoVeiculo === 'video' && (
                                <>
                                  <span>•</span>
                                  <span>{disciplina.tempoVideoPlanejado}min vídeo</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {disciplina.parametro || 'Sem parâmetro'}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleEdicao(index)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              removerDisciplina(index)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t bg-muted/20">
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Horas Planejadas</Label>
                              <Input
                                type="number"
                                min="0"
                                value={disciplina.horasPlanejadas}
                                onChange={(e) => atualizarDisciplina(index, 'horasPlanejadas', parseInt(e.target.value) || 0)}
                                className="h-8"
                                disabled={!isEditing}
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs">Veículo</Label>
                              <Select
                                value={disciplina.tipoVeiculo}
                                onValueChange={(value) => atualizarDisciplina(index, 'tipoVeiculo', value)}
                                disabled={!isEditing}
                              >
                                <SelectTrigger className="h-8">
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
                            
                            <div className="space-y-1">
                              <Label className="text-xs">Questões</Label>
                              <Input
                                type="number"
                                min="0"
                                value={disciplina.questoesPlanejadas}
                                onChange={(e) => atualizarDisciplina(index, 'questoesPlanejadas', parseInt(e.target.value) || 0)}
                                className="h-8"
                                disabled={!isEditing}
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs">Parâmetro</Label>
                              <Input
                                value={disciplina.parametro || ''}
                                onChange={(e) => atualizarDisciplina(index, 'parametro', e.target.value)}
                                placeholder="Ex: Teoria, Questões..."
                                className="h-8"
                                disabled={!isEditing}
                              />
                            </div>
                            
                            {disciplina.tipoVeiculo === 'video' && (
                              <div className="space-y-1">
                                <Label className="text-xs">Tempo Vídeo (min)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={disciplina.tempoVideoPlanejado}
                                  onChange={(e) => atualizarDisciplina(index, 'tempoVideoPlanejado', parseInt(e.target.value) || 0)}
                                  className="h-8"
                                  disabled={!isEditing}
                                />
                              </div>
                            )}
                            
                            <div className="space-y-1">
                              <Label className="text-xs">Material</Label>
                              <Input
                                value={disciplina.materialNome || ''}
                                onChange={(e) => atualizarDisciplina(index, 'materialNome', e.target.value)}
                                placeholder="Nome do material"
                                className="h-8"
                                disabled={!isEditing}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
