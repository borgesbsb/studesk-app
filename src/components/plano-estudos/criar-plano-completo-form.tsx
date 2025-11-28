'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createPlanoEstudo } from '@/interface/actions/plano-estudo/create'
import { GerenciarCiclos } from './gerenciar-ciclos'
import { DisciplinaPlanejada } from './planejamento-disciplinas'
import { Save, ArrowLeft, Calendar, Target, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { addWeeks, startOfWeek, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'


interface Semana {
  numero: number
  dataInicio: Date
  dataFim: Date
  disciplinas: DisciplinaPlanejada[]
}

export function CriarPlanoCompletoForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basico')
  const [semanas, setSemanas] = useState<Semana[]>([])
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    dataInicio: '',
    dataFim: ''
  })


  // Gerar semanas quando as datas mudarem
  useEffect(() => {
    if (formData.dataInicio && formData.dataFim) {
      gerarSemanas()
    }
  }, [formData.dataInicio, formData.dataFim])

  const gerarSemanas = () => {
    if (!formData.dataInicio || !formData.dataFim) return

    const inicio = new Date(formData.dataInicio)
    const fim = new Date(formData.dataFim)
    
    if (inicio >= fim) return

    const novasSemanas: Semana[] = []
    let semanaAtual = startOfWeek(inicio, { weekStartsOn: 1 }) // Segunda-feira
    let numeroSemana = 1

    while (semanaAtual <= fim) {
      const fimSemana = addWeeks(semanaAtual, 1)
      fimSemana.setDate(fimSemana.getDate() - 1) // Domingo
      
      // Manter disciplinas existentes se houver
      const semanaExistente = semanas.find(s => s.numero === numeroSemana)
      
      novasSemanas.push({
        numero: numeroSemana,
        dataInicio: new Date(semanaAtual),
        dataFim: new Date(Math.min(fimSemana.getTime(), fim.getTime())),
        disciplinas: semanaExistente?.disciplinas || []
      })
      
      semanaAtual = addWeeks(semanaAtual, 1)
      numeroSemana++
    }

    setSemanas(novasSemanas)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Preparar dados das semanas (apenas com disciplinas)
      const semanasData = semanas
        .filter(semana => semana.disciplinas.length > 0)
        .map(semana => ({
          numeroSemana: semana.numero,
          dataInicio: semana.dataInicio,
          dataFim: semana.dataFim,
          totalHoras: semana.disciplinas.reduce((total, d) => total + d.horasPlanejadas, 0),
          disciplinas: semana.disciplinas.map(d => ({
            disciplinaId: d.disciplinaId,
            horasPlanejadas: d.horasPlanejadas,
            tipoVeiculo: d.tipoVeiculo,
            materialNome: d.materialNome,
            questoesPlanejadas: d.questoesPlanejadas,
            tempoVideoPlanejado: d.tempoVideoPlanejado,
            parametro: d.parametro,
            diasEstudo: d.diasEstudo?.join(',') || ''
          }))
        }))

      const resultado = await createPlanoEstudo({
        nome: formData.nome,
        descricao: formData.descricao,
        dataInicio: new Date(formData.dataInicio),
        dataFim: new Date(formData.dataFim),
        semanas: semanasData
      })

      if (resultado.success) {
        toast.success('Plano de estudo criado com sucesso!')
        router.push('/plano-estudos')
      } else {
        toast.error(resultado.error || 'Erro ao criar plano')
      }
    } catch (error) {
      toast.error('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const podeAvancarParaCiclos = () => {
    return formData.nome && formData.dataInicio && formData.dataFim
  }

  const totalHorasPlano = semanas.reduce((total, semana) => 
    total + semana.disciplinas.reduce((totalSemana, d) => totalSemana + d.horasPlanejadas, 0), 0
  )

  const totalDisciplinasUnicas = new Set(
    semanas.flatMap(s => s.disciplinas.map(d => d.disciplinaId))
  ).size

  const semanasComDisciplinas = semanas.filter(s => s.disciplinas.length > 0).length

  return (
    <div className="space-y-6">
      {/* Header com botão voltar */}
      <div className="flex items-center gap-4">
        <Link href="/plano-estudos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Criar Plano de Estudos Completo</h1>
          <p className="text-muted-foreground">
            Configure um plano detalhado com ciclos de estudo
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basico" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Informações Básicas
          </TabsTrigger>
          <TabsTrigger value="ciclos" disabled={!podeAvancarParaCiclos()} className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Configurar Ciclos
          </TabsTrigger>
          <TabsTrigger value="resumo" disabled={!podeAvancarParaCiclos()} className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Resumo Final
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit} className="space-y-6">
          <TabsContent value="basico">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>
                  Configure os dados principais do seu plano de estudos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Plano *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Concurso Auditor 2024"
                      required
                    />
                  </div>
                </div>
                
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
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descreva o objetivo e contexto do plano..."
                  />
                </div>

                {/* Resumo das semanas geradas */}
                {semanas.length > 0 && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Resumo do Período</h4>
                    <div className="grid gap-2 md:grid-cols-3 text-sm">
                      <div>
                        <span className="font-medium">Total de semanas:</span> {semanas.length}
                      </div>
                      <div>
                        <span className="font-medium">Período:</span> {' '}
                        {format(semanas[0]?.dataInicio, "dd/MM", { locale: ptBR })} - {' '}
                        {format(semanas[semanas.length - 1]?.dataFim, "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div>
                        <span className="font-medium">Ciclos configurados:</span> {' '}
                        {semanasComDisciplinas} de {semanas.length}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-4 justify-end">
                  <Link href="/plano-estudos">
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  </Link>
                  <Button 
                    type="button" 
                    disabled={!podeAvancarParaCiclos()}
                    onClick={() => setActiveTab('ciclos')}
                  >
                    Próximo: Configurar Ciclos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ciclos">
            <div className="space-y-6">
              <GerenciarCiclos 
                semanas={semanas}
                onSemanasChange={setSemanas}
              />
              
              <div className="flex gap-4 justify-between">
                <Button type="button" variant="outline" onClick={() => setActiveTab('basico')}>
                  Anterior: Informações Básicas
                </Button>
                <Button 
                  type="button" 
                  onClick={() => setActiveTab('resumo')}
                >
                  Próximo: Resumo Final
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="resumo">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Plano de Estudos</CardTitle>
                  <CardDescription>
                    Revise as informações antes de finalizar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-medium mb-2">Informações Gerais</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Nome:</span> {formData.nome}</p>
                        <p><span className="font-medium">Período:</span> {formData.dataInicio} a {formData.dataFim}</p>
                        <p><span className="font-medium">Total de semanas:</span> {semanas.length}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Estatísticas</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Total de horas:</span> {totalHorasPlano}h</p>
                        <p><span className="font-medium">Disciplinas únicas:</span> {totalDisciplinasUnicas}</p>
                        <p><span className="font-medium">Ciclos configurados:</span> {semanasComDisciplinas}</p>
                        <p><span className="font-medium">Média semanal:</span> {
                          semanasComDisciplinas > 0 ? Math.round(totalHorasPlano / semanasComDisciplinas) : 0
                        }h</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-3">Ciclos Configurados</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {semanas.filter(s => s.disciplinas.length > 0).map(semana => (
                        <div key={semana.numero} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <span className="font-medium">Ciclo {semana.numero}</span>
                            <span className="text-muted-foreground ml-2">
                              ({semana.disciplinas.length} disciplinas)
                            </span>
                          </div>
                          <Badge variant="outline">
                            {semana.disciplinas.reduce((total, d) => total + d.horasPlanejadas, 0)}h
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex gap-4 justify-between">
                <Button type="button" variant="outline" onClick={() => setActiveTab('ciclos')}>
                  Anterior: Configurar Ciclos
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Criando Plano...' : 'Criar Plano Completo'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </form>
      </Tabs>
    </div>
  )
}