"use client"

import { useState, useEffect, Fragment } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  Settings2,
} from "lucide-react"
import {
  listarConfigs,
  criarConfig,
  atualizarConfig,
  deletarConfig,
  listarSimuladosAdmin,
  criarSimuladoAdmin,
  atualizarSimuladoAdmin,
  deletarSimuladoAdmin,
} from "@/interface/actions/simulado/config-admin"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Disciplina {
  id: string
  nome: string
}

interface ConfigDisciplinaInput {
  disciplinaId: string
  totalQuestoes: number
}

interface Config {
  id: string
  nome: string
  totalQuestoes: number
  ativo: boolean
  disciplinas: {
    id: string
    disciplinaId: string
    totalQuestoes: number
    disciplina: { id: string; nome: string }
  }[]
}

interface SimuladoAdmin {
  id: string
  nome: string
  dataRealizacao: Date
  ativo: boolean
  config: { id: string; nome: string; totalQuestoes: number } | null
  _count: { resultados: number }
}

async function getDisciplinas(): Promise<Disciplina[]> {
  const res = await fetch('/api/admin/disciplinas')
  if (!res.ok) return []
  return res.json()
}

// ─── Seção: ConfigSimulado ────────────────────────────────────────────────────

function ConfigSimuladoSection() {
  const [configs, setConfigs] = useState<Config[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const [openModal, setOpenModal] = useState(false)
  const [nomeCfg, setNomeCfg] = useState("")
  const [totalQstCfg, setTotalQstCfg] = useState(80)
  const [linhas, setLinhas] = useState<ConfigDisciplinaInput[]>([])
  const [salvando, setSalvando] = useState(false)

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)

  useEffect(() => {
    carregarTudo()
  }, [])

  const carregarTudo = async () => {
    setLoading(true)
    const [cfgRes, discs] = await Promise.all([listarConfigs(), getDisciplinas()])
    if (cfgRes.success && cfgRes.data) setConfigs(cfgRes.data as Config[])
    setDisciplinas(discs)
    setLoading(false)
  }

  const adicionarLinha = () => setLinhas([...linhas, { disciplinaId: "", totalQuestoes: 0 }])
  const removerLinha = (i: number) => setLinhas(linhas.filter((_, idx) => idx !== i))
  const atualizarLinha = (i: number, field: keyof ConfigDisciplinaInput, value: string | number) => {
    const novas = [...linhas]
    novas[i] = { ...novas[i], [field]: value }
    setLinhas(novas)
  }

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    const validas = linhas.filter(l => l.disciplinaId && l.totalQuestoes > 0)
    if (!nomeCfg.trim() || validas.length === 0) return

    setSalvando(true)
    const res = await criarConfig({ nome: nomeCfg.trim(), totalQuestoes: totalQstCfg, disciplinas: validas })
    setSalvando(false)

    if (res.success) {
      setOpenModal(false)
      setNomeCfg("")
      setTotalQstCfg(80)
      setLinhas([])
      carregarTudo()
    }
  }

  const toggleAtivo = async (cfg: Config) => {
    setTogglingId(cfg.id)
    await atualizarConfig(cfg.id, { ativo: !cfg.ativo })
    setTogglingId(null)
    carregarTudo()
  }

  const handleDeletar = async (id: string, nome: string) => {
    if (!confirm(`Deletar a configuração "${nome}"?\n\nIsso não afeta simulados já registrados.`)) return
    setDeletandoId(id)
    await deletarConfig(id)
    setDeletandoId(null)
    carregarTudo()
  }

  const toggleRow = (id: string) => {
    const s = new Set(expandedRows)
    s.has(id) ? s.delete(id) : s.add(id)
    setExpandedRows(s)
  }

  const somaLinhas = linhas.reduce((s, l) => s + (l.totalQuestoes || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-slate-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Configurações de Simulado</h2>
            <p className="text-slate-500 text-sm">Templates com distribuição de questões por disciplina</p>
          </div>
        </div>
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button onClick={() => { setLinhas([{ disciplinaId: "", totalQuestoes: 0 }]) }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Configuração
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCriar}>
              <DialogHeader>
                <DialogTitle>Nova Configuração de Simulado</DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 grid gap-2">
                    <Label>Nome *</Label>
                    <Input
                      value={nomeCfg}
                      onChange={(e) => setNomeCfg(e.target.value)}
                      placeholder="Ex: Auditor ISS JP – 23º Ciclo"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Total de Questões</Label>
                    <Input
                      type="number"
                      min="1"
                      value={totalQstCfg}
                      onChange={(e) => setTotalQstCfg(parseInt(e.target.value) || 80)}
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <p className="text-sm text-slate-500">
                      Soma configurada: <strong>{somaLinhas}</strong>
                      {somaLinhas !== totalQstCfg && somaLinhas > 0 && (
                        <span className="text-yellow-600 ml-1">(≠ {totalQstCfg})</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Disciplinas e Questões *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={adicionarLinha}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar
                    </Button>
                  </div>

                  {linhas.map((linha, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        className="flex-1 border rounded-md px-3 h-9 text-sm bg-background"
                        value={linha.disciplinaId}
                        onChange={(e) => atualizarLinha(i, 'disciplinaId', e.target.value)}
                        required
                      >
                        <option value="">Selecione a disciplina</option>
                        {disciplinas.map(d => (
                          <option key={d.id} value={d.id}>{d.nome}</option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min="1"
                        className="w-20 text-center"
                        placeholder="Qtd"
                        value={linha.totalQuestoes || ''}
                        onChange={(e) => atualizarLinha(i, 'totalQuestoes', parseInt(e.target.value) || 0)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => removerLinha(i)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={salvando}>
                  {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Configuração
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border rounded-lg bg-white">
          Nenhuma configuração cadastrada. Crie a primeira!
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-10" />
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold text-center">Total Questões</TableHead>
                <TableHead className="font-semibold text-center">Disciplinas</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map(cfg => (
                <Fragment key={cfg.id}>
                  <TableRow className="hover:bg-slate-50 cursor-pointer" onClick={() => toggleRow(cfg.id)}>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        {expandedRows.has(cfg.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{cfg.nome}</TableCell>
                    <TableCell className="text-center">{cfg.totalQuestoes}</TableCell>
                    <TableCell className="text-center">{cfg.disciplinas.length}</TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAtivo(cfg)}
                        disabled={togglingId === cfg.id}
                        className="gap-1.5"
                      >
                        {togglingId === cfg.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : cfg.ativo ? (
                          <><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-green-600 text-xs">Ativo</span></>
                        ) : (
                          <><XCircle className="h-4 w-4 text-slate-400" /><span className="text-slate-400 text-xs">Inativo</span></>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        onClick={() => handleDeletar(cfg.id, cfg.nome)}
                        disabled={deletandoId === cfg.id}
                      >
                        {deletandoId === cfg.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>

                  {expandedRows.has(cfg.id) && (
                    <TableRow key={`${cfg.id}-disc`}>
                      <TableCell colSpan={6} className="bg-slate-50 p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {cfg.disciplinas.map(d => (
                            <div key={d.id} className="flex items-center justify-between bg-white rounded border px-3 py-1.5 text-sm">
                              <span className="truncate text-slate-700">{d.disciplina.nome}</span>
                              <span className="ml-2 font-semibold text-slate-900 flex-shrink-0">{d.totalQuestoes}q</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ─── Seção: Simulados (eventos) ───────────────────────────────────────────────

function SimuladosEventosSection() {
  const [simulados, setSimulados] = useState<SimuladoAdmin[]>([])
  const [configs, setConfigs] = useState<{ id: string; nome: string }[]>([])
  const [loading, setLoading] = useState(true)

  const [openModal, setOpenModal] = useState(false)
  const [nome, setNome] = useState("")
  const [dataRealizacao, setDataRealizacao] = useState("")
  const [configId, setConfigId] = useState("")
  const [salvando, setSalvando] = useState(false)

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)

  useEffect(() => {
    carregarTudo()
  }, [])

  const carregarTudo = async () => {
    setLoading(true)
    const [simRes, cfgRes] = await Promise.all([
      listarSimuladosAdmin(),
      listarConfigs()
    ])
    if (simRes.success && simRes.data) setSimulados(simRes.data as SimuladoAdmin[])
    if (cfgRes.success && cfgRes.data) setConfigs(cfgRes.data.map(c => ({ id: c.id, nome: c.nome })))
    setLoading(false)
  }

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !dataRealizacao) return

    setSalvando(true)
    const res = await criarSimuladoAdmin({
      nome: nome.trim(),
      dataRealizacao: new Date(dataRealizacao),
      configSimuladoId: configId || undefined
    })
    setSalvando(false)

    if (res.success) {
      setOpenModal(false)
      setNome("")
      setDataRealizacao("")
      setConfigId("")
      carregarTudo()
    }
  }

  const toggleAtivo = async (s: SimuladoAdmin) => {
    setTogglingId(s.id)
    await atualizarSimuladoAdmin(s.id, { ativo: !s.ativo })
    setTogglingId(null)
    carregarTudo()
  }

  const handleDeletar = async (id: string, nome: string) => {
    if (!confirm(`Deletar o simulado "${nome}"?\n\nTodos os resultados dos usuários também serão deletados.`)) return
    setDeletandoId(id)
    await deletarSimuladoAdmin(id)
    setDeletandoId(null)
    carregarTudo()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-slate-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Simulados</h2>
            <p className="text-slate-500 text-sm">Eventos disponíveis para os usuários registrarem acertos</p>
          </div>
        </div>
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Simulado
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[425px]">
            <form onSubmit={handleCriar}>
              <DialogHeader>
                <DialogTitle>Novo Simulado</DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="grid gap-2">
                  <Label>Nome *</Label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: 24º Simulado – Janeiro/2026"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Data de Realização *</Label>
                  <Input
                    type="date"
                    value={dataRealizacao}
                    onChange={(e) => setDataRealizacao(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Configuração (opcional)</Label>
                  <select
                    className="border rounded-md px-3 h-9 text-sm bg-background"
                    value={configId}
                    onChange={(e) => setConfigId(e.target.value)}
                  >
                    <option value="">Sem configuração específica</option>
                    {configs.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={salvando}>
                  {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Simulado
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : simulados.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border rounded-lg bg-white">
          Nenhum simulado criado. Crie o primeiro!
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold text-center">Data</TableHead>
                <TableHead className="font-semibold">Configuração</TableHead>
                <TableHead className="font-semibold text-center">Participantes</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {simulados.map(s => (
                <TableRow key={s.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">{s.nome}</TableCell>
                  <TableCell className="text-center text-sm">
                    {format(new Date(s.dataRealizacao), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {s.config?.nome ?? <span className="text-slate-400 italic">Sem configuração</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">{s._count.resultados}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAtivo(s)}
                      disabled={togglingId === s.id}
                      className="gap-1.5"
                    >
                      {togglingId === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : s.ativo ? (
                        <><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-green-600 text-xs">Ativo</span></>
                      ) : (
                        <><XCircle className="h-4 w-4 text-slate-400" /><span className="text-slate-400 text-xs">Inativo</span></>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                      onClick={() => handleDeletar(s.id, s.nome)}
                      disabled={deletandoId === s.id}
                    >
                      {deletandoId === s.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function AdminSimuladosPage() {
  return (
    <div className="p-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Gerenciar Simulados</h1>
        <p className="text-slate-500 text-sm mt-1">
          Configure os templates de disciplinas e crie os eventos de simulado para os usuários.
        </p>
      </div>

      <SimuladosEventosSection />

      <hr className="border-slate-200" />

      <ConfigSimuladoSection />
    </div>
  )
}
