'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2, ChevronDown, ChevronRight,
  BookOpen, Plus, CalendarDays, Target, Clock, Copy,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  getProgressoUsuarioPlano,
  upsertProgressoUsuarioDisciplina,
  salvarMetasDiaDisciplina,
  removerDiaExtraCicloUsuario,
  atualizarMetasExtraCicloUsuario,
  copiarDiaCiclo,
} from '@/interface/actions/plano-estudo/progresso-usuario'
import { toast } from 'sonner'

// ─── Helpers de datas ─────────────────────────────────────────────────────────

function getDiasCiclo(dataInicio: Date, dataFim: Date) {
  const dias: { id: string; label: string }[] = []
  const start = new Date(dataInicio)
  const end = new Date(dataFim)
  // Usar UTC noon para evitar bug de timezone: setHours() usa hora local do browser,
  // o que causa desalinhamento entre diaId do cliente e do servidor quando o browser
  // está em timezone diferente de UTC-3 (ex: UTC-4 shifts dataInicio para o dia anterior)
  start.setUTCHours(12, 0, 0, 0)
  end.setUTCHours(12, 0, 0, 0)
  const current = new Date(start)
  let i = 1
  while (current <= end && i <= 7) {
    dias.push({
      id: `dia${i}`,
      label: format(current, "EEE, dd/MM", { locale: ptBR }),
    })
    current.setUTCDate(current.getUTCDate() + 1)
    i++
  }
  return dias
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DisciplinaInfo {
  id: string
  nome: string
  cor: string | null
}

interface DisciplinaSemana {
  id: string
  disciplinaId: string
  minutosPlanejados: number
  questoesPlanejadas: number
  tipoVeiculo: string | null
  materialNome: string | null
  disciplina: DisciplinaInfo
}

interface DisciplinaExtra {
  id: string
  semanaId: string
  disciplinaId: string
  dia: string
  minutosPlanejados: number
  questoesPlanejadas: number
  disciplina: DisciplinaInfo
}

interface SimuladoCiclo {
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
  simuladoDia: string | null
  simuladoHoras: number
  simulado: SimuladoCiclo | null
  disciplinas: DisciplinaSemana[]
}

interface DiaDisciplina {
  id: string
  dia: string
  minutosPlanejados: number
  questoesPlanejadas: number
  horasRealizadas: number
  questoesRealizadas: number
}

interface ProgressoDisciplina {
  id: string
  planoUsuarioId: string
  disciplinaSemanaId: string
  minutosPlanejados: number
  questoesPlanejadas: number
  horasRealizadas: number
  questoesRealizadas: number
  concluida: boolean
  removida: boolean
  diasEstudo: string | null
  observacoes: string | null
  dias: DiaDisciplina[]
}

interface PlanoPool {
  disciplinaId: string
  disciplina: DisciplinaInfo
}

interface PlanoUsuario {
  id: string
  plano: {
    id: string
    nome: string
    descricao: string | null
    dataInicio: Date
    dataFim: Date
    semanas: Ciclo[]
    disciplinasDisponiveis: PlanoPool[]
  }
  progressos: ProgressoDisciplina[]
  disciplinasExtras: DisciplinaExtra[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarTempo(minutos: number): string {
  if (minutos <= 0) return '0min'
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

function parseDias(diasEstudo: string | null | undefined): string[] {
  if (!diasEstudo) return []
  return diasEstudo.split(',').map(d => d.trim()).filter(Boolean)
}

function serializeDias(dias: string[]): string {
  return [...new Set(dias)].join(',')
}

// ─── Modal: editar metas de uma disciplina num dia ────────────────────────────

type MetasTarget =
  | { tipo: 'admin'; disc: DisciplinaSemana; progresso: ProgressoDisciplina | undefined; diaId: string; planoId: string }
  | { tipo: 'extra'; extra: DisciplinaExtra }

function MetasModal({
  target,
  onClose,
  onProgAtualizado,
  onExtraAtualizada,
  onExtraExcluida,
}: {
  target: MetasTarget
  onClose: () => void
  onProgAtualizado: (prog: ProgressoDisciplina) => void
  onExtraAtualizada: (extra: DisciplinaExtra) => void
  onExtraExcluida: (extraId: string) => void
}) {
  const diaRec = target.tipo === 'admin'
    ? target.progresso?.dias?.find(d => d.dia === target.diaId)
    : null

  const [minutos, setMinutos] = useState(
    target.tipo === 'admin'
      ? String(diaRec?.minutosPlanejados ?? target.disc.minutosPlanejados ?? 0)
      : String(target.extra.minutosPlanejados ?? 0)
  )
  const [questoes, setQuestoes] = useState(
    target.tipo === 'admin'
      ? String(diaRec?.questoesPlanejadas ?? target.disc.questoesPlanejadas ?? 0)
      : String(target.extra.questoesPlanejadas ?? 0)
  )
  const [salvando, setSalvando] = useState(false)
  const [removendo, setRemovendo] = useState(false)

  const nome = target.tipo === 'admin' ? target.disc.disciplina.nome : target.extra.disciplina.nome
  const diaLabel = (target.tipo === 'admin' ? target.diaId : target.extra.dia).replace('dia', 'Dia ')

  const handleSalvar = async () => {
    setSalvando(true)
    if (target.tipo === 'admin') {
      const res = await salvarMetasDiaDisciplina({
        planoId: target.planoId,
        disciplinaSemanaId: target.disc.id,
        dia: target.diaId,
        minutosPlanejados: parseInt(minutos) || 0,
        questoesPlanejadas: parseInt(questoes) || 0,
      })
      setSalvando(false)
      if (res.error) toast.error(res.error)
      else if (res.success && res.data) {
        toast.success('Salvo!')
        onProgAtualizado(res.data as ProgressoDisciplina)
        onClose()
      }
    } else {
      const res = await atualizarMetasExtraCicloUsuario({
        extraId: target.extra.id,
        minutosPlanejados: parseInt(minutos) || 0,
        questoesPlanejadas: parseInt(questoes) || 0,
      })
      setSalvando(false)
      if (res.error) toast.error(res.error)
      else if (res.success && res.data) {
        toast.success('Salvo!')
        onExtraAtualizada(res.data as DisciplinaExtra)
        onClose()
      }
    }
  }

  const handleRemover = async () => {
    setRemovendo(true)
    if (target.tipo === 'admin') {
      const novosDias = parseDias(target.progresso?.diasEstudo).filter(d => d !== target.diaId)
      const res = await upsertProgressoUsuarioDisciplina({
        planoId: target.planoId,
        disciplinaSemanaId: target.disc.id,
        diasEstudo: serializeDias(novosDias),
      })
      setRemovendo(false)
      if (res.error) toast.error(res.error)
      else if (res.success && res.data) {
        onProgAtualizado(res.data as ProgressoDisciplina)
        onClose()
      }
    } else {
      const res = await removerDiaExtraCicloUsuario(target.extra.id)
      setRemovendo(false)
      if (res.error) toast.error(res.error)
      else { onExtraExcluida(target.extra.id); onClose() }
    }
  }

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{nome}</DialogTitle>
          <DialogDescription>{diaLabel}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Minutos planejados</label>
            <Input
              type="number"
              min="0"
              step="5"
              value={minutos}
              onChange={e => setMinutos(e.target.value)}
              className="text-center"
              autoFocus
            />
            <div className="flex gap-1 flex-wrap">
              {[30, 45, 60, 90, 120].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMinutos(s => String((parseInt(s) || 0) + v))}
                  className="flex-1 rounded border border-dashed py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                >
                  +{v}m
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMinutos('0')}
                className="rounded border border-dashed px-2 py-1 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
              >
                ✕
              </button>
            </div>
            {parseInt(minutos) > 0 && (
              <p className="text-xs text-muted-foreground text-center">{formatarTempo(parseInt(minutos))}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Questões planejadas</label>
            <Input
              type="number"
              min="0"
              value={questoes}
              onChange={e => setQuestoes(e.target.value)}
              className="text-center"
            />
            <div className="flex gap-1 flex-wrap">
              {[5, 10, 15, 20, 30].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setQuestoes(s => String((parseInt(s) || 0) + v))}
                  className="flex-1 rounded border border-dashed py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                >
                  +{v}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setQuestoes('0')}
                className="rounded border border-dashed px-2 py-1 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
        <DialogFooter className="flex items-center gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
            onClick={handleRemover}
            disabled={removendo || salvando}
          >
            {removendo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remover do dia'}
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} disabled={salvando || removendo}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSalvar} disabled={salvando || removendo}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal: adicionar disciplina a um dia ─────────────────────────────────────

function AdicionarModal({
  diaId,
  diaLabel,
  ciclo,
  planoId,
  progressos,
  onClose,
  onAtualizado,
}: {
  diaId: string
  diaLabel: string
  ciclo: Ciclo
  planoId: string
  progressos: ProgressoDisciplina[]
  onClose: () => void
  onAtualizado: (p: ProgressoDisciplina) => void
}) {
  const [selecionada, setSelecionada] = useState('')
  const [salvando, setSalvando] = useState(false)

  const idsNoDia = ciclo.disciplinas
    .filter(disc => parseDias(progressos.find(p => p.disciplinaSemanaId === disc.id)?.diasEstudo).includes(diaId))
    .map(d => d.disciplinaId)

  const opcoes = ciclo.disciplinas.filter(d => !idsNoDia.includes(d.disciplinaId))

  const handleAdicionar = async () => {
    if (!selecionada) return
    setSalvando(true)
    const prog = progressos.find(p => p.disciplinaSemanaId === selecionada)
    const dias = parseDias(prog?.diasEstudo)
    if (!dias.includes(diaId)) dias.push(diaId)
    const res = await upsertProgressoUsuarioDisciplina({
      planoId,
      disciplinaSemanaId: selecionada,
      diasEstudo: serializeDias(dias),
    })
    setSalvando(false)
    if (res.error) toast.error(res.error)
    else if (res.success && res.data) { onAtualizado(res.data as ProgressoDisciplina); onClose() }
  }

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Adicionar disciplina</DialogTitle>
          <DialogDescription className="capitalize">{diaLabel}</DialogDescription>
        </DialogHeader>
        {opcoes.length > 0 ? (
          <Select value={selecionada} onValueChange={setSelecionada}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a disciplina…" />
            </SelectTrigger>
            <SelectContent>
              {opcoes.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.disciplina.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground py-2 text-center">
            Todas as disciplinas do ciclo já foram adicionadas.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleAdicionar} disabled={!selecionada || salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal: copiar disciplinas de outro dia ───────────────────────────────────

function CopiarDiaModal({
  diaDestino,
  diaDestinoLabel,
  diasComDiscs,
  ciclo,
  planoId,
  onClose,
  onCopiado,
}: {
  diaDestino: string
  diaDestinoLabel: string
  diasComDiscs: { id: string; label: string }[]
  ciclo: Ciclo
  planoId: string
  onClose: () => void
  onCopiado: (progressos: ProgressoDisciplina[], extras: DisciplinaExtra[]) => void
}) {
  const [diaOrigem, setDiaOrigem] = useState('')
  const [copiando, setCopiando] = useState(false)

  const handleCopiar = async () => {
    if (!diaOrigem) return
    setCopiando(true)
    const res = await copiarDiaCiclo({ planoId, semanaId: ciclo.id, diaOrigem, diaDestino })
    setCopiando(false)
    if (res.error) toast.error(res.error)
    else if (res.success && res.data) {
      toast.success('Dia copiado!')
      onCopiado(res.data.progressos as ProgressoDisciplina[], res.data.extras as DisciplinaExtra[])
      onClose()
    }
  }

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Copiar disciplinas</DialogTitle>
          <DialogDescription className="capitalize">Para: {diaDestinoLabel}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Copiar de qual dia?</label>
          <Select value={diaOrigem} onValueChange={setDiaOrigem}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o dia de origem…" />
            </SelectTrigger>
            <SelectContent>
              {diasComDiscs.map(d => (
                <SelectItem key={d.id} value={d.id} className="capitalize">{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleCopiar} disabled={!diaOrigem || copiando}>
            {copiando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Copiar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Card de ciclo com grid de dias ───────────────────────────────────────────

function CicloCard({
  ciclo,
  planoId,
  progressos,
  pool,
  disciplinasExtras,
  onAtualizado,
  onExtraAdicionada,
  onExtraExcluida,
}: {
  ciclo: Ciclo
  planoId: string
  progressos: ProgressoDisciplina[]
  pool: PlanoPool[]
  disciplinasExtras: DisciplinaExtra[]
  onAtualizado: (p: ProgressoDisciplina) => void
  onExtraAdicionada: (extra: DisciplinaExtra) => void
  onExtraExcluida: (extraId: string) => void
}) {
  const [expandido, setExpandido] = useState(false)
  const [metasTarget, setMetasTarget] = useState<MetasTarget | null>(null)
  const [adicionandoDia, setAdicionandoDia] = useState<string | null>(null)
  const [copiandoDia, setCopiandoDia] = useState<string | null>(null)

  const extrasNoCiclo = disciplinasExtras.filter(e => e.semanaId === ciclo.id)
  const dias = getDiasCiclo(ciclo.dataInicio, ciclo.dataFim)
  const idsAdminNoCiclo = ciclo.disciplinas.map(d => d.disciplinaId)

  const diasComDiscs = dias.filter(dia => {
    const temAdmin = ciclo.disciplinas.some(disc =>
      parseDias(progressos.find(p => p.disciplinaSemanaId === disc.id)?.diasEstudo).includes(dia.id)
    )
    const temExtra = extrasNoCiclo.some(e => e.dia === dia.id)
    return temAdmin || temExtra
  })

  const totalMinutos = ciclo.disciplinas.reduce((acc, disc) => {
    const prog = progressos.find(p => p.disciplinaSemanaId === disc.id)
    const diasAtivos = parseDias(prog?.diasEstudo)
    const diasValidos = prog?.dias.filter(d => diasAtivos.includes(d.dia)) ?? []
    const minutos = diasValidos.length > 0
      ? diasValidos.reduce((s, d) => s + d.minutosPlanejados, 0)
      : disc.minutosPlanejados
    return acc + minutos
  }, 0) + extrasNoCiclo.reduce((acc, e) => acc + e.minutosPlanejados, 0)

  const totalQuestoes = ciclo.disciplinas.reduce((acc, disc) => {
    const prog = progressos.find(p => p.disciplinaSemanaId === disc.id)
    const diasAtivos = parseDias(prog?.diasEstudo)
    const diasValidos = prog?.dias.filter(d => diasAtivos.includes(d.dia)) ?? []
    const questoes = diasValidos.length > 0
      ? diasValidos.reduce((s, d) => s + d.questoesPlanejadas, 0)
      : disc.questoesPlanejadas
    return acc + questoes
  }, 0) + extrasNoCiclo.reduce((acc, e) => acc + e.questoesPlanejadas, 0)

  // Per-discipline stats for header badges
  const statsPorDisciplina: { id: string; nome: string; cor: string | null; minutos: number; questoes: number }[] = []

  ciclo.disciplinas.forEach(disc => {
    const prog = progressos.find(p => p.disciplinaSemanaId === disc.id)
    const diasAtivos = parseDias(prog?.diasEstudo)
    const diasValidos = prog?.dias.filter(d => diasAtivos.includes(d.dia)) ?? []
    const minutos = diasValidos.length > 0
      ? diasValidos.reduce((s, d) => s + d.minutosPlanejados, 0)
      : disc.minutosPlanejados
    const questoes = diasValidos.length > 0
      ? diasValidos.reduce((s, d) => s + d.questoesPlanejadas, 0)
      : disc.questoesPlanejadas
    if (minutos > 0 || questoes > 0) {
      statsPorDisciplina.push({ id: disc.disciplinaId, nome: disc.disciplina.nome, cor: disc.disciplina.cor, minutos, questoes })
    }
  })

  // Extras grouped by disciplinaId
  const extrasAgrupadas = new Map<string, { nome: string; cor: string | null; minutos: number; questoes: number }>()
  extrasNoCiclo.forEach(e => {
    const entry = extrasAgrupadas.get(e.disciplinaId)
    if (entry) {
      entry.minutos += e.minutosPlanejados
      entry.questoes += e.questoesPlanejadas
    } else {
      extrasAgrupadas.set(e.disciplinaId, {
        nome: e.disciplina.nome,
        cor: e.disciplina.cor,
        minutos: e.minutosPlanejados,
        questoes: e.questoesPlanejadas,
      })
    }
  })
  extrasAgrupadas.forEach((val, discId) => {
    if (!statsPorDisciplina.some(s => s.id === discId)) {
      statsPorDisciplina.push({ id: discId, ...val })
    } else {
      const existing = statsPorDisciplina.find(s => s.id === discId)!
      existing.minutos += val.minutos
      existing.questoes += val.questoes
    }
  })

  return (
    <Card>
      <CardHeader className="cursor-pointer select-none pb-3" onClick={() => setExpandido(e => !e)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 pointer-events-none">
              {expandido ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <div>
              <CardTitle className="text-base">Ciclo {ciclo.numeroSemana}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(ciclo.dataInicio), 'dd/MM/yy', { locale: ptBR })}
                {' – '}
                {format(new Date(ciclo.dataFim), 'dd/MM/yy', { locale: ptBR })}
                {ciclo.observacoes && ` · ${ciclo.observacoes}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs gap-1">
              <BookOpen className="h-3 w-3" />
              {ciclo.disciplinas.length} disciplina{ciclo.disciplinas.length !== 1 ? 's' : ''}
            </Badge>
            {totalMinutos > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                {formatarTempo(totalMinutos)}
              </Badge>
            )}
            {totalQuestoes > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Target className="h-3 w-3" />
                {totalQuestoes}q
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {expandido && (
        <CardContent className="pt-0">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${dias.length}, minmax(0, 1fr))` }}
          >
            {dias.map(dia => {
              const discNoDia = ciclo.disciplinas.filter(disc => {
                const prog = progressos.find(p => p.disciplinaSemanaId === disc.id)
                return parseDias(prog?.diasEstudo).includes(dia.id)
              })
              const extrasNoDia = extrasNoCiclo.filter(e => e.dia === dia.id)
              const idsNoDia = discNoDia.map(d => d.disciplinaId)

              const temOpcoes = ciclo.disciplinas.some(d => !idsNoDia.includes(d.disciplinaId))

              const isDiaVazio = discNoDia.length === 0 && extrasNoDia.length === 0
              const diasParaCopiar = diasComDiscs.filter(d => d.id !== dia.id)

              return (
                <div key={dia.id} className="flex flex-col gap-1.5 min-w-0">
                  {/* Cabeçalho do dia */}
                  <div className="rounded-md bg-muted/60 px-1.5 py-1.5 text-center">
                    <p className="text-[11px] font-semibold capitalize leading-tight truncate">{dia.label}</p>
                  </div>

                  {/* Badges de disciplinas do admin */}
                  {discNoDia.map(disc => {
                    const prog = progressos.find(p => p.disciplinaSemanaId === disc.id)
                    const diaRec = prog?.dias?.find(d => d.dia === dia.id)
                    const horas = diaRec?.minutosPlanejados ?? disc.minutosPlanejados ?? 0
                    const questoes = diaRec?.questoesPlanejadas ?? disc.questoesPlanejadas ?? 0
                    const cor = disc.disciplina.cor || '#3b82f6'

                    return (
                      <button
                        key={disc.id}
                        onClick={() => setMetasTarget({ tipo: 'admin', disc, progresso: prog, diaId: dia.id, planoId })}
                        className="w-full rounded-md border text-left px-2 py-1.5 transition-colors min-w-0"
                        style={{ backgroundColor: cor + '30', borderColor: cor + '80' }}
                      >
                        <p className="text-[11px] font-medium leading-tight truncate text-center">{disc.disciplina.nome}</p>
                        <p className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{formatarTempo(horas)}</span>
                          <span className="flex items-center gap-0.5"><Target className="h-2.5 w-2.5" />{questoes}q</span>
                        </p>
                      </button>
                    )
                  })}

                  {/* Badge do simulado — aparece no dia definido pelo admin */}
                  {ciclo.simulado && ciclo.simuladoDia === dia.id && (
                    <div
                      className="w-full rounded-md border text-left px-2 py-1.5 min-w-0"
                      style={{ backgroundColor: '#f59e0b22', borderColor: '#f59e0b80' }}
                    >
                      <p className="text-[11px] font-medium leading-tight truncate text-center text-amber-800">
                        {ciclo.simulado.nome}
                      </p>
                      <p className="flex items-center justify-center gap-2 text-[10px] text-amber-700 mt-0.5">
                        <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{ciclo.simuladoHoras}h</span>
                        {ciclo.simulado.config && <span className="flex items-center gap-0.5"><Target className="h-2.5 w-2.5" />{ciclo.simulado.config.totalQuestoes}q</span>}
                      </p>
                    </div>
                  )}

                  {/* Badges de disciplinas extras (pool) */}
                  {extrasNoDia.map(extra => {
                    const cor = extra.disciplina.cor || '#3b82f6'
                    return (
                      <button
                        key={extra.id}
                        onClick={() => setMetasTarget({ tipo: 'extra', extra })}
                        className="w-full rounded-md border text-left px-2 py-1.5 transition-colors min-w-0"
                        style={{ backgroundColor: cor + '30', borderColor: cor + '80' }}
                      >
                        <p className="text-[11px] font-medium leading-tight truncate text-center">{extra.disciplina.nome}</p>
                        <p className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{formatarTempo(extra.minutosPlanejados)}</span>
                          <span className="flex items-center gap-0.5"><Target className="h-2.5 w-2.5" />{extra.questoesPlanejadas}q</span>
                        </p>
                      </button>
                    )
                  })}

                  {/* Botões de ação */}
                  <div className="flex gap-1 mt-auto">
                    {temOpcoes && (
                      <button
                        onClick={() => setAdicionandoDia(dia.id)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-md border border-dashed py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                    )}
                    {isDiaVazio && diasParaCopiar.length > 0 && (
                      <button
                        onClick={() => setCopiandoDia(dia.id)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-md border border-dashed py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                        Copiar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      )}

      {/* Resumo por disciplina */}
      {statsPorDisciplina.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {statsPorDisciplina.map(disc => (
            <span
              key={disc.id}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: disc.cor ? disc.cor + '22' : undefined,
                borderColor: disc.cor ? disc.cor + '66' : undefined,
              }}
            >
              {disc.cor && (
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: disc.cor }} />
              )}
              <span className="max-w-[120px] truncate">{disc.nome}</span>
              {disc.minutos > 0 && <span className="text-muted-foreground">{formatarTempo(disc.minutos)}</span>}
              {disc.questoes > 0 && <span className="text-muted-foreground">{disc.questoes}q</span>}
            </span>
          ))}
        </div>
      )}

      {/* Modais */}
      {metasTarget && (
        <MetasModal
          target={metasTarget}
          onClose={() => setMetasTarget(null)}
          onProgAtualizado={onAtualizado}
          onExtraAtualizada={onExtraAdicionada}
          onExtraExcluida={onExtraExcluida}
        />
      )}
      {adicionandoDia && (
        <AdicionarModal
          diaId={adicionandoDia}
          diaLabel={dias.find(d => d.id === adicionandoDia)?.label ?? adicionandoDia}
          ciclo={ciclo}
          planoId={planoId}
          progressos={progressos}
          onClose={() => setAdicionandoDia(null)}
          onAtualizado={onAtualizado}
        />
      )}
      {copiandoDia && (
        <CopiarDiaModal
          diaDestino={copiandoDia}
          diaDestinoLabel={dias.find(d => d.id === copiandoDia)?.label ?? copiandoDia}
          diasComDiscs={diasComDiscs.filter(d => d.id !== copiandoDia)}
          ciclo={ciclo}
          planoId={planoId}
          onClose={() => setCopiandoDia(null)}
          onCopiado={(progs, extras) => {
            progs.forEach(p => onAtualizado(p))
            extras.forEach(e => onExtraAdicionada(e))
          }}
        />
      )}
    </Card>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function DetalhePlanoCompartilhado({ planoId }: { planoId: string }) {
  const [planoUsuario, setPlanoUsuario] = useState<PlanoUsuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    getProgressoUsuarioPlano(planoId).then(res => {
      setCarregando(false)
      if (res.success && res.data) setPlanoUsuario(res.data as PlanoUsuario)
    }).catch(() => {
      setCarregando(false)
    })
  }, [planoId])

  const handleAtualizado = (prog: ProgressoDisciplina) => {
    setPlanoUsuario(prev => {
      if (!prev) return prev
      const outros = prev.progressos.filter(p => p.disciplinaSemanaId !== prog.disciplinaSemanaId)
      return { ...prev, progressos: [...outros, prog] }
    })
  }

  const handleExtraAdicionada = (extra: DisciplinaExtra) => {
    setPlanoUsuario(prev => {
      if (!prev) return prev
      const existe = prev.disciplinasExtras.some(e => e.id === extra.id)
      if (existe) {
        return { ...prev, disciplinasExtras: prev.disciplinasExtras.map(e => e.id === extra.id ? extra : e) }
      }
      return { ...prev, disciplinasExtras: [...prev.disciplinasExtras, extra] }
    })
  }

  const handleRemoverExtraEstado = (extraId: string) => {
    setPlanoUsuario(prev => prev
      ? { ...prev, disciplinasExtras: prev.disciplinasExtras.filter(e => e.id !== extraId) }
      : prev
    )
  }

  if (carregando) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!planoUsuario) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Plano não encontrado ou você não tem acesso.
      </div>
    )
  }

  const plano = planoUsuario.plano
  const pool = plano.disciplinasDisponiveis ?? []
  const totalDisc = plano.semanas.reduce((acc, s) => acc + s.disciplinas.length, 0)
  const agendadas = planoUsuario.progressos.filter(p => parseDias(p.diasEstudo).length > 0).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-bold">{plano.nome}</h2>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Atribuído</Badge>
              </div>
              {plano.descricao && <p className="text-sm text-muted-foreground mb-2">{plano.descricao}</p>}
              <p className="text-sm text-muted-foreground">
                {format(new Date(plano.dataInicio), 'dd/MM/yyyy', { locale: ptBR })}
                {' – '}
                {format(new Date(plano.dataFim), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end">
                <Target className="h-4 w-4" />
                <span>{agendadas}/{totalDisc} agendadas</span>
              </div>
              {totalDisc > 0 && (
                <Progress value={Math.round((agendadas / totalDisc) * 100)} className="h-2 w-32 mt-1" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ciclos */}
      {plano.semanas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg bg-card">
          Este plano ainda não tem ciclos definidos.
        </div>
      ) : (
        plano.semanas.map(ciclo => (
          <CicloCard
            key={ciclo.id}
            ciclo={ciclo}
            planoId={planoId}
            progressos={planoUsuario.progressos}
            pool={pool}
            disciplinasExtras={planoUsuario.disciplinasExtras}
            onAtualizado={handleAtualizado}
            onExtraAdicionada={handleExtraAdicionada}
            onExtraExcluida={handleRemoverExtraEstado}
          />
        ))
      )}
    </div>
  )
}
