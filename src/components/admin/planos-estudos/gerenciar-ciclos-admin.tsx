'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  Plus, Trash2, Loader2, CalendarDays, FileText, Video, Link2, Check, X, Bold, Italic, ClipboardList, ChevronDown, ChevronUp, BookOpen, ExternalLink, AlertTriangle,
  Settings2, Zap, Hash, Calendar, ArrowRight, ArrowLeft, Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  adminAdicionarCiclo,
  adminExcluirCiclo,
  adminExcluirTodosCiclos,
  adminAdicionarDisciplina,
  adminExcluirDisciplina,
  adminAtualizarDisciplinaSemana,
  adminAdicionarMaterialAoCiclo,
  adminRemoverMaterialDoCiclo,
  adminAssociarSimuladoAoCiclo,
  adminAtualizarHorasSimuladoCiclo,
  adminAtualizarDiaSimuladoCiclo,
  adminAtualizarCadernoQuestoesCiclo,
  adminGerarCiclosEmLote,
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
  simuladoDia: string | null
  simulado: SimuladoRef | null
  cadernoQuestoesUrl: string | null
  disciplinas: DisciplinaSemana[]
}

interface MaterialDisponivel {
  id: string
  nome: string
  tipo: string
}

// ─── Tipos do gerador ──────────────────────────────────────────────────────────

interface EditalDisciplina {
  id: string
  conteudoProgramatico: string | null
  conteudoVerticalizado: string | null
  disciplina: { id: string; nome: string; cor: string | null }
}

interface Edital {
  id: string
  nome: string
  orgao: string | null
  cargo: string | null
  ano: number | null
  disciplinas: EditalDisciplina[]
}

