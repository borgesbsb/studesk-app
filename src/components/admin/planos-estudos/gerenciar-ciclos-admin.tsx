'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus, Trash2, Loader2, CalendarDays, FileText, Video, Link2, Check, X, Bold, Italic, ClipboardList,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  adminAdicionarCiclo,
  adminExcluirCiclo,
  adminAdicionarDisciplina,
  adminExcluirDisciplina,
  adminAtualizarDisciplinaSemana,
  adminAdicionarMaterialAoCiclo,
  adminRemoverMaterialDoCiclo,
  adminAssociarSimuladoAoCiclo,
  adminAtualizarHorasSimuladoCiclo,
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
  minutosPlanejados: number
  questoesPlanejadas: number
  assuntos: string | null
  disciplina: { id: string; nome: string; cor: string | null }
  materiais: MaterialSemana[]
}

interface SimuladoRef {
  id: string
  nome: string
  dataRealizacao: Date | string
  config: { totalQuestoes: number } | null
}

interface Ciclo {
  id: string
  numeroSemana: number
  dataInicio: Date
  dataFim: Date
  observacoes: string | null
  simuladoId: string | null
  simuladoHoras: number
  simulado: SimuladoRef | null
  disciplinas: DisciplinaSemana[]
}

interface MaterialDisponivel {
  id: string
  nome: string
  tipo: string
}

