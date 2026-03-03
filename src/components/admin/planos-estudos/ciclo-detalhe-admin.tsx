'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus, Trash2, Loader2, X, FileText, Video, Link2, BookOpen, Check,
} from 'lucide-react'
import {
  adminAdicionarDisciplina,
  adminExcluirDisciplina,
  adminAtualizarDisciplinaSemana,
  adminAdicionarMaterialAoCiclo,
  adminRemoverMaterialDoCiclo,
} from '@/interface/actions/admin/plano-estudos'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface MaterialSemana {
  id: string
  materialId: string
  ordem: number
  material: { id: string; nome: string; tipo: string }
}

interface DisciplinaSemana {
  id: string
  disciplinaId: string
  horasPlanejadas: number
  questoesPlanejadas: number
  assuntos: string | null
  disciplina: { id: string; nome: string; cor: string | null }
  materiais: MaterialSemana[]
}

interface CicloData {
  id: string
  numeroSemana: number
  dataInicio: Date
  dataFim: Date
  plano: { id: string; nome: string }
  disciplinas: DisciplinaSemana[]
}

interface MaterialDisponivel {
  id: string
  nome: string
  tipo: string
}

interface Props {
  ciclo: CicloData
  planoId: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseAssuntos(raw: string | null): string[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

function MaterialIcon({ tipo }: { tipo: string }) {
  if (tipo === 'VIDEO') return <Video className="h-3 w-3 shrink-0" />
  if (tipo === 'YOUTUBE') return <Link2 className="h-3 w-3 shrink-0" />
  return <FileText className="h-3 w-3 shrink-0" />
}

// ─── Componente ────────────────────────────────────────────────────────────────

export function CicloDetalheAdmin({ ciclo: cicloInicial, planoId }: Props) {
  const [disciplinas, setDisciplinas] = useState<DisciplinaSemana[]>(cicloInicial.disciplinas)

  // Horas / Questões: controlled inputs com auto-save no blur
  const [rowEdits, setRowEdits] = useState<Record<string, { horas: number; questoes: number }>>(
    () => Object.fromEntries(cicloInicial.disciplinas.map(d => [d.id, { horas: d.horasPlanejadas, questoes: d.questoesPlanejadas }]))
  )
  const [savingDiscId, setSavingDiscId] = useState<string | null>(null)
  const [savedDiscId, setSavedDiscId] = useState<string | null>(null)

  // Materiais: add inline por linha
  const [matAddingDiscId, setMatAddingDiscId] = useState<string | null>(null)
  const [matDisponiveis, setMatDisponiveis] = useState<MaterialDisponivel[]>([])
  const [matSelecionado, setMatSelecionado] = useState('')
  const [loadingMatDiscId, setLoadingMatDiscId] = useState<string | null>(null)
  const [addingMatDiscId, setAddingMatDiscId] = useState<string | null>(null)
  const [removendoMatId, setRemovendoMatId] = useState<string | null>(null)

  // Assuntos: input inline por linha
  const [assuntoInputs, setAssuntoInputs] = useState<Record<string, string>>({})
  const [addingAssuntoDiscId, setAddingAssuntoDiscId] = useState<string | null>(null)
  const [removendoAssuntoKey, setRemovendoAssuntoKey] = useState<string | null>(null)

  // Remover disciplina
  const [removendoDiscId, setRemovendoDiscId] = useState<string | null>(null)

  // Modal adicionar disciplina
  const [modalDisc, setModalDisc] = useState(false)
  const [discDisponiveis, setDiscDisponiveis] = useState<{ id: string; nome: string }[]>([])
  const [novaDiscId, setNovaDiscId] = useState('')
  const [novaDiscHoras, setNovaDiscHoras] = useState(0)
  const [novaDiscQuestoes, setNovaDiscQuestoes] = useState(0)
  const [loadingDiscs, setLoadingDiscs] = useState(false)
  const [salvandoDisc, setSalvandoDisc] = useState(false)

  // ── Helpers de estado ────────────────────────────────────────────────────────

  const updateDisc = (id: string, patch: Partial<DisciplinaSemana>) =>
    setDisciplinas(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))

  // ── Horas / Questões ─────────────────────────────────────────────────────────

  const handleBlurPlanejamento = async (discId: string) => {
    const disc = disciplinas.find(d => d.id === discId)
    if (!disc) return
    const { horas, questoes } = rowEdits[discId] ?? { horas: disc.horasPlanejadas, questoes: disc.questoesPlanejadas }
    if (horas === disc.horasPlanejadas && questoes === disc.questoesPlanejadas) return

    setSavingDiscId(discId)
    await adminAtualizarDisciplinaSemana(discId, planoId, { horasPlanejadas: horas, questoesPlanejadas: questoes })
    setSavingDiscId(null)
    setSavedDiscId(discId)
    setTimeout(() => setSavedDiscId(null), 1500)
    updateDisc(discId, { horasPlanejadas: horas, questoesPlanejadas: questoes })
  }

  // ── Materiais ────────────────────────────────────────────────────────────────

  const iniciarAddMaterial = async (disc: DisciplinaSemana) => {
    setMatAddingDiscId(disc.id)
    setMatSelecionado('')
    setLoadingMatDiscId(disc.id)
    const res = await fetch(`/api/admin/materiais-disciplina?disciplinaId=${disc.disciplinaId}`)
    const todos: MaterialDisponivel[] = res.ok ? await res.json() : []
    const adicionadosIds = new Set(disc.materiais.map(m => m.materialId))
    setMatDisponiveis(todos.filter(m => !adicionadosIds.has(m.id)))
    setLoadingMatDiscId(null)
  }

  const confirmarAddMaterial = async (disc: DisciplinaSemana) => {
    if (!matSelecionado) return
    setAddingMatDiscId(disc.id)
    const res = await adminAdicionarMaterialAoCiclo({
      disciplinaSemanaId: disc.id,
      materialId: matSelecionado,
      planoId,
      ordem: disc.materiais.length,
    })
    setAddingMatDiscId(null)
    if (res.error) { alert(res.error); return }
    const novoMat = res.data as MaterialSemana
    updateDisc(disc.id, { materiais: [...disc.materiais, novoMat] })
    setMatDisponiveis(prev => prev.filter(m => m.id !== matSelecionado))
    setMatSelecionado('')
    setMatAddingDiscId(null)
  }

  const removerMaterial = async (matEntryId: string, disc: DisciplinaSemana) => {
    setRemovendoMatId(matEntryId)
    const res = await adminRemoverMaterialDoCiclo(matEntryId, planoId)
    setRemovendoMatId(null)
    if (res.error) { alert(res.error); return }
    updateDisc(disc.id, { materiais: disc.materiais.filter(m => m.id !== matEntryId) })
  }

  // ── Assuntos ─────────────────────────────────────────────────────────────────

  const adicionarAssunto = async (disc: DisciplinaSemana) => {
    const texto = (assuntoInputs[disc.id] || '').trim()
    if (!texto) return
    const atual = parseAssuntos(disc.assuntos)
    if (atual.includes(texto)) return
    const novo = [...atual, texto]
    setAddingAssuntoDiscId(disc.id)
    await adminAtualizarDisciplinaSemana(disc.id, planoId, { assuntos: novo })
    setAddingAssuntoDiscId(null)
    updateDisc(disc.id, { assuntos: JSON.stringify(novo) })
    setAssuntoInputs(prev => ({ ...prev, [disc.id]: '' }))
  }

  const removerAssunto = async (disc: DisciplinaSemana, idx: number) => {
    const key = `${disc.id}-${idx}`
    const atual = parseAssuntos(disc.assuntos)
    const novo = atual.filter((_, i) => i !== idx)
    setRemovendoAssuntoKey(key)
    await adminAtualizarDisciplinaSemana(disc.id, planoId, { assuntos: novo })
    setRemovendoAssuntoKey(null)
    updateDisc(disc.id, { assuntos: JSON.stringify(novo) })
  }

  // ── Remover disciplina ───────────────────────────────────────────────────────

  const handleExcluirDisciplina = async (discId: string) => {
    if (!confirm('Remover esta disciplina do ciclo?')) return
    setRemovendoDiscId(discId)
    const res = await adminExcluirDisciplina(discId, planoId)
    setRemovendoDiscId(null)
    if (res.error) alert(res.error)
    else setDisciplinas(prev => prev.filter(d => d.id !== discId))
  }

  // ── Adicionar disciplina ─────────────────────────────────────────────────────

  const abrirModalDisc = async () => {
    setNovaDiscId('')
    setNovaDiscHoras(0)
    setNovaDiscQuestoes(0)
    setModalDisc(true)
    setLoadingDiscs(true)
    const res = await fetch(`/api/admin/disciplinas?planoId=${planoId}`)
    const todas = res.ok ? await res.json() : []
    const existentesIds = new Set(disciplinas.map(d => d.disciplinaId))
    setDiscDisponiveis(todas.filter((d: { id: string }) => !existentesIds.has(d.id)))
    setLoadingDiscs(false)
  }

  const handleAdicionarDisciplina = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaDiscId) return
    setSalvandoDisc(true)
    const res = await adminAdicionarDisciplina({
      semanaId: cicloInicial.id,
      planoId,
      disciplinaId: novaDiscId,
      horasPlanejadas: novaDiscHoras,
      questoesPlanejadas: novaDiscQuestoes,
    })
    setSalvandoDisc(false)
    if (res.error) { alert(res.error); return }
    if (res.success && res.data) {
      const d = res.data as Omit<DisciplinaSemana, 'assuntos'> & { assuntos?: string | null }
      const novaDisc: DisciplinaSemana = { ...d, assuntos: d.assuntos ?? null, materiais: (d as DisciplinaSemana).materiais ?? [] }
      setDisciplinas(prev => [...prev, novaDisc])
      setRowEdits(prev => ({ ...prev, [novaDisc.id]: { horas: novaDisc.horasPlanejadas, questoes: novaDisc.questoesPlanejadas } }))
      setModalDisc(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {disciplinas.length} disciplina{disciplinas.length !== 1 ? 's' : ''}
            </CardTitle>
            <Button size="sm" onClick={abrirModalDisc}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar Disciplina
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {disciplinas.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Nenhuma disciplina neste ciclo. Clique em "Adicionar Disciplina" para começar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-48">Disciplina</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 w-24">Horas</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 w-24">Questões</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Materiais</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Assuntos</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {disciplinas.map(disc => {
                    const assuntos = parseAssuntos(disc.assuntos)
                    const isSaving = savingDiscId === disc.id
                    const isSaved = savedDiscId === disc.id
                    return (
                      <tr key={disc.id} className="align-top hover:bg-slate-50/60 transition-colors">

                        {/* Disciplina */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800 text-sm leading-tight">
                              {disc.disciplina.nome}
                            </span>
                            {isSaving && <Loader2 className="h-3 w-3 animate-spin text-slate-400 shrink-0" />}
                            {isSaved && <Check className="h-3 w-3 text-emerald-500 shrink-0" />}
                          </div>
                        </td>

                        {/* Horas */}
                        <td className="px-3 py-3">
                          <Input
                            type="number"
                            min="0"
                            className="h-8 w-20 text-sm"
                            value={rowEdits[disc.id]?.horas ?? disc.horasPlanejadas}
                            onChange={e => setRowEdits(prev => ({ ...prev, [disc.id]: { ...prev[disc.id], horas: parseInt(e.target.value) || 0 } }))}
                            onBlur={() => handleBlurPlanejamento(disc.id)}
                          />
                        </td>

                        {/* Questões */}
                        <td className="px-3 py-3">
                          <Input
                            type="number"
                            min="0"
                            className="h-8 w-20 text-sm"
                            value={rowEdits[disc.id]?.questoes ?? disc.questoesPlanejadas}
                            onChange={e => setRowEdits(prev => ({ ...prev, [disc.id]: { ...prev[disc.id], questoes: parseInt(e.target.value) || 0 } }))}
                            onBlur={() => handleBlurPlanejamento(disc.id)}
                          />
                        </td>

                        {/* Materiais */}
                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            {/* Badges dos materiais */}
                            <div className="flex flex-wrap gap-1">
                              {disc.materiais.map(mat => (
                                <Badge
                                  key={mat.id}
                                  variant="secondary"
                                  className="text-xs gap-1 pr-1 max-w-[180px]"
                                >
                                  <MaterialIcon tipo={mat.material.tipo} />
                                  <span className="truncate">{mat.material.nome}</span>
                                  <button
                                    className="ml-0.5 rounded hover:bg-slate-300 p-0.5 disabled:opacity-50"
                                    disabled={removendoMatId === mat.id}
                                    onClick={() => removerMaterial(mat.id, disc)}
                                  >
                                    {removendoMatId === mat.id
                                      ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                      : <X className="h-2.5 w-2.5" />}
                                  </button>
                                </Badge>
                              ))}
                            </div>

                            {/* Add material inline */}
                            {matAddingDiscId === disc.id ? (
                              <div className="flex items-center gap-1">
                                {loadingMatDiscId === disc.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                ) : matDisponiveis.length === 0 ? (
                                  <span className="text-xs text-slate-400">Nenhum disponível</span>
                                ) : (
                                  <select
                                    className="border rounded px-2 h-7 text-xs bg-background flex-1 min-w-0"
                                    value={matSelecionado}
                                    onChange={e => setMatSelecionado(e.target.value)}
                                    autoFocus
                                  >
                                    <option value="">Selecione...</option>
                                    {matDisponiveis.map(m => (
                                      <option key={m.id} value={m.id}>[{m.tipo}] {m.nome}</option>
                                    ))}
                                  </select>
                                )}
                                <Button
                                  size="sm" className="h-7 px-2 text-xs"
                                  disabled={!matSelecionado || addingMatDiscId === disc.id}
                                  onClick={() => confirmarAddMaterial(disc)}
                                >
                                  {addingMatDiscId === disc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                </Button>
                                <Button
                                  size="sm" variant="ghost" className="h-7 w-7 p-0"
                                  onClick={() => setMatAddingDiscId(null)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-0.5 transition-colors"
                                onClick={() => iniciarAddMaterial(disc)}
                              >
                                <Plus className="h-3 w-3" /> material
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Assuntos */}
                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            {/* Chips dos assuntos */}
                            {assuntos.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {assuntos.map((a, idx) => {
                                  const key = `${disc.id}-${idx}`
                                  return (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs px-2 py-0.5 rounded-full"
                                    >
                                      {a}
                                      <button
                                        className="hover:text-red-500 transition-colors disabled:opacity-50"
                                        disabled={removendoAssuntoKey === key}
                                        onClick={() => removerAssunto(disc, idx)}
                                      >
                                        {removendoAssuntoKey === key
                                          ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                          : <X className="h-2.5 w-2.5" />}
                                      </button>
                                    </span>
                                  )
                                })}
                              </div>
                            )}

                            {/* Input novo assunto */}
                            <div className="flex items-center gap-1">
                              <Input
                                className="h-7 text-xs w-44"
                                placeholder="Novo assunto..."
                                value={assuntoInputs[disc.id] || ''}
                                onChange={e => setAssuntoInputs(prev => ({ ...prev, [disc.id]: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionarAssunto(disc))}
                              />
                              <Button
                                size="sm" variant="ghost" className="h-7 w-7 p-0"
                                disabled={!assuntoInputs[disc.id]?.trim() || addingAssuntoDiscId === disc.id}
                                onClick={() => adicionarAssunto(disc)}
                              >
                                {addingAssuntoDiscId === disc.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Plus className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>
                        </td>

                        {/* Ações */}
                        <td className="px-2 py-3">
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleExcluirDisciplina(disc.id)}
                            disabled={removendoDiscId === disc.id}
                          >
                            {removendoDiscId === disc.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: adicionar disciplina */}
      <Dialog open={modalDisc} onOpenChange={setModalDisc}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAdicionarDisciplina}>
            <DialogHeader>
              <DialogTitle>Adicionar Disciplina</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid gap-2">
                <Label>Disciplina *</Label>
                {loadingDiscs ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </div>
                ) : discDisponiveis.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Todas as disciplinas do pool já estão neste ciclo.
                  </p>
                ) : (
                  <select
                    className="border rounded-md px-3 h-9 text-sm bg-background"
                    value={novaDiscId}
                    onChange={e => setNovaDiscId(e.target.value)}
                    required
                  >
                    <option value="">Selecione...</option>
                    {discDisponiveis.map(d => (
                      <option key={d.id} value={d.id}>{d.nome}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Horas</Label>
                  <Input type="number" min="0" value={novaDiscHoras || ''}
                    onChange={e => setNovaDiscHoras(parseInt(e.target.value) || 0)} placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label>Questões</Label>
                  <Input type="number" min="0" value={novaDiscQuestoes || ''}
                    onChange={e => setNovaDiscQuestoes(parseInt(e.target.value) || 0)} placeholder="0" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={salvandoDisc || !novaDiscId}>
                {salvandoDisc && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
