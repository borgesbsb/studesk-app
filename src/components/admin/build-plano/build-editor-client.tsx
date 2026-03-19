'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft, Plus, Trash2, Wand2, Loader2, ChevronDown, ChevronUp, Save
} from 'lucide-react'
import {
  adicionarDisciplina,
  atualizarDisciplina,
  excluirDisciplina,
  gerarComIA,
} from '@/interface/actions/admin/build-plano'
import { toast } from 'sonner'

interface Assunto {
  id: string
  buildPlanoDisciplinaId: string
  nome: string
  ciclo: number
  ordem: number
}

interface Disciplina {
  id: string
  buildPlanoId: string
  nome: string
  tipo: 'P1' | 'P2'
  conteudoEdital: string | null
  cargaHoraria: number | null
  cor: string | null
  disciplinaId: string | null
  disciplina: { id: string; nome: string; cor: string | null } | null
  assuntos: Assunto[]
}

interface Build {
  id: string
  nome: string
  descricao: string | null
  numeroCiclos: number
  status: string
  disciplinas: Disciplina[]
}

interface DisciplinaDisponivel {
  id: string
  nome: string
  cor: string | null
}

interface Props {
  build: Build
  disciplinasDisponiveis: DisciplinaDisponivel[]
}

const TIPO_OPTIONS = ['P1', 'P2'] as const

