'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getAllPlanosEstudo } from '@/interface/actions/plano-estudo/get-all'
import { deletePlanoEstudo } from '@/interface/actions/plano-estudo/delete'
import { Calendar, Eye, Trash2, Plus, Edit, Clock, Book, TrendingUp, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AdicionarCicloModal } from './adicionar-ciclo-modal'
import { toast } from 'sonner'

interface PlanoEstudo {
  id: string
  nome: string
  descricao?: string | null
  dataInicio: string | Date
  dataFim: string | Date
  ativo: boolean
  semanas: Array<{
    id: string
    numeroSemana: number
    totalHoras: number
    horasRealizadas: number
    disciplinas: Array<{
      id: string
      horasPlanejadas: number
      horasRealizadas: number
      concluida: boolean
      disciplina: {
        nome: string
      }
    }>
  }>
}

export function PlanosEstudoMetrics() {
  const [planos, setPlanos] = useState<PlanoEstudo[]>([])
  const [loading, setLoading] = useState(true)
  const [planoSelecionado, setPlanoSelecionado] = useState<string | null>(null)
  const [planoParaExcluir, setPlanoParaExcluir] = useState<PlanoEstudo | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  const carregarPlanos = async () => {
    try {
      const resultado = await getAllPlanosEstudo()
      if (resultado.success && resultado.data) {
        setPlanos(resultado.data as any)
      } else {
        setPlanos([])
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
      setPlanos([])
    } finally {
      setLoading(false)
    }
  }

  const handleCicloAdicionado = () => {
    carregarPlanos()
    setPlanoSelecionado(null)
  }

  const handleExcluirPlano = async () => {
    if (!planoParaExcluir) return

    setExcluindo(true)
    try {
      const resultado = await deletePlanoEstudo(planoParaExcluir.id)

      if (resultado.success) {
        toast.success('Plano de estudo excluído com sucesso!')
        carregarPlanos()
        setPlanoParaExcluir(null)
      } else {
        toast.error(resultado.error || 'Erro ao excluir plano de estudo')
      }
    } catch (error) {
      console.error('Erro ao excluir plano:', error)
      toast.error('Erro inesperado ao excluir plano de estudo')
    } finally {
      setExcluindo(false)
    }
  }

  useEffect(() => {
    carregarPlanos()
  }, [])

  const calcularEstatisticas = (plano: PlanoEstudo) => {
    const totalHorasPlanejadas = plano.semanas.reduce((acc, s) => acc + s.totalHoras, 0)
    const totalHorasRealizadas = plano.semanas.reduce((acc, s) => acc + s.horasRealizadas, 0)
    const horasRestantes = Math.max(0, totalHorasPlanejadas - totalHorasRealizadas)
    const progresso = totalHorasPlanejadas > 0 ? (totalHorasRealizadas / totalHorasPlanejadas) * 100 : 0

    // Calcular disciplinas únicas
    const disciplinasSet = new Set<string>()
    plano.semanas.forEach(semana => {
      semana.disciplinas.forEach(disc => {
        disciplinasSet.add(disc.disciplina.nome)
      })
    })
    const totalDisciplinas = disciplinasSet.size

    // Calcular disciplinas completas (que atingiram 100% em pelo menos uma semana)
    const disciplinasCompletas = plano.semanas.reduce((acc, semana) => {
      const completasNestaSemana = semana.disciplinas.filter(d => d.concluida).length
      return acc + completasNestaSemana
    }, 0)

    // Semana atual
    const semanaAtual = plano.semanas.find(s => s.horasRealizadas < s.totalHoras) || plano.semanas[plano.semanas.length - 1]
    const numeroSemanaAtual = semanaAtual?.numeroSemana || 1

    // Dias restantes
    const diasRestantes = differenceInDays(new Date(plano.dataFim), new Date())

    return {
      totalHorasPlanejadas,
      totalHorasRealizadas,
      horasRestantes,
      progresso: Math.round(progresso),
      totalDisciplinas,
      disciplinasCompletas,
      numeroSemanaAtual,
      totalSemanas: plano.semanas.length,
      diasRestantes: Math.max(0, diasRestantes)
    }
  }

  const formatarHoras = (horas: number) => {
    if (horas < 1) {
      return `${Math.round(horas * 60)}m`
    }
    return `${Math.round(horas)}h`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-32 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (planos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum plano encontrado</h3>
          <p className="text-muted-foreground text-center mb-4">
            Comece criando seu primeiro plano de estudos para organizar sua rotina.
          </p>
          <Link href="/plano-estudos/criar">
            <Button>Criar Primeiro Plano</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {planos.map((plano) => {
        const stats = calcularEstatisticas(plano)

        return (
          <Card key={plano.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {/* Header do Card */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background p-3 border-b flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Book className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-bold">{plano.nome}</h3>
                  <Badge variant={plano.ativo ? "default" : "secondary"} className="ml-1 text-[10px] h-5">
                    {plano.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                {plano.descricao && (
                  <p className="text-xs text-muted-foreground mt-0.5 ml-6">{plano.descricao}</p>
                )}
              </div>
            </div>

            {/* Info Row - Período e Semanas */}
            <div className="px-3 py-2 bg-muted/30 border-b">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(plano.dataInicio), "dd/MM/yyyy", { locale: ptBR })} → {format(new Date(plano.dataFim), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-medium">{plano.semanas.length} semanas</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-medium">{stats.totalDisciplinas} disciplinas</span>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <CardContent className="p-0">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }} className="divide-x border-t">
                {/* Coluna 1: Progresso */}
                <div className="p-3 flex flex-col items-center justify-center bg-background hover:bg-muted/50 transition-colors">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    Progresso
                  </div>
                  <div className="text-2xl font-bold text-primary mb-1.5">
                    {stats.progresso}%
                  </div>
                  <Progress value={stats.progresso} className="w-full h-1.5" />
                </div>

                {/* Coluna 2: Horas */}
                <div className="p-3 flex flex-col items-center justify-center bg-background hover:bg-muted/50 transition-colors">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    Horas
                  </div>
                  <div className="text-lg font-bold mb-0.5">
                    {formatarHoras(stats.totalHorasRealizadas)}/{formatarHoras(stats.totalHorasPlanejadas)}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {formatarHoras(stats.horasRestantes)} restam
                  </div>
                </div>

                {/* Coluna 3: Disciplinas */}
                <div className="p-3 flex flex-col items-center justify-center bg-background hover:bg-muted/50 transition-colors">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    Disciplinas
                  </div>
                  <div className="text-lg font-bold mb-0.5">
                    {stats.totalDisciplinas}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {stats.disciplinasCompletas} completas
                  </div>
                </div>

                {/* Coluna 4: Ciclos */}
                <div className="p-3 flex flex-col items-center justify-center bg-background hover:bg-muted/50 transition-colors">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    Ciclos
                  </div>
                  <div className="text-lg font-bold mb-0.5">
                    {stats.totalSemanas}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Semana {stats.numeroSemanaAtual}/{stats.totalSemanas}
                  </div>
                </div>

                {/* Coluna 5: Ações */}
                <div className="p-2 flex items-center justify-center gap-1 bg-muted/20">
                  <Link href={`/plano-estudos/${plano.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Ver detalhes">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Link href={`/plano-estudos/${plano.id}/editar`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Editar">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPlanoSelecionado(plano.id)}
                    className="h-8 w-8 p-0"
                    title="Adicionar ciclo"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPlanoParaExcluir(plano)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Modal para adicionar ciclo */}
      <AdicionarCicloModal
        planoId={planoSelecionado}
        isOpen={!!planoSelecionado}
        onClose={() => setPlanoSelecionado(null)}
        onSuccess={handleCicloAdicionado}
      />

      {/* Dialog de confirmação para exclusão */}
      <Dialog open={!!planoParaExcluir} onOpenChange={() => setPlanoParaExcluir(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o plano de estudos "{planoParaExcluir?.nome}"?
              <br />
              <strong>Esta ação não pode ser desfeita.</strong> Todos os ciclos, disciplinas e progresso associados serão perdidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPlanoParaExcluir(null)}
              disabled={excluindo}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleExcluirPlano}
              disabled={excluindo}
            >
              {excluindo ? 'Excluindo...' : 'Excluir Plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
