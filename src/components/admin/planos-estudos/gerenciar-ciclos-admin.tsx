'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Loader2, BookOpen, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  adminAdicionarCiclo,
  adminExcluirCiclo,
  adminAdicionarDisciplina,
  adminExcluirDisciplina,
} from '@/interface/actions/admin/plano-estudos'
import { useRouter } from 'next/navigation'

interface Disciplina {
  id: string
  nome: string
}

interface DisciplinaSemana {
  id: string
  disciplinaId: string
  horasPlanejadas: number
  questoesPlanejadas: number
  tipoVeiculo: string | null
  materialNome: string | null
  disciplina: { id: string; nome: string; cor: string | null }
}

interface Ciclo {
  id: string
  numeroSemana: number
  dataInicio: Date
  dataFim: Date
  observacoes: string | null
  disciplinas: DisciplinaSemana[]
}

interface GerenciarCiclosAdminProps {
  planoId: string
  ciclosIniciais: Ciclo[]
  planoId_pool?: string
}

async function getDisciplinas(planoId: string): Promise<Disciplina[]> {
  const res = await fetch(`/api/admin/disciplinas?planoId=${planoId}`)
  if (!res.ok) return []
  return res.json()
}

export function GerenciarCiclosAdmin({ planoId, ciclosIniciais, planoId_pool }: GerenciarCiclosAdminProps) {
  const router = useRouter()
  const [ciclos, setCiclos] = useState<Ciclo[]>(ciclosIniciais)
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  // Estado modal adicionar ciclo
  const [modalCiclo, setModalCiclo] = useState(false)
  const [novoCiclo, setNovoCiclo] = useState({
    dataInicio: '',
    dataFim: '',
    observacoes: ''
  })
  const [salvandoCiclo, setSalvandoCiclo] = useState(false)

  // Estado modal adicionar disciplina
  const [modalDisc, setModalDisc] = useState(false)
  const [cicloSelecionado, setCicloSelecionado] = useState<string | null>(null)
  const [novaDisc, setNovaDisc] = useState({
    disciplinaId: '',
    horasPlanejadas: 0,
    questoesPlanejadas: 0,
    tipoVeiculo: 'pdf',
    materialNome: ''
  })
  const [salvandoDisc, setSalvandoDisc] = useState(false)

  const [removendoCicloId, setRemovendoCicloId] = useState<string | null>(null)
  const [removendoDiscId, setRemovendoDiscId] = useState<string | null>(null)

  useEffect(() => {
    getDisciplinas(planoId_pool ?? planoId).then(setDisciplinas)
  }, [planoId, planoId_pool])

  const handleAdicionarCiclo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoCiclo.dataInicio || !novoCiclo.dataFim) return

    const proximoNumero = ciclos.length > 0
      ? Math.max(...ciclos.map(c => c.numeroSemana)) + 1
      : 1

    setSalvandoCiclo(true)
    const res = await adminAdicionarCiclo({
      planoId,
      numeroSemana: proximoNumero,
      dataInicio: novoCiclo.dataInicio,
      dataFim: novoCiclo.dataFim,
      observacoes: novoCiclo.observacoes || undefined
    })
    setSalvandoCiclo(false)

    if (res.error) {
      alert(res.error)
    } else if (res.success && res.data) {
      setCiclos(prev => [...prev, res.data as Ciclo])
      setModalCiclo(false)
      setNovoCiclo({ dataInicio: '', dataFim: '', observacoes: '' })
    }
  }

  const handleExcluirCiclo = async (cicloId: string) => {
    if (!confirm('Excluir este ciclo e todas as suas disciplinas?')) return
    setRemovendoCicloId(cicloId)
    const res = await adminExcluirCiclo(cicloId, planoId)
    setRemovendoCicloId(null)
    if (res.error) alert(res.error)
    else setCiclos(prev => prev.filter(c => c.id !== cicloId))
  }

  const abrirModalDisc = (cicloId: string) => {
    setCicloSelecionado(cicloId)
    setNovaDisc({ disciplinaId: '', horasPlanejadas: 0, questoesPlanejadas: 0, tipoVeiculo: 'pdf', materialNome: '' })
    setModalDisc(true)
  }

  const handleAdicionarDisciplina = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cicloSelecionado || !novaDisc.disciplinaId) return

    setSalvandoDisc(true)
    const res = await adminAdicionarDisciplina({
      semanaId: cicloSelecionado,
      planoId,
      disciplinaId: novaDisc.disciplinaId,
      horasPlanejadas: novaDisc.horasPlanejadas,
      questoesPlanejadas: novaDisc.questoesPlanejadas,
      tipoVeiculo: novaDisc.tipoVeiculo,
      materialNome: novaDisc.materialNome || undefined
    })
    setSalvandoDisc(false)

    if (res.error) {
      alert(res.error)
    } else if (res.success && res.data) {
      setCiclos(prev => prev.map(c =>
        c.id === cicloSelecionado
          ? { ...c, disciplinas: [...c.disciplinas, res.data as DisciplinaSemana] }
          : c
      ))
      setModalDisc(false)
    }
  }

  const handleExcluirDisciplina = async (discId: string, cicloId: string) => {
    if (!confirm('Excluir esta disciplina do ciclo?')) return
    setRemovendoDiscId(discId)
    const res = await adminExcluirDisciplina(discId, planoId)
    setRemovendoDiscId(null)
    if (res.error) alert(res.error)
    else {
      setCiclos(prev => prev.map(c =>
        c.id === cicloId
          ? { ...c, disciplinas: c.disciplinas.filter(d => d.id !== discId) }
          : c
      ))
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              Ciclos e Disciplinas
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Defina a estrutura do plano. Os usuários verão esses ciclos e disciplinas.
            </p>
          </div>
          <Button size="sm" onClick={() => setModalCiclo(true)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Ciclo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {ciclos.length === 0 ? (
            <div className="text-center py-6 text-slate-500 border rounded-lg bg-slate-50 text-sm">
              Nenhum ciclo criado. Clique em "Adicionar Ciclo" para começar.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ciclos.map((ciclo) => (
            <div key={ciclo.id} className="border rounded-lg bg-white flex flex-col overflow-hidden">
              {/* Cabeçalho */}
              <div className="flex items-start justify-between px-4 py-3 bg-slate-50 border-b">
                <div>
                  <span className="font-semibold text-slate-900 text-sm">Ciclo {ciclo.numeroSemana}</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {format(new Date(ciclo.dataInicio), 'dd/MM/yy', { locale: ptBR })}
                    {' – '}
                    {format(new Date(ciclo.dataFim), 'dd/MM/yy', { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => abrirModalDisc(ciclo.id)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Disciplina
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                    onClick={() => handleExcluirCiclo(ciclo.id)}
                    disabled={removendoCicloId === ciclo.id}
                  >
                    {removendoCicloId === ciclo.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Lista de disciplinas */}
              <div className="flex-1 p-3 space-y-1.5">
                {ciclo.disciplinas.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">
                    Nenhuma disciplina.
                  </p>
                ) : (
                  ciclo.disciplinas.map(disc => (
                    <div
                      key={disc.id}
                      className="flex items-center justify-between rounded border px-2.5 py-1.5 bg-slate-50 hover:bg-white transition-colors"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <BookOpen className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-xs font-medium text-slate-700 truncate">
                          {disc.disciplina.nome}
                        </span>
                        {disc.horasPlanejadas > 0 && (
                          <span className="text-xs text-slate-400 shrink-0">{disc.horasPlanejadas}h</span>
                        )}
                        {disc.questoesPlanejadas > 0 && (
                          <span className="text-xs text-slate-400 shrink-0">{disc.questoesPlanejadas}q</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                        onClick={() => handleExcluirDisciplina(disc.id, ciclo.id)}
                        disabled={removendoDiscId === disc.id}
                      >
                        {removendoDiscId === disc.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
            ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Modal: novo ciclo */}
      <Dialog open={modalCiclo} onOpenChange={setModalCiclo}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAdicionarCiclo}>
            <DialogHeader>
              <DialogTitle>Adicionar Ciclo</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Data Início *</Label>
                  <Input
                    type="date"
                    value={novoCiclo.dataInicio}
                    onChange={e => setNovoCiclo(prev => ({ ...prev, dataInicio: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Data Fim *</Label>
                  <Input
                    type="date"
                    value={novoCiclo.dataFim}
                    onChange={e => setNovoCiclo(prev => ({ ...prev, dataFim: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Observações</Label>
                <Input
                  placeholder="Opcional"
                  value={novoCiclo.observacoes}
                  onChange={e => setNovoCiclo(prev => ({ ...prev, observacoes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={salvandoCiclo}>
                {salvandoCiclo && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: nova disciplina */}
      <Dialog open={modalDisc} onOpenChange={setModalDisc}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAdicionarDisciplina}>
            <DialogHeader>
              <DialogTitle>Adicionar Disciplina ao Ciclo</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid gap-2">
                <Label>Disciplina *</Label>
                {disciplinas.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Adicione disciplinas ao pool do plano antes de criar ciclos.
                  </p>
                ) : (
                  <select
                    className="border rounded-md px-3 h-9 text-sm bg-background"
                    value={novaDisc.disciplinaId}
                    onChange={e => setNovaDisc(prev => ({ ...prev, disciplinaId: e.target.value }))}
                    required
                  >
                    <option value="">Selecione a disciplina</option>
                    {disciplinas.map(d => (
                      <option key={d.id} value={d.id}>{d.nome}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Horas Planejadas</Label>
                  <Input
                    type="number"
                    min="0"
                    value={novaDisc.horasPlanejadas || ''}
                    onChange={e => setNovaDisc(prev => ({ ...prev, horasPlanejadas: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Questões Planejadas</Label>
                  <Input
                    type="number"
                    min="0"
                    value={novaDisc.questoesPlanejadas || ''}
                    onChange={e => setNovaDisc(prev => ({ ...prev, questoesPlanejadas: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Material (opcional)</Label>
                <Input
                  placeholder="Nome do material de estudo"
                  value={novaDisc.materialNome}
                  onChange={e => setNovaDisc(prev => ({ ...prev, materialNome: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Tipo de Veículo</Label>
                <select
                  className="border rounded-md px-3 h-9 text-sm bg-background"
                  value={novaDisc.tipoVeiculo}
                  onChange={e => setNovaDisc(prev => ({ ...prev, tipoVeiculo: e.target.value }))}
                >
                  <option value="pdf">PDF</option>
                  <option value="video">Vídeo</option>
                  <option value="livro">Livro</option>
                  <option value="questoes">Questões</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={salvandoDisc}>
                {salvandoDisc && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