interface GerenciarCiclosAdminProps {
  planoId: string
  ciclosIniciais: Ciclo[]
  simuladosDisponiveis: SimuladoRef[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function aplicarMarcacao(
  textarea: HTMLTextAreaElement,
  marcador: string,
  onChange: (val: string) => void
) {
  const { selectionStart, selectionEnd, value } = textarea
  const selecionado = value.slice(selectionStart, selectionEnd)
  const novo = value.slice(0, selectionStart) + marcador + selecionado + marcador + value.slice(selectionEnd)
  onChange(novo)
  requestAnimationFrame(() => {
    textarea.focus()
    textarea.setSelectionRange(selectionStart + marcador.length, selectionEnd + marcador.length)
  })
}

function renderMarkdown(text: string) {
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />')
  return { __html: html }
}

function MaterialIcon({ tipo }: { tipo: string }) {
  if (tipo === 'VIDEO') return <Video className="h-3 w-3 shrink-0" />
  if (tipo === 'YOUTUBE') return <Link2 className="h-3 w-3 shrink-0" />
  return <FileText className="h-3 w-3 shrink-0 text-red-600" />
}

// ─── Componente ────────────────────────────────────────────────────────────────

export function GerenciarCiclosAdmin({ planoId, ciclosIniciais, simuladosDisponiveis }: GerenciarCiclosAdminProps) {
  const [ciclos, setCiclos] = useState<Ciclo[]>(ciclosIniciais)

  // ── Estado: horas/questões/assunto por disciplina (auto-save no blur) ─────────
  const [rowEdits, setRowEdits] = useState<Record<string, { horas: number; questoes: number; assunto: string }>>(
    () => Object.fromEntries(
      ciclosIniciais.flatMap(c => c.disciplinas).map(d => [d.id, { horas: d.minutosPlanejados, questoes: d.questoesPlanejadas, assunto: d.assuntos ?? '' }])
    )
  )
  const [savingDiscId, setSavingDiscId] = useState<string | null>(null)
  const [savedDiscId, setSavedDiscId] = useState<string | null>(null)

  // ── Estado: materiais inline ──────────────────────────────────────────────────
  const [matAddingDiscId, setMatAddingDiscId] = useState<string | null>(null)
  const [matDisponiveis, setMatDisponiveis] = useState<MaterialDisponivel[]>([])
  const [matSelecionado, setMatSelecionado] = useState('')
  const [loadingMatDiscId, setLoadingMatDiscId] = useState<string | null>(null)
  const [addingMatDiscId, setAddingMatDiscId] = useState<string | null>(null)
  const [removendoMatId, setRemovendoMatId] = useState<string | null>(null)

  // ── Estado: assuntos inline ───────────────────────────────────────────────────
  const [editandoAssuntoDiscId, setEditandoAssuntoDiscId] = useState<string | null>(null)
  const [savingAssuntoDiscId, setSavingAssuntoDiscId] = useState<string | null>(null)
  const [savedAssuntoDiscId, setSavedAssuntoDiscId] = useState<string | null>(null)

  // ── Estado: simulado por ciclo ────────────────────────────────────────────────
  const [salvandoSimuladoCicloId, setSalvandoSimuladoCicloId] = useState<string | null>(null)
  const [simHoras, setSimHoras] = useState<Record<string, number>>(
    () => Object.fromEntries(ciclosIniciais.map(c => [c.id, c.simuladoHoras ?? 3]))
  )
  const [salvandoSimHorasId, setSalvandoSimHorasId] = useState<string | null>(null)
  const [savedSimHorasId, setSavedSimHorasId] = useState<string | null>(null)

  // ── Estado: ciclos ────────────────────────────────────────────────────────────
  const [removendoCicloId, setRemovendoCicloId] = useState<string | null>(null)
  const [modalCiclo, setModalCiclo] = useState(false)
  const [novoCiclo, setNovoCiclo] = useState({ dataInicio: '', dataFim: '', observacoes: '' })
  const [salvandoCiclo, setSalvandoCiclo] = useState(false)

  // ── Estado: adicionar disciplina ──────────────────────────────────────────────
  const [modalDiscCicloId, setModalDiscCicloId] = useState<string | null>(null)
  const [discDisponiveis, setDiscDisponiveis] = useState<{ id: string; nome: string }[]>([])
  const [novaDiscId, setNovaDiscId] = useState('')
  const [novaDiscHoras, setNovaDiscHoras] = useState(0)
  const [novaDiscQuestoes, setNovaDiscQuestoes] = useState(0)
  const [loadingDiscs, setLoadingDiscs] = useState(false)
  const [salvandoDisc, setSalvandoDisc] = useState(false)
  const [removendoDiscId, setRemovendoDiscId] = useState<string | null>(null)

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const updateDisc = (discId: string, patch: Partial<DisciplinaSemana>) =>
    setCiclos(prev => prev.map(c => ({
      ...c,
      disciplinas: c.disciplinas.map(d => d.id === discId ? { ...d, ...patch } : d)
    })))

  const getDisc = (discId: string): DisciplinaSemana | undefined =>
    ciclos.flatMap(c => c.disciplinas).find(d => d.id === discId)

  // ── Horas / Questões ──────────────────────────────────────────────────────────

  const handleBlurPlanejamento = async (discId: string) => {
    const disc = getDisc(discId)
    if (!disc) return
    const { horas, questoes } = rowEdits[discId] ?? { horas: disc.minutosPlanejados, questoes: disc.questoesPlanejadas }
    if (horas === disc.minutosPlanejados && questoes === disc.questoesPlanejadas) return
    setSavingDiscId(discId)
    await adminAtualizarDisciplinaSemana(discId, planoId, { minutosPlanejados: horas, questoesPlanejadas: questoes })
    setSavingDiscId(null)
    setSavedDiscId(discId)
    setTimeout(() => setSavedDiscId(d => d === discId ? null : d), 1500)
    updateDisc(discId, { minutosPlanejados: horas, questoesPlanejadas: questoes })
  }

  // ── Materiais ─────────────────────────────────────────────────────────────────

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
    updateDisc(disc.id, { materiais: [...disc.materiais, res.data as MaterialSemana] })
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

  // ── Assuntos ──────────────────────────────────────────────────────────────────

  const handleBlurAssunto = async (discId: string) => {
    setEditandoAssuntoDiscId(null)
    const disc = getDisc(discId)
    if (!disc) return
    const valor = rowEdits[discId]?.assunto ?? ''
    if (valor === (disc.assuntos ?? '')) return
    setSavingAssuntoDiscId(discId)
    await adminAtualizarDisciplinaSemana(discId, planoId, { assuntos: valor })
    setSavingAssuntoDiscId(null)
    updateDisc(discId, { assuntos: valor || null })
    setSavedAssuntoDiscId(discId)
    setTimeout(() => setSavedAssuntoDiscId(d => d === discId ? null : d), 1500)
  }

  // ── Simulado ──────────────────────────────────────────────────────────────────

  const handleAssociarSimulado = async (cicloId: string, simuladoId: string | null) => {
    setSalvandoSimuladoCicloId(cicloId)
    const res = await adminAssociarSimuladoAoCiclo(cicloId, simuladoId, planoId)
    setSalvandoSimuladoCicloId(null)
    if (res.error) { alert(res.error); return }
    const sim = simuladoId ? simuladosDisponiveis.find(s => s.id === simuladoId) ?? null : null
    setCiclos(prev => prev.map(c =>
      c.id === cicloId ? { ...c, simuladoId, simulado: sim } : c
    ))
    if (!simuladoId) setSimHoras(prev => ({ ...prev, [cicloId]: 3 }))
  }

  const handleBlurSimHoras = async (cicloId: string) => {
    const ciclo = ciclos.find(c => c.id === cicloId)
    if (!ciclo) return
    const horas = simHoras[cicloId] ?? 3
    if (horas === ciclo.simuladoHoras) return
    setSalvandoSimHorasId(cicloId)
    await adminAtualizarHorasSimuladoCiclo(cicloId, horas, planoId)
    setSalvandoSimHorasId(null)
    setCiclos(prev => prev.map(c => c.id === cicloId ? { ...c, simuladoHoras: horas } : c))
    setSavedSimHorasId(cicloId)
    setTimeout(() => setSavedSimHorasId(id => id === cicloId ? null : id), 1500)
  }

  // ── Ciclos ────────────────────────────────────────────────────────────────────

  const handleAdicionarCiclo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoCiclo.dataInicio || !novoCiclo.dataFim) return
    const proximoNumero = ciclos.length > 0 ? Math.max(...ciclos.map(c => c.numeroSemana)) + 1 : 1
    setSalvandoCiclo(true)
    const res = await adminAdicionarCiclo({
      planoId,
      numeroSemana: proximoNumero,
      dataInicio: novoCiclo.dataInicio,
      dataFim: novoCiclo.dataFim,
      observacoes: novoCiclo.observacoes || undefined,
    })
    setSalvandoCiclo(false)
    if (res.error) { alert(res.error); return }
    if (res.success && res.data) {
      const d = res.data as Omit<Ciclo, 'disciplinas'> & { disciplinas?: DisciplinaSemana[] }
      const novoCicloData = { ...d, simuladoId: null, simuladoHoras: 3, simulado: null, disciplinas: d.disciplinas ?? [] } as Ciclo
      setCiclos(prev => [...prev, novoCicloData])
      setSimHoras(prev => ({ ...prev, [novoCicloData.id]: 3 }))
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

  // ── Disciplinas ───────────────────────────────────────────────────────────────

  const abrirModalDisc = async (cicloId: string) => {
    setModalDiscCicloId(cicloId)
    setNovaDiscId('')
    setNovaDiscHoras(0)
    setNovaDiscQuestoes(0)
    setLoadingDiscs(true)
    const res = await fetch(`/api/admin/disciplinas?planoId=${planoId}`)
    const todas = res.ok ? await res.json() : []
    const ciclo = ciclos.find(c => c.id === cicloId)
    const existentesIds = new Set(ciclo?.disciplinas.map(d => d.disciplinaId) ?? [])
    setDiscDisponiveis(todas.filter((d: { id: string }) => !existentesIds.has(d.id)))
    setLoadingDiscs(false)
  }

  const handleAdicionarDisciplina = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalDiscCicloId || !novaDiscId) return
    setSalvandoDisc(true)
    const res = await adminAdicionarDisciplina({
      semanaId: modalDiscCicloId,
      planoId,
      disciplinaId: novaDiscId,
      minutosPlanejados: novaDiscHoras,
      questoesPlanejadas: novaDiscQuestoes,
    })
    setSalvandoDisc(false)
    if (res.error) { alert(res.error); return }
    if (res.success && res.data) {
      const d = res.data as DisciplinaSemana & { assuntos?: string | null }
      const novaDisc: DisciplinaSemana = { ...d, assuntos: d.assuntos ?? null, materiais: d.materiais ?? [] }
      setCiclos(prev => prev.map(c =>
        c.id === modalDiscCicloId ? { ...c, disciplinas: [...c.disciplinas, novaDisc] } : c
      ))
      setRowEdits(prev => ({ ...prev, [novaDisc.id]: { horas: novaDisc.minutosPlanejados, questoes: novaDisc.questoesPlanejadas, assunto: novaDisc.assuntos ?? '' } }))
      setModalDiscCicloId(null)
    }
  }

