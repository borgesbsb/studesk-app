'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { listarDisciplinas } from '@/interface/actions/disciplina/list'
import { Plus, Trash2, FileText, Video, Book, Users } from 'lucide-react'
import { toast } from 'sonner'

interface Disciplina {
  id: string
  nome: string
  descricao?: string | null
}

export interface DisciplinaPlanejada {
  id?: string
  disciplinaId: string
  disciplinaNome: string
  horasPlanejadas: number
  horasRealizadas?: number
  tipoVeiculo: string
  materialNome?: string
  questoesPlanejadas: number
  tempoVideoPlanejado: number
  parametro?: string
  diasEstudo?: string[] // Array com dias da semana: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
}

interface PlanejamentoDisciplinasProps {
  disciplinasPlanejadas: DisciplinaPlanejada[]
  onDisciplinasChange: (disciplinas: DisciplinaPlanejada[]) => void
  semanaNumero: number
}

const tiposVeiculo = [
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'video', label: 'Vídeo', icon: Video },
  { value: 'livro', label: 'Livro', icon: Book },
  { value: 'apostila', label: 'Apostila', icon: FileText }
]



export function PlanejamentoDisciplinas({ 
  disciplinasPlanejadas, 
  onDisciplinasChange,
  semanaNumero 
}: PlanejamentoDisciplinasProps) {
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<Disciplina[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDisciplinas()
  }, [])

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

  const adicionarDisciplina = () => {
    const novaDisciplina: DisciplinaPlanejada = {
      disciplinaId: '',
      disciplinaNome: '',
      horasPlanejadas: 0,
      tipoVeiculo: 'pdf',
      questoesPlanejadas: 0,
      tempoVideoPlanejado: 0
    }
    onDisciplinasChange([...disciplinasPlanejadas, novaDisciplina])
  }

  const removerDisciplina = (index: number) => {
    const novaLista = disciplinasPlanejadas.filter((_, i) => i !== index)
    onDisciplinasChange(novaLista)
  }

  const atualizarDisciplina = (index: number, campo: string, valor: any) => {
    const novaLista = disciplinasPlanejadas.map((disciplina, i) => {
      if (i === index) {
        let disciplinaAtualizada = { ...disciplina, [campo]: valor }
        
        // Se mudou a disciplina, atualizar o nome
        if (campo === 'disciplinaId') {
          const disciplinaSelecionada = disciplinasDisponiveis.find(d => d.id === valor)
          disciplinaAtualizada.disciplinaNome = disciplinaSelecionada?.nome || ''
        }
        
        return disciplinaAtualizada
      }
      return disciplina
    })
    onDisciplinasChange(novaLista)
  }

  const obterIconeVeiculo = (tipo: string) => {
    const tipoObj = tiposVeiculo.find(t => t.value === tipo)
    return tipoObj?.icon || FileText
  }



  const calcularTotalHoras = () => {
    return disciplinasPlanejadas.reduce((total, disciplina) => total + disciplina.horasPlanejadas, 0)
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
              Ciclo de Estudo {semanaNumero}
            </CardTitle>
            <CardDescription>
              Configure disciplinas independentes para este ciclo. Cada ciclo pode ter disciplinas completamente diferentes dos outros.
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
        {disciplinasPlanejadas.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma disciplina planejada para este ciclo</h3>
            <p className="text-muted-foreground mb-4">
              Este ciclo ainda não tem disciplinas. Você pode escolher disciplinas totalmente diferentes dos outros ciclos.
            </p>
            <Button onClick={adicionarDisciplina}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Disciplina ao Ciclo {semanaNumero}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {disciplinasPlanejadas.map((disciplina, index) => {
              const IconeVeiculo = obterIconeVeiculo(disciplina.tipoVeiculo)
              
              return (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconeVeiculo className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-medium">
                        {disciplina.disciplinaNome || `Disciplina ${index + 1}`}
                      </h3>

                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removerDisciplina(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Disciplina *</Label>
                      <Select
                        value={disciplina.disciplinaId}
                        onValueChange={(value) => atualizarDisciplina(index, 'disciplinaId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma disciplina" />
                        </SelectTrigger>
                        <SelectContent>
                          {disciplinasDisponiveis.map(disc => (
                            <SelectItem key={disc.id} value={disc.id}>
                              {disc.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Horas Planejadas *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={disciplina.horasPlanejadas}
                        onChange={(e) => atualizarDisciplina(index, 'horasPlanejadas', parseInt(e.target.value) || 0)}
                        placeholder="Ex: 8"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tipo de Material</Label>
                      <Select
                        value={disciplina.tipoVeiculo}
                        onValueChange={(value) => atualizarDisciplina(index, 'tipoVeiculo', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposVeiculo.map(tipo => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              <div className="flex items-center gap-2">
                                <tipo.icon className="h-4 w-4" />
                                {tipo.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Nome do Material</Label>
                      <Input
                        value={disciplina.materialNome || ''}
                        onChange={(e) => atualizarDisciplina(index, 'materialNome', e.target.value)}
                        placeholder="Nome do livro, curso, etc."
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Questões Planejadas</Label>
                      <Input
                        type="number"
                        min="0"
                        value={disciplina.questoesPlanejadas}
                        onChange={(e) => atualizarDisciplina(index, 'questoesPlanejadas', parseInt(e.target.value) || 0)}
                        placeholder="Ex: 50"
                      />
                    </div>

                    {disciplina.tipoVeiculo === 'video' && (
                      <div className="space-y-2">
                        <Label>Tempo de Vídeo (minutos)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={disciplina.tempoVideoPlanejado}
                          onChange={(e) => atualizarDisciplina(index, 'tempoVideoPlanejado', parseInt(e.target.value) || 0)}
                          placeholder="Ex: 120"
                        />
                      </div>
                    )}
                  </div>


                </div>
              )
            })}

            <Button type="button" onClick={adicionarDisciplina} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Disciplina
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
