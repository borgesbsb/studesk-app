'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getAllPlanosEstudo } from '@/interface/actions/plano-estudo/get-all'
import { deletePlanoEstudo } from '@/interface/actions/plano-estudo/delete'
import { Calendar, Eye, Trash2, Plus, Edit } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

export function PlanosEstudoTable() {
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
    // Recarregar a lista de planos após adicionar ciclo
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
        carregarPlanos() // Recarregar a lista
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
      <Card>
        <CardHeader>
          <CardTitle>Carregando planos...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
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
    <Card>
      <CardHeader>
        <CardTitle>Planos de Estudo</CardTitle>
        <CardDescription>
          Gerencie todos os seus planos de estudo em uma só visualização
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {planos.map((plano) => {
              const stats = calcularEstatisticas(plano)
              
              return (
                <TableRow key={plano.id}>
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <div className="font-semibold">{plano.nome}</div>
                      {plano.descricao && (
                        <div className="text-sm text-muted-foreground">
                          {plano.descricao}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(plano.dataInicio), "dd/MM/yyyy", { locale: ptBR })} - {" "}
                        {format(new Date(plano.dataFim), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {plano.semanas.length} semana{plano.semanas.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant={plano.ativo ? "default" : "secondary"}>
                      {plano.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPlanoSelecionado(plano.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Ciclo
                      </Button>
                      <Link href={`/plano-estudos/${plano.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                      </Link>
                      <Link href={`/plano-estudos/${plano.id}/editar`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPlanoParaExcluir(plano)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
      
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
    </Card>
  )
}