  const handleExcluirDisciplina = async (discId: string) => {
    if (!confirm('Remover esta disciplina do ciclo?')) return
    setRemovendoDiscId(discId)
    const res = await adminExcluirDisciplina(discId, planoId)
    setRemovendoDiscId(null)
    if (res.error) alert(res.error)
    else setCiclos(prev => prev.map(c => ({ ...c, disciplinas: c.disciplinas.filter(d => d.id !== discId) })))
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              Ciclos e Disciplinas
            </CardTitle>
            <Button size="sm" onClick={() => setModalCiclo(true)}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar Ciclo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {ciclos.length === 0 ? (
            <div className="text-center py-8 text-slate-400 border rounded-lg bg-slate-50 text-sm">
              Nenhum ciclo criado. Clique em "Adicionar Ciclo" para começar.
            </div>
          ) : (
            ciclos.map(ciclo => (
              <div key={ciclo.id} className="border rounded-lg overflow-hidden">
                {/* Cabeçalho do ciclo */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b gap-4">
                  <div className="flex items-center gap-3 flex-wrap min-w-0">
                    <span className="font-semibold text-slate-900 text-sm shrink-0">Ciclo {ciclo.numeroSemana}</span>
                    <span className="text-xs text-slate-500 shrink-0">
                      {format(new Date(ciclo.dataInicio), 'dd/MM/yy', { locale: ptBR })}
                      {' – '}
                      {format(new Date(ciclo.dataFim), 'dd/MM/yy', { locale: ptBR })}
                    </span>
                    {ciclo.observacoes && (
                      <span className="text-xs text-slate-400">· {ciclo.observacoes}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2"
                      onClick={() => abrirModalDisc(ciclo.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Disciplina
                    </Button>
                    {/* Select de simulado */}
                    {salvandoSimuladoCicloId === ciclo.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                      <select
                        className="border rounded px-2 h-7 text-xs bg-background text-slate-600 max-w-[180px]"
                        value={ciclo.simuladoId ?? ''}
                        onChange={e => handleAssociarSimulado(ciclo.id, e.target.value || null)}
                      >
                        <option value="">+ Simulado</option>
                        {simuladosDisponiveis.map(s => (
                          <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                      </select>
                    )}
                    <Button variant="ghost" size="sm"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleExcluirCiclo(ciclo.id)}
                      disabled={removendoCicloId === ciclo.id}>
                      {removendoCicloId === ciclo.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Tabela de disciplinas */}
                <div className="overflow-x-auto">
                    <table style={{tableLayout:'fixed', width:'100%'}}>
                      <colgroup>
                        <col style={{width:'176px'}} />
                        <col style={{width:'80px'}} />
                        <col style={{width:'96px'}} />
                        <col style={{width:'500px'}} />
                        <col />
                        <col style={{width:'40px'}} />
                      </colgroup>
                      <thead>
                        <tr className="border-b bg-white">
                          <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Disciplina</th>
                          <th className="text-left px-3 py-3 text-sm font-medium text-slate-500">Min</th>
                          <th className="text-left px-3 py-3 text-sm font-medium text-slate-500">Questões</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Materiais</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Assuntos</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {/* Linha do simulado — só aparece quando há simulado associado */}
                        {ciclo.simulado && (
                          <tr className="bg-amber-50/60 align-middle">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <ClipboardList className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                <span className="text-sm font-medium text-amber-800 truncate">
                                  {ciclo.simulado.nome}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  className="h-9 w-full text-sm bg-white"
                                  value={simHoras[ciclo.id] ?? 3}
                                  onChange={e => setSimHoras(prev => ({ ...prev, [ciclo.id]: parseInt(e.target.value) || 0 }))}
                                  onBlur={() => handleBlurSimHoras(ciclo.id)}
                                />
                                {salvandoSimHorasId === ciclo.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 shrink-0" />}
                                {savedSimHorasId === ciclo.id && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-sm text-amber-700 font-medium">
                                {ciclo.simulado.config?.totalQuestoes ?? '—'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-xs text-slate-300">—</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-xs text-slate-300">—</span>
                            </td>
                            <td className="px-2 py-2.5">
                              <Button variant="ghost" size="sm"
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleAssociarSimulado(ciclo.id, null)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        )}

                        {ciclo.disciplinas.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 text-center text-xs text-slate-400">
                              Nenhuma disciplina. Clique em "+ Disciplina" para adicionar.
                            </td>
                          </tr>
                        )}
                        {ciclo.disciplinas.map(disc => {
                          return (
                            <tr key={disc.id} className="align-top hover:bg-slate-50/50 transition-colors">

                              {/* Disciplina */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5 pt-1">
                                  <span className="font-medium text-slate-800 text-sm leading-tight truncate">
                                    {disc.disciplina.nome}
                                  </span>
                                  {savingDiscId === disc.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 shrink-0" />}
                                  {savedDiscId === disc.id && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                                </div>
                              </td>

                              {/* Min planejados */}
                              <td className="px-3 py-3">
                                <Input
                                  type="number" min="0"
                                  className="h-9 w-full text-sm"
                                  value={rowEdits[disc.id]?.horas ?? disc.minutosPlanejados}
                                  onChange={e => setRowEdits(prev => ({ ...prev, [disc.id]: { ...prev[disc.id], horas: parseInt(e.target.value) || 0 } }))}
                                  onBlur={() => handleBlurPlanejamento(disc.id)}
                                />
                              </td>

                              {/* Questões */}
                              <td className="px-3 py-3">
                                <Input
                                  type="number" min="0"
                                  className="h-9 w-full text-sm"
                                  value={rowEdits[disc.id]?.questoes ?? disc.questoesPlanejadas}
                                  onChange={e => setRowEdits(prev => ({ ...prev, [disc.id]: { ...prev[disc.id], questoes: parseInt(e.target.value) || 0 } }))}
                                  onBlur={() => handleBlurPlanejamento(disc.id)}
                                />
                              </td>

                              {/* Materiais */}
                              <td className="px-4 py-3" style={{overflow:'hidden'}}>
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-1.5">
                                    {disc.materiais.map(mat => (
                                      <span key={mat.id}
                                        className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 text-xs px-2 py-1 rounded"
                                        style={{maxWidth:'100%'}}>
                                        <MaterialIcon tipo={mat.material.tipo} className="shrink-0" />
                                        <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0}}>{mat.material.nome}</span>
                                        <button
                                          className="hover:text-red-500 transition-colors disabled:opacity-50 ml-0.5"
                                          disabled={removendoMatId === mat.id}
                                          onClick={() => removerMaterial(mat.id, disc)}>
                                          {removendoMatId === mat.id
                                            ? <Loader2 className="h-3 w-3 animate-spin" />
                                            : <X className="h-3 w-3" />}
                                        </button>
                                      </span>
                                    ))}
                                  </div>

                                  {matAddingDiscId === disc.id ? (
                                    <div className="flex items-center gap-1.5">
                                      {loadingMatDiscId === disc.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                      ) : matDisponiveis.length === 0 ? (
                                        <span className="text-xs text-slate-400">Nenhum disponível</span>
                                      ) : (
                                        <select
                                          className="border rounded px-2 h-8 text-xs bg-background flex-1 min-w-0"
                                          value={matSelecionado}
                                          onChange={e => setMatSelecionado(e.target.value)}
                                          autoFocus>
                                          <option value="">Selecione...</option>
                                          {matDisponiveis.map(m => (
                                            <option key={m.id} value={m.id}>{m.nome}</option>
                                          ))}
                                        </select>
                                      )}
                                      {!loadingMatDiscId && (
                                        <>
                                          <button
                                            className="h-8 w-8 flex items-center justify-center rounded border bg-white hover:bg-slate-50 disabled:opacity-50"
                                            disabled={!matSelecionado || addingMatDiscId === disc.id}
                                            onClick={() => confirmarAddMaterial(disc)}>
                                            {addingMatDiscId === disc.id
                                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                              : <Check className="h-3.5 w-3.5 text-emerald-600" />}
                                          </button>
                                          <button
                                            className="h-8 w-8 flex items-center justify-center rounded hover:bg-slate-100"
                                            onClick={() => setMatAddingDiscId(null)}>
                                            <X className="h-3.5 w-3.5 text-slate-400" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  ) : (
                                    <button
                                      className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                                      onClick={() => iniciarAddMaterial(disc)}>
                                      <Plus className="h-3.5 w-3.5" /> material
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Assuntos */}
                              <td className="px-4 py-3">
                                <div className="flex items-start gap-1.5">
                                  <div className="flex-1 min-w-0">
                                    {editandoAssuntoDiscId === disc.id ? (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-0.5">
                                          <button
                                            type="button"
                                            title="Negrito"
                                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                                            onMouseDown={e => {
                                              e.preventDefault()
                                              const ta = e.currentTarget.closest('td')?.querySelector('textarea')
                                              if (ta) aplicarMarcacao(ta as HTMLTextAreaElement, '**', val =>
                                                setRowEdits(prev => ({ ...prev, [disc.id]: { ...prev[disc.id], assunto: val } }))
                                              )
                                            }}>
                                            <Bold className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            title="Itálico"
                                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                                            onMouseDown={e => {
                                              e.preventDefault()
                                              const ta = e.currentTarget.closest('td')?.querySelector('textarea')
                                              if (ta) aplicarMarcacao(ta as HTMLTextAreaElement, '*', val =>
                                                setRowEdits(prev => ({ ...prev, [disc.id]: { ...prev[disc.id], assunto: val } }))
                                              )
                                            }}>
                                            <Italic className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                        <Textarea
                                          autoFocus
                                          className="text-sm min-h-[60px] resize-none"
                                          placeholder="Descreva os assuntos..."
                                          value={rowEdits[disc.id]?.assunto ?? ''}
                                          onChange={e => setRowEdits(prev => ({ ...prev, [disc.id]: { ...prev[disc.id], assunto: e.target.value } }))}
                                          onBlur={() => handleBlurAssunto(disc.id)}
                                        />
                                      </div>
                                    ) : (
                                      <div
                                        className="text-sm text-slate-700 cursor-text min-h-[36px] px-3 py-2 rounded border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-colors"
                                        onClick={() => setEditandoAssuntoDiscId(disc.id)}>
                                        {rowEdits[disc.id]?.assunto ? (
                                          <span dangerouslySetInnerHTML={renderMarkdown(rowEdits[disc.id].assunto)} />
                                        ) : (
                                          <span className="text-slate-400 italic">Clique para adicionar assuntos...</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="pt-1">
                                    {savingAssuntoDiscId === disc.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                                    {savedAssuntoDiscId === disc.id && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                                  </div>
                                </div>
                              </td>

                              {/* Remover disciplina */}
                              <td className="px-2 py-3">
                                <Button variant="ghost" size="sm"
                                  className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleExcluirDisciplina(disc.id)}
                                  disabled={removendoDiscId === disc.id}>
                                  {removendoDiscId === disc.id
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

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
                  <Input type="date" value={novoCiclo.dataInicio}
                    onChange={e => setNovoCiclo(p => ({ ...p, dataInicio: e.target.value }))} required />
                </div>
                <div className="grid gap-2">
                  <Label>Data Fim *</Label>
                  <Input type="date" value={novoCiclo.dataFim}
                    onChange={e => setNovoCiclo(p => ({ ...p, dataFim: e.target.value }))} required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Observações</Label>
                <Input placeholder="Opcional" value={novoCiclo.observacoes}
                  onChange={e => setNovoCiclo(p => ({ ...p, observacoes: e.target.value }))} />
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

      {/* Modal: adicionar disciplina ao ciclo */}
      <Dialog open={!!modalDiscCicloId} onOpenChange={open => !open && setModalDiscCicloId(null)}>
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
                  <select className="border rounded-md px-3 h-9 text-sm bg-background"
                    value={novaDiscId} onChange={e => setNovaDiscId(e.target.value)} required>
                    <option value="">Selecione...</option>
                    {discDisponiveis.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Min</Label>
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
