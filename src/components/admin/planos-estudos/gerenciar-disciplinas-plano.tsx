'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Loader2, BookOpen } from 'lucide-react'
import {
  adminAdicionarDisciplinaAoPlano,
  adminRemoverDisciplinaDoPlano,
} from '@/interface/actions/admin/plano-estudos'
import { toast } from 'sonner'

interface DisciplinaPool {
  id: string
  disciplinaId: string
  disciplina: { id: string; nome: string; cor: string | null }
}

interface DisciplinaSemana {
  disciplinaId: string
}

interface Ciclo {
  disciplinas: DisciplinaSemana[]
}

interface GerenciarDisciplinasPlanoProps {
  planoId: string
  poolInicial: DisciplinaPool[]
  ciclos: Ciclo[]
}

async function getAllDisciplinas(): Promise<{ id: string; nome: string; cor: string | null }[]> {
  const res = await fetch('/api/admin/disciplinas')
  if (!res.ok) return []
  return res.json()
}

export function GerenciarDisciplinasPlano({
  planoId,
  poolInicial,
  ciclos,
}: GerenciarDisciplinasPlanoProps) {
  const [pool, setPool] = useState<DisciplinaPool[]>(poolInicial)
  const [todasDisciplinas, setTodasDisciplinas] = useState<{ id: string; nome: string; cor: string | null }[]>([])
  const [selecionada, setSelecionada] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [removendoId, setRemovendoId] = useState<string | null>(null)

  useEffect(() => {
    getAllDisciplinas().then(setTodasDisciplinas)
  }, [])

  // Contagem de ciclos em que cada disciplina aparece
  const contagemCiclos = (disciplinaId: string) =>
    ciclos.filter(c => c.disciplinas.some(d => d.disciplinaId === disciplinaId)).length

  // Disciplinas ainda não no pool
  const disponiveis = todasDisciplinas.filter(
    d => !pool.some(p => p.disciplinaId === d.id)
  )

  const handleAdicionar = async () => {
    if (!selecionada) return
    setAdicionando(true)
    const res = await adminAdicionarDisciplinaAoPlano(planoId, selecionada)
    setAdicionando(false)
    if (res.error) {
      toast.error(res.error)
    } else if (res.success && res.data) {
      setPool(prev => [...prev, res.data as DisciplinaPool])
      setSelecionada('')
      toast.success('Disciplina adicionada ao pool')
    }
  }

  const handleRemover = async (disciplinaId: string) => {
    setRemovendoId(disciplinaId)
    const res = await adminRemoverDisciplinaDoPlano(planoId, disciplinaId)
    setRemovendoId(null)
    if (res.error) {
      toast.error(res.error)
    } else {
      setPool(prev => prev.filter(p => p.disciplinaId !== disciplinaId))
      toast.success('Disciplina removida do pool')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-slate-500" />
          Disciplinas Disponíveis
          <Badge variant="secondary" className="ml-1">{pool.length}</Badge>
        </CardTitle>
        <p className="text-sm text-slate-500">
          Define o conjunto de disciplinas deste plano. Os usuários só podem estudar disciplinas deste pool.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seletor para adicionar */}
        <div className="flex gap-2">
          <select
            className="flex-1 border rounded-md px-3 h-9 text-sm bg-background"
            value={selecionada}
            onChange={e => setSelecionada(e.target.value)}
          >
            <option value="">Selecione uma disciplina para adicionar…</option>
            {disponiveis.map(d => (
              <option key={d.id} value={d.id}>{d.nome}</option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={handleAdicionar}
            disabled={!selecionada || adicionando}
          >
            {adicionando
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Plus className="h-4 w-4" />}
            <span className="ml-1">Adicionar</span>
          </Button>
        </div>

        {/* Lista do pool */}
        {pool.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm border rounded-lg bg-slate-50">
            Nenhuma disciplina no pool. Adicione disciplinas acima.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {pool.map(entry => {
              const ciclosUsando = contagemCiclos(entry.disciplinaId)
              return (
                <div
                  key={entry.disciplinaId}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.disciplina.cor ?? '#3b82f6' }}
                    />
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {entry.disciplina.nome}
                    </span>
                    {ciclosUsando > 0 && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {ciclosUsando} ciclo{ciclosUsando > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                    onClick={() => handleRemover(entry.disciplinaId)}
                    disabled={removendoId === entry.disciplinaId}
                    title={ciclosUsando > 0 ? 'Remova dos ciclos antes de excluir do pool' : 'Remover do pool'}
                  >
                    {removendoId === entry.disciplinaId
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
