'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getAllPlanosEstudo } from '@/interface/actions/plano-estudo/get-all'
import { deletePlanoEstudo } from '@/interface/actions/plano-estudo/delete'
import { Calendar, Clock, Target, Trash2, Eye, Edit, Plus, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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

export function PlanosEstudoGrid() {
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
    const progresso = totalHorasPlanejadas > 0 ? (totalHorasRealizadas / totalHorasPlanejadas) * 100 : 0
    
    return {
      totalHorasPlanejadas,
      totalHorasRealizadas,
      progresso: Math.round(progresso)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-gray-200 rounded"></div>
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
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Plano
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {planos.map((plano) => {
          const stats = calcularEstatisticas(plano)

          return (
            <Card
              key={plano.id}
              className="border border-gray-200 shadow-sm bg-white hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant={plano.ativo ? "default" : "secondary"} className="mb-2">
                    {plano.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-blue-50 hover:text-blue-600"
                      onClick={() => setPlanoSelecionado(plano.id)}
                      title="Adicionar Ciclo"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Link href={`/plano-estudos/${plano.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-green-50 hover:text-green-600"
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/plano-estudos/${plano.id}/editar`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-orange-50 hover:text-orange-600"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-red-50 hover:text-red-600"
                      onClick={() => setPlanoParaExcluir(plano)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <CardTitle className="text-xl font-bold text-gray-900 mb-2">
                  {plano.nome}
                </CardTitle>

                {plano.descricao && (
                  <CardDescription className="text-sm text-gray-600 line-clamp-2">
                    {plano.descricao}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Período */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      {format(new Date(plano.dataInicio), "dd/MM/yy", { locale: ptBR })} - {" "}
                      {format(new Date(plano.dataFim), "dd/MM/yy", { locale: ptBR })}
                    </span>
                  </div>

                  {/* Semanas */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                    <span>{plano.semanas.length} semana{plano.semanas.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Horas */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>
                      {stats.totalHorasRealizadas}h / {stats.totalHorasPlanejadas}h
                    </span>
                  </div>

                  {/* Progresso */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 font-medium">Progresso</span>
                      <span className="text-gray-900 font-bold">{stats.progresso}%</span>
                    </div>
                    <Progress value={stats.progresso} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

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
    </>
  )
}