export function BuildEditorClient({ build: buildInicial, disciplinasDisponiveis }: Props) {
  const router = useRouter()
  const [build, setBuild] = useState<Build>(buildInicial)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [gerando, setGerando] = useState(false)

  // Form nova disciplina
  const [mostrarFormDisc, setMostrarFormDisc] = useState(false)
  const [novaDisc, setNovaDisc] = useState({
    nome: '', tipo: 'P1' as 'P1' | 'P2', conteudoEdital: '', cargaHoraria: 0, cor: '', disciplinaId: '',
  })
  const [salvandoDisc, setSalvandoDisc] = useState(false)

  const handleAdicionarDisc = async () => {
    if (!novaDisc.nome.trim()) return
    setSalvandoDisc(true)
    const res = await adicionarDisciplina({
      buildPlanoId: build.id,
      nome: novaDisc.nome,
      tipo: novaDisc.tipo,
      cargaHoraria: novaDisc.cargaHoraria || undefined,
      cor: novaDisc.cor || undefined,
      disciplinaId: novaDisc.disciplinaId || undefined,
    })
    setSalvandoDisc(false)
    if (res.error) { toast.error(res.error); return }
    toast.success('Disciplina adicionada')
    setBuild(prev => ({ ...prev, disciplinas: [...prev.disciplinas, res.data as any] }))
    setNovaDisc({ nome: '', tipo: 'P1', conteudoEdital: '', cargaHoraria: 0, cor: '', disciplinaId: '' })
    setMostrarFormDisc(false)
  }

  const handleExcluirDisc = async (discId: string) => {
    if (!confirm('Remover disciplina?')) return
    const res = await excluirDisciplina(discId, build.id)
    if (res.error) { toast.error(res.error); return }
    setBuild(prev => ({ ...prev, disciplinas: prev.disciplinas.filter(d => d.id !== discId) }))
    toast.success('Disciplina removida')
  }

  const handleSalvarEdital = async (disc: Disciplina, conteudo: string) => {
    const res = await atualizarDisciplina(disc.id, build.id, { conteudoEdital: conteudo })
    if (res.error) { toast.error(res.error); return }
    setBuild(prev => ({
      ...prev,
      disciplinas: prev.disciplinas.map(d => d.id === disc.id ? { ...d, conteudoEdital: conteudo } : d),
    }))
    toast.success('Salvo')
  }

  const handleGerarComIA = async () => {
    if (!confirm('Gerar distribuição de assuntos com IA?')) return
    setGerando(true)
    try {
      const res = await gerarComIA(build.id)
      if (res.error) { toast.error(res.error); return }
      toast.success(`${res.count} assuntos gerados via ${res.modelo}`)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar com IA')
    } finally {
      setGerando(false)
    }
  }

  const assuntosPorCiclo = (disc: Disciplina) => {
    const mapa: Record<number, Assunto[]> = {}
    for (const a of disc.assuntos) {
      if (!mapa[a.ciclo]) mapa[a.ciclo] = []
      mapa[a.ciclo].push(a)
    }
    return mapa
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/build-plano">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-slate-600" />
            <h1 className="text-2xl font-bold text-slate-800">{build.nome}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 ml-2">
              {build.numeroCiclos} ciclos · {build.status}
            </span>
          </div>
          {build.descricao && <p className="text-slate-500 text-sm mt-0.5">{build.descricao}</p>}
        </div>
        <Button onClick={handleGerarComIA} disabled={gerando} className="bg-orange-500 hover:bg-orange-600">
          {gerando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
          {gerando ? 'Gerando...' : 'Gerar com IA'}
        </Button>
      </div>

      {/* Lista de disciplinas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">
            Disciplinas ({build.disciplinas.length})
          </h2>
          <Button size="sm" variant="outline" onClick={() => setMostrarFormDisc(v => !v)}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {/* Form nova disciplina */}
        {mostrarFormDisc && (
          <Card className="border-orange-200 bg-orange-50/40">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm text-orange-700">Nova Disciplina</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome *</Label>
                  <Input
                    placeholder="Ex: Direito Constitucional"
                    value={novaDisc.nome}
                    onChange={e => setNovaDisc(p => ({ ...p, nome: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo *</Label>
                  <select
                    className="w-full h-9 border rounded-md px-3 text-sm bg-white"
                    value={novaDisc.tipo}
                    onChange={e => setNovaDisc(p => ({ ...p, tipo: e.target.value as 'P1' | 'P2' }))}
                  >
                    {TIPO_OPTIONS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Carga Horária (h)</Label>
                  <Input
                    type="number" min={0}
                    value={novaDisc.cargaHoraria}
                    onChange={e => setNovaDisc(p => ({ ...p, cargaHoraria: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vincular disciplina do sistema</Label>
                  <select
                    className="w-full h-9 border rounded-md px-3 text-sm bg-white"
                    value={novaDisc.disciplinaId}
                    onChange={e => setNovaDisc(p => ({ ...p, disciplinaId: e.target.value }))}
                  >
                    <option value="">— Nenhuma —</option>
                    {disciplinasDisponiveis.map(d => (
                      <option key={d.id} value={d.id}>{d.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleAdicionarDisc} disabled={salvandoDisc}>
                  {salvandoDisc && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMostrarFormDisc(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {build.disciplinas.length === 0 && !mostrarFormDisc && (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm">
            Nenhuma disciplina. Adicione pelo menos uma para poder gerar com IA.
          </div>
        )}

        {build.disciplinas.map(disc => (
          <DisciplinaCard
            key={disc.id}
            disc={disc}
            buildId={build.id}
            expandido={expandido === disc.id}
            onToggle={() => setExpandido(prev => prev === disc.id ? null : disc.id)}
            onExcluir={handleExcluirDisc}
            onSalvarEdital={handleSalvarEdital}
            assuntosPorCiclo={assuntosPorCiclo(disc)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Subcomponente por disciplina ─────────────────────────────────────────────

interface DisciplinaCardProps {
  disc: Disciplina
  buildId: string
  expandido: boolean
  onToggle: () => void
  onExcluir: (id: string) => void
  onSalvarEdital: (disc: Disciplina, conteudo: string) => void
  assuntosPorCiclo: Record<number, Assunto[]>
}

function DisciplinaCard({ disc, expandido, onToggle, onExcluir, onSalvarEdital, assuntosPorCiclo }: DisciplinaCardProps) {
  const [edital, setEdital] = useState(disc.conteudoEdital || '')
  const [salvando, setSalvando] = useState(false)

  const totalAssuntos = disc.assuntos.length
  const ciclos = Object.keys(assuntosPorCiclo).map(Number).sort((a, b) => a - b)

  const handleSalvar = async () => {
    setSalvando(true)
    await onSalvarEdital(disc, edital)
    setSalvando(false)
  }

  return (
    <Card className="border-slate-200">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${disc.tipo === 'P1' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
            {disc.tipo}
          </span>
          <span className="font-medium text-sm text-slate-800">{disc.nome}</span>
          {disc.cargaHoraria ? (
            <span className="text-xs text-slate-400">{disc.cargaHoraria}h</span>
          ) : null}
          {totalAssuntos > 0 && (
            <span className="text-xs text-slate-400">{totalAssuntos} assuntos</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); onExcluir(disc.id) }}
            className="p-1 text-slate-400 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {expandido ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </div>

      {expandido && (
        <CardContent className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-4">
          {/* Conteúdo do edital */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Conteúdo do Edital</Label>
            <Textarea
              rows={5}
              placeholder="Cole aqui o conteúdo do edital para esta disciplina..."
              value={edital}
              onChange={e => setEdital(e.target.value)}
              className="text-xs"
            />
            <Button size="sm" variant="outline" onClick={handleSalvar} disabled={salvando}>
              {salvando ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
              Salvar edital
            </Button>
          </div>

          {/* Assuntos por ciclo */}
          {ciclos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Assuntos gerados
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ciclos.map(ciclo => (
                  <div key={ciclo} className="bg-slate-50 rounded-lg p-2.5">
                    <p className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Ciclo {ciclo}</p>
                    <ul className="space-y-0.5">
                      {assuntosPorCiclo[ciclo].map(a => (
                        <li key={a.id} className="text-[11px] text-slate-700 leading-snug">• {a.nome}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