interface GerenciarCiclosAdminProps {
  planoId: string
  ciclosIniciais: Ciclo[]
  simuladosDisponiveis: SimuladoRef[]
  editais?: Edital[]
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

export function GerenciarCiclosAdmin({ planoId, ciclosIniciais, simuladosDisponiveis, editais = [] }: GerenciarCiclosAdminProps) {
  const router = useRouter()
  const [ciclos, setCiclos] = useState<Ciclo[]>(ciclosIniciais)

  // Sincroniza estado local quando o servidor retorna novos dados (após router.refresh())
  useEffect(() => {
    setCiclos(ciclosIniciais)
  }, [ciclosIniciais])

  // ── Estado: painel do gerador ─────────────────────────────────────────────────
  const [geradorAberto, setGeradorAberto] = useState(false)

  // ── Estado: gerador de ciclos ─────────────────────────────────────────────────
  const [editalId, setEditalId] = useState<string>(editais[0]?.id ?? '')
  const [editalSearch, setEditalSearch] = useState('')
  const [editalDropdownAberto, setEditalDropdownAberto] = useState(false)
  const [numeroCiclos, setNumeroCiclos] = useState(10)
  const [dataInicio, setDataInicio] = useState('')
  const [duracaoDias, setDuracaoDias] = useState(7)
  const [emP2, setEmP2] = useState<Set<string>>(new Set())
  const [gerando, setGerando] = useState(false)

  const editalSelecionado = editais.find(e => e.id === editalId)
  const disciplinasGerador = editalSelecionado?.disciplinas.filter(
    d => d.conteudoVerticalizado || d.conteudoProgramatico
  ) ?? []
  const p1 = disciplinasGerador.filter(d => !emP2.has(d.disciplina.id))
  const p2 = disciplinasGerador.filter(d => emP2.has(d.disciplina.id))

  useEffect(() => { setEmP2(new Set()) }, [editalId])

  useEffect(() => {
    if (!editalDropdownAberto) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-edital-dropdown]')) setEditalDropdownAberto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [editalDropdownAberto])

  function moverParaP2(disciplinaId: string) {
    setEmP2(prev => new Set([...prev, disciplinaId]))
  }

  function moverParaP1(disciplinaId: string) {
    setEmP2(prev => { const s = new Set(prev); s.delete(disciplinaId); return s })
  }

  const podeGerar = dataInicio && (p1.length > 0 || p2.length > 0)

  async function handleGerar() {
    if (!podeGerar) return
    setGerando(true)
    try {
      const res = await adminGerarCiclosEmLote({
        planoId,
        numeroCiclos,
        dataInicio,
        duracaoDias,
        p1DiscIds: p1.map(d => d.disciplina.id),
        p2DiscIds: p2.map(d => d.disciplina.id),
        editalId,
      })
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      toast.success(`${res.criados} ciclo${res.criados !== 1 ? 's' : ''} gerado${res.criados !== 1 ? 's' : ''} com sucesso!`)
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar ciclos')
    } finally {
      setGerando(false)
    }
  }

  // ── Estado: horas/questões/assunto por disciplina (auto-save no blur) ─────────
  const [rowEdits, setRowEdits] = useState<Record<string, { horas: number; questoes: number; assunto: string }>>(
    () => Object.fromEntries(
      ciclosIniciais.flatMap(c => c.disciplinas).map(d => [d.id, { horas: d.minutosPlanejados, questoes: d.questoesPlanejadas, assunto: d.assuntos ?? '' }])
    )
  )

  // Sincroniza rowEdits quando chegam novos ciclos do servidor
  useEffect(() => {
    setRowEdits(prev => {
      const next = { ...prev }
      ciclosIniciais.flatMap(c => c.disciplinas).forEach(d => {
        if (!next[d.id]) {
          next[d.id] = { horas: d.minutosPlanejados, questoes: d.questoesPlanejadas, assunto: d.assuntos ?? '' }
        }
      })
      return next
    })
  }, [ciclosIniciais])
  const [savingDiscId, setSavingDiscId] = useState<string | null>(null)
  const [savedDiscId, setSavedDiscId] = useState<string | null>(null)

  // ── Estado: materiais inline ──────────────────────────────────────────────────
  const [matAddingDiscId, setMatAddingDiscId] = useState<string | null>(null)
  const [matDisponiveis, setMatDisponiveis] = useState<MaterialDisponivel[]>([])
  const [matSelecionado, setMatSelecionado] = useState('')
  const [matSearch, setMatSearch] = useState('')
  const [discMatAtual, setDiscMatAtual] = useState<DisciplinaSemana | null>(null)

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
  const [simDia, setSimDia] = useState<Record<string, string>>(
    () => Object.fromEntries(ciclosIniciais.map(c => [c.id, c.simuladoDia ?? '']))
  )
  const [salvandoSimDiaId, setSalvandoSimDiaId] = useState<string | null>(null)

  // ── Estado: caderno de questões por ciclo ─────────────────────────────────────
  const [cadernoUrl, setCadernoUrl] = useState<Record<string, string>>(
    () => Object.fromEntries(ciclosIniciais.map(c => [c.id, c.cadernoQuestoesUrl ?? '']))
  )
  const [salvandoCadernoId, setSalvandoCadernoId] = useState<string | null>(null)
  const [savedCadernoId, setSavedCadernoId] = useState<string | null>(null)
  const [editandoCadernoId, setEditandoCadernoId] = useState<string | null>(null)

  // ── Estado: collapse por ciclo (todos fechados exceto o da semana atual) ──────
  const [ciclosColapsados, setCiclosColapsados] = useState<Set<string>>(() => {
    const hoje = new Date()
    return new Set(
      ciclosIniciais
        .filter(c => !(new Date(c.dataInicio) <= hoje && hoje <= new Date(c.dataFim)))
        .map(c => c.id)
    )
  })

  const toggleColapso = (cicloId: string) =>
    setCiclosColapsados(prev => {
      const next = new Set(prev)
      next.has(cicloId) ? next.delete(cicloId) : next.add(cicloId)
      return next
    })

  // ── Estado: ciclos ────────────────────────────────────────────────────────────
  const [removendoCicloId, setRemovendoCicloId] = useState<string | null>(null)
  const [limpandoTodos, setLimpandoTodos] = useState(false)

  const handleLimparTodos = async () => {
    if (!confirm('Apagar TODOS os ciclos deste plano? Esta ação não pode ser desfeita.')) return
    setLimpandoTodos(true)
    try {
      const res = await adminExcluirTodosCiclos(planoId)
      if ('error' in res) { toast.error(res.error); return }
      setCiclos([])
      toast.success(`${res.count} ciclo${res.count !== 1 ? 's' : ''} apagado${res.count !== 1 ? 's' : ''}`)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao apagar ciclos')
    } finally {
      setLimpandoTodos(false)
    }
  }
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
    setDiscMatAtual(disc)
    setMatSelecionado('')
    setMatSearch('')
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
    setDiscMatAtual(null)
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

  const handleChangeDiaSimulado = async (cicloId: string, dia: string) => {
    setSimDia(prev => ({ ...prev, [cicloId]: dia }))
    setSalvandoSimDiaId(cicloId)
    await adminAtualizarDiaSimuladoCiclo(cicloId, dia || null, planoId)
    setSalvandoSimDiaId(null)
    setCiclos(prev => prev.map(c => c.id === cicloId ? { ...c, simuladoDia: dia || null } : c))
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

  // ── Caderno de questões ───────────────────────────────────────────────────────

  const handleBlurCadernoUrl = async (cicloId: string) => {
    setEditandoCadernoId(null)
    const ciclo = ciclos.find(c => c.id === cicloId)
    if (!ciclo) return
    const url = cadernoUrl[cicloId] ?? ''
    if (url === (ciclo.cadernoQuestoesUrl ?? '')) return
    setSalvandoCadernoId(cicloId)
    await adminAtualizarCadernoQuestoesCiclo(cicloId, url || null, planoId)
    setSalvandoCadernoId(null)
    setCiclos(prev => prev.map(c => c.id === cicloId ? { ...c, cadernoQuestoesUrl: url || null } : c))
    setSavedCadernoId(cicloId)
    setTimeout(() => setSavedCadernoId(id => id === cicloId ? null : id), 1500)
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
      const d = res.data as unknown as Omit<Ciclo, 'disciplinas'> & { disciplinas?: DisciplinaSemana[] }
      const novoCicloData = { ...d, simuladoId: null, simuladoHoras: 3, simulado: null, cadernoQuestoesUrl: null, disciplinas: d.disciplinas ?? [] } as Ciclo
      setCiclos(prev => [...prev, novoCicloData])
      setSimHoras(prev => ({ ...prev, [novoCicloData.id]: 3 }))
      setCadernoUrl(prev => ({ ...prev, [novoCicloData.id]: '' }))
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
            <div className="flex items-center gap-2">
              {editais.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGeradorAberto(v => !v)}
                  className="gap-1.5 text-violet-600 hover:text-violet-800 hover:bg-violet-50 border-violet-200"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Configurar gerador
                  {geradorAberto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
              )}
              {ciclos.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLimparTodos}
                  disabled={limpandoTodos}
                  className="gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  {limpandoTodos ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Apagar todos
                </Button>
              )}
              <Button size="sm" onClick={() => setModalCiclo(true)}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Ciclo
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Painel do gerador — colapsável */}
        {geradorAberto && editais.length > 0 && (
          <div className="mx-6 mb-4 rounded-lg border border-violet-200 bg-violet-50/30">
            <div className="px-5 py-4 border-b border-violet-100 flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-semibold text-violet-800">Gerador de Ciclos</span>
              <span className="text-xs text-slate-500 ml-1">
                Distribua as disciplinas do edital entre P1 (ciclos ímpares) e P2 (ciclos pares) e gere os ciclos automaticamente.
              </span>
            </div>

            <div className="p-5 space-y-6">
              {/* Edital */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Edital de referência
                </label>
                {editais.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Nenhum edital disponível.</p>
                ) : (
                  <div className="relative" data-edital-dropdown>
                    {/* Trigger */}
                    <button
                      type="button"
                      onClick={() => { setEditalDropdownAberto(v => !v); setEditalSearch('') }}
                      className="w-full flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    >
                      <span className="truncate text-left">
                        {editalSelecionado
                          ? `${editalSelecionado.nome}${editalSelecionado.orgao ? ` — ${editalSelecionado.orgao}` : ''}${editalSelecionado.ano ? ` (${editalSelecionado.ano})` : ''}`
                          : 'Selecione um edital…'}
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0 ml-2" />
                    </button>

                    {/* Dropdown */}
                    {editalDropdownAberto && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                        {/* Search */}
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                          <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <input
                            autoFocus
                            type="text"
                            placeholder="Buscar edital…"
                            value={editalSearch}
                            onChange={e => setEditalSearch(e.target.value)}
                            className="flex-1 text-sm text-slate-700 placeholder-slate-400 outline-none bg-transparent"
                          />
                        </div>
                        {/* Options */}
                        <ul className="max-h-56 overflow-y-auto py-1">
                          {editais
                            .filter(e => {
                              const q = editalSearch.toLowerCase()
                              return (
                                e.nome.toLowerCase().includes(q) ||
                                (e.orgao ?? '').toLowerCase().includes(q) ||
                                (e.cargo ?? '').toLowerCase().includes(q) ||
                                String(e.ano ?? '').includes(q)
                              )
                            })
                            .map(e => {
                              const label = `${e.nome}${e.orgao ? ` — ${e.orgao}` : ''}${e.ano ? ` (${e.ano})` : ''}`
                              return (
                                <li key={e.id}>
                                  <button
                                    type="button"
                                    onClick={() => { setEditalId(e.id); setEditalDropdownAberto(false) }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-violet-50 hover:text-violet-700 transition-colors ${e.id === editalId ? 'bg-violet-50 text-violet-700 font-medium' : 'text-slate-700'}`}
                                  >
                                    {label}
                                  </button>
                                </li>
                              )
                            })}
                          {editais.filter(e => {
                            const q = editalSearch.toLowerCase()
                            return e.nome.toLowerCase().includes(q) || (e.orgao ?? '').toLowerCase().includes(q)
                          }).length === 0 && (
                            <li className="px-3 py-2 text-sm text-slate-400 italic">Nenhum resultado</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {editalSelecionado && (
                  <p className="text-xs text-slate-400">
                    {disciplinasGerador.length} disciplina{disciplinasGerador.length !== 1 ? 's' : ''} com conteúdo
                    {disciplinasGerador.filter(d => d.conteudoVerticalizado).length > 0 && (
                      <> · <span className="text-green-600">{disciplinasGerador.filter(d => d.conteudoVerticalizado).length} verticalizadas</span></>
                    )}
                  </p>
                )}
              </div>

              {/* Configuração de ciclos */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    Nº de ciclos
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={numeroCiclos}
                    onChange={e => setNumeroCiclos(Math.max(1, Math.min(52, Number(e.target.value))))}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 text-center"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Data de início
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                    Duração (dias)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={duracaoDias}
                    onChange={e => setDuracaoDias(Math.max(1, Math.min(30, Number(e.target.value))))}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 text-center"
                  />
                </div>
              </div>

              <p className="text-xs text-slate-400 -mt-3">
                Ciclos ímpares (1, 3, 5…) → disciplinas P1 &nbsp;·&nbsp; Ciclos pares (2, 4, 6…) → disciplinas P2
              </p>

              {/* Distribuição P1 / P2 */}
              {disciplinasGerador.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                    Distribuição P1 / P2
                  </label>
                  <p className="text-xs text-slate-400">
                    Passe o mouse sobre a disciplina e clique na seta para movê-la.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {/* P1 */}
                    <div className="rounded-md border border-indigo-100 bg-indigo-50/40 overflow-hidden">
                      <div className="px-3 py-2 bg-indigo-100/70 border-b border-indigo-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">P1 — Ímpares</span>
                        <Badge className="bg-indigo-600 text-white text-xs h-5 px-1.5">{p1.length}</Badge>
                      </div>
                      <div className="divide-y divide-indigo-100/60 min-h-[48px]">
                        {p1.length === 0 && (
                          <p className="text-xs text-indigo-300 italic px-3 py-3">Nenhuma disciplina</p>
                        )}
                        {p1.map(d => (
                          <div key={d.disciplina.id} className="flex items-center justify-between px-3 py-2 group">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: d.disciplina.cor || '#6366f1' }}
                              />
                              <span className="text-xs text-slate-700 truncate">{d.disciplina.nome}</span>
                              {d.conteudoVerticalizado && (
                                <span className="text-green-500 text-xs flex-shrink-0" title="Verticalizado">✓</span>
                              )}
                            </div>
                            <button
                              onClick={() => moverParaP2(d.disciplina.id)}
                              title="Mover para P2"
                              className="ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* P2 */}
                    <div className="rounded-md border border-rose-100 bg-rose-50/40 overflow-hidden">
                      <div className="px-3 py-2 bg-rose-100/70 border-b border-rose-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-700 uppercase tracking-wide">P2 — Pares</span>
                        <Badge className="bg-rose-600 text-white text-xs h-5 px-1.5">{p2.length}</Badge>
                      </div>
                      <div className="divide-y divide-rose-100/60 min-h-[48px]">
                        {p2.length === 0 && (
                          <p className="text-xs text-rose-300 italic px-3 py-3">Nenhuma disciplina</p>
                        )}
                        {p2.map(d => (
                          <div key={d.disciplina.id} className="flex items-center justify-between px-3 py-2 group">
                            <button
                              onClick={() => moverParaP1(d.disciplina.id)}
                              title="Mover para P1"
                              className="mr-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-500"
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                            </button>
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: d.disciplina.cor || '#f43f5e' }}
                              />
                              <span className="text-xs text-slate-700 truncate">{d.disciplina.nome}</span>
                              {d.conteudoVerticalizado && (
                                <span className="text-green-500 text-xs flex-shrink-0" title="Verticalizado">✓</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumo + botão */}
              <div className="flex items-center justify-between gap-4">
                {disciplinasGerador.length > 0 ? (
                  <div className="flex items-center gap-4 p-3 rounded-md bg-slate-50 text-xs text-slate-500 flex-1">
                    <span><span className="font-semibold text-indigo-600">{p1.length}</span> em P1</span>
                    <span className="text-slate-300">·</span>
                    <span><span className="font-semibold text-rose-600">{p2.length}</span> em P2</span>
                    <span className="text-slate-300">·</span>
                    <span>{numeroCiclos} ciclos de {duracaoDias} dia{duracaoDias !== 1 ? 's' : ''}</span>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}
                <div className="flex items-center gap-2 shrink-0">
                  {!dataInicio && (
                    <p className="text-xs text-slate-400">informe a data →</p>
                  )}
                  <Button
                    onClick={handleGerar}
                    disabled={!podeGerar || gerando}
                    className="gap-2"
                  >
                    {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {gerando ? 'Gerando ciclos…' : 'Gerar Ciclos'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                    <button
                      type="button"
                      className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                      onClick={() => toggleColapso(ciclo.id)}
                      title={ciclosColapsados.has(ciclo.id) ? 'Expandir' : 'Colapsar'}
                    >
                      {ciclosColapsados.has(ciclo.id)
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronUp className="h-4 w-4" />}
                    </button>
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
                    {/* Caderno de questões */}
                    {editandoCadernoId === ciclo.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          autoFocus
                          type="url"
                          placeholder="URL do caderno de questões..."
                          className="h-7 text-xs w-48 px-2"
                          value={cadernoUrl[ciclo.id] ?? ''}
                          onChange={e => setCadernoUrl(prev => ({ ...prev, [ciclo.id]: e.target.value }))}
                          onBlur={() => handleBlurCadernoUrl(ciclo.id)}
                          onKeyDown={e => { if (e.key === 'Escape') { setEditandoCadernoId(null) } if (e.key === 'Enter') { (e.target as HTMLInputElement).blur() } }}
                        />
                        {salvandoCadernoId === ciclo.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 shrink-0" />}
                        {savedCadernoId === ciclo.id && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                      </div>
                    ) : ciclo.cadernoQuestoesUrl ? (
                      <div className="flex items-center gap-1">
                        <a
                          href={ciclo.cadernoQuestoesUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 h-7 px-2 text-xs rounded border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                          title={ciclo.cadernoQuestoesUrl}
                        >
                          <BookOpen className="h-3.5 w-3.5 shrink-0" />
                          Caderno
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                        </a>
                        <button
                          className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Editar URL"
                          onClick={() => setEditandoCadernoId(ciclo.id)}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="inline-flex items-center gap-1 h-7 px-2 text-xs rounded border border-dashed border-slate-300 text-slate-400 hover:text-violet-600 hover:border-violet-300 transition-colors"
                        onClick={() => setEditandoCadernoId(ciclo.id)}
                      >
                        <BookOpen className="h-3.5 w-3.5" /> Caderno
                      </button>
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
                {!ciclosColapsados.has(ciclo.id) && <div className="overflow-x-auto">
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
                        {ciclo.simulado && (() => {
                          // Gerar opções dia1–diaX baseado nas datas do ciclo
                          const start = new Date(ciclo.dataInicio)
                          const end = new Date(ciclo.dataFim)
                          start.setUTCHours(12, 0, 0, 0)
                          end.setUTCHours(12, 0, 0, 0)
                          const diasOpcoes: { id: string; label: string }[] = []
                          const cur = new Date(start)
                          let idx = 1
                          while (cur <= end && idx <= 7) {
                            diasOpcoes.push({ id: `dia${idx}`, label: `dia${idx} · ${format(cur, 'EEE dd/MM', { locale: ptBR })}` })
                            cur.setUTCDate(cur.getUTCDate() + 1)
                            idx++
                          }
                          return (
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
                                {/* Seletor de dia do simulado */}
                                <div className="flex items-center gap-1">
                                  <select
                                    className="border rounded px-2 h-8 text-xs bg-white text-slate-700 w-full"
                                    value={simDia[ciclo.id] ?? ''}
                                    onChange={e => handleChangeDiaSimulado(ciclo.id, e.target.value)}
                                  >
                                    <option value="">Dia não definido</option>
                                    {diasOpcoes.map(d => (
                                      <option key={d.id} value={d.id}>{d.label}</option>
                                    ))}
                                  </select>
                                  {salvandoSimDiaId === ciclo.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 shrink-0" />}
                                </div>
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
                          )
                        })()}

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
                              <td className="px-4 py-3">
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

                                  <button
                                    className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                                    onClick={() => iniciarAddMaterial(disc)}>
                                    <Plus className="h-3.5 w-3.5" /> material
                                  </button>
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
                  </div>}
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

      {/* Modal customizado: selecionar material */}
      {matAddingDiscId !== null && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setMatAddingDiscId(null); setDiscMatAtual(null) }}
        >
          {/* Overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          {/* Painel */}
          <div
            style={{ position: 'relative', background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', width: '100%', maxWidth: 460, margin: '0 16px', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: 16, color: '#1e293b' }}>Adicionar material</span>
              <button
                onClick={() => { setMatAddingDiscId(null); setDiscMatAtual(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Conteúdo */}
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {loadingMatDiscId ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
                  <Loader2 style={{ width: 20, height: 20, color: '#94a3b8' }} className="animate-spin" />
                </div>
              ) : matDisponiveis.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', fontSize: 14, padding: '24px 0' }}>Nenhum material disponível</p>
              ) : (
                <>
                  {/* Busca */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', background: '#fff' }}>
                    <Search style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Buscar material…"
                      value={matSearch}
                      onChange={e => setMatSearch(e.target.value)}
                      style={{ flex: 1, fontSize: 14, color: '#334155', outline: 'none', border: 'none', background: 'transparent' }}
                    />
                  </div>
                  {/* Lista */}
                  <ul style={{ overflowY: 'auto', flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, margin: 0, padding: 0, listStyle: 'none' }}>
                    {matDisponiveis
                      .filter(m => m.nome.toLowerCase().includes(matSearch.toLowerCase()))
                      .map(m => (
                        <li key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <button
                            type="button"
                            onClick={() => setMatSelecionado(m.id)}
                            style={{
                              width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                              padding: '10px 12px', fontSize: 14, cursor: 'pointer', border: 'none',
                              background: m.id === matSelecionado ? '#eff6ff' : '#fff',
                              color: m.id === matSelecionado ? '#1d4ed8' : '#334155',
                              fontWeight: m.id === matSelecionado ? 600 : 400,
                            }}
                          >
                            <MaterialIcon tipo={m.tipo} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome}</span>
                          </button>
                        </li>
                      ))}
                    {matDisponiveis.filter(m => m.nome.toLowerCase().includes(matSearch.toLowerCase())).length === 0 && (
                      <li style={{ padding: '10px 12px', fontSize: 14, color: '#94a3b8', fontStyle: 'italic' }}>Nenhum resultado</li>
                    )}
                  </ul>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="outline" onClick={() => { setMatAddingDiscId(null); setDiscMatAtual(null) }}>
                Cancelar
              </Button>
              <Button
                disabled={!matSelecionado || addingMatDiscId !== null}
                onClick={() => { if (discMatAtual) confirmarAddMaterial(discMatAtual) }}
              >
                {addingMatDiscId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Adicionar
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
