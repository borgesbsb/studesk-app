'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2, ChevronDown, ChevronRight,
  BookOpen, Plus, X, CalendarDays, Target, Save,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  getProgressoUsuarioPlano,
  upsertProgressoUsuarioDisciplina,
  adicionarDisciplinaCicloUsuario,
  removerDisciplinaExtraCicloUsuario,
  removerDiaExtraCicloUsuario,
  atualizarMetasExtraCicloUsuario,
} from '@/interface/actions/plano-estudo/progresso-usuario'
import { toast } from 'sonner'

// ─── Helpers de datas ─────────────────────────────────────────────────────────

function getDiasCiclo(dataInicio: Date, dataFim: Date) {
  const dias: { id: string; label: string }[] = []
  const start = new Date(dataInicio)
  const end = new Date(dataFim)
  // Normaliza para meia-noite UTC para evitar problemas de fuso
  start.setHours(12, 0, 0, 0)
  end.setHours(12, 0, 0, 0)
  const current = new Date(start)
  let i = 1
  while (current <= end && i <= 7) {
    dias.push({
      id: `dia${i}`,
      label: format(current, "EEEE, dd/MM", { locale: ptBR }),
    })
    current.setDate(current.getDate() + 1)
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
  horasPlanejadas: number
  questoesPlanejadas: number
  tipoVeiculo: string | null
  materialNome: string | null
  disciplina: DisciplinaInfo
}

interface DisciplinaExtra {
  id: string
  semanaId: string
  disciplinaId: string
  diasEstudo: string | null
  horasPlanejadas: number
  questoesPlanejadas: number
  disciplina: DisciplinaInfo
}

interface Ciclo {
  id: string
  numeroSemana: number
  dataInicio: Date
  dataFim: Date
  observacoes: string | null
  disciplinas: DisciplinaSemana[]
}

interface ProgressoDisciplina {
  id: string
  planoUsuarioId: string
  disciplinaSemanaId: string
  horasPlanejadas: number
  questoesPlanejadas: number
  horasRealizadas: number
  questoesRealizadas: number
  concluida: boolean
  removida: boolean
  diasEstudo: string | null
  observacoes: string | null
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

function parseDias(diasEstudo: string | null | undefined): string[] {
  if (!diasEstudo) return []
  return diasEstudo.split(',').map(d => d.trim()).filter(Boolean)
}

function serializeDias(dias: string[]): string {
  return [...new Set(dias)].join(',')
}

// ─── Linha da tabela ──────────────────────────────────────────────────────────

function DisciplinaRow({
  disc,
  diaId,
  planoId,
  progresso,
  onAtualizado,
}: {
  disc: DisciplinaSemana
  diaId: string
  planoId: string
  progresso: ProgressoDisciplina | undefined
  onAtualizado: (p: ProgressoDisciplina) => void
}) {
  const [horas, setHoras] = useState(String(progresso?.horasPlanejadas ?? disc.horasPlanejadas ?? 0))
  const [questoes, setQuestoes] = useState(String(progresso?.questoesPlanejadas ?? disc.questoesPlanejadas ?? 0))
  const [salvando, setSalvando] = useState(false)
  const [removendo, setRemovendo] = useState(false)

  const handleSalvar = async () => {
    setSalvando(true)
    const res = await upsertProgressoUsuarioDisciplina({
      planoId,
      disciplinaSemanaId: disc.id,
      horasPlanejadas: parseInt(horas) || 0,
      questoesPlanejadas: parseInt(questoes) || 0,
    })
    setSalvando(false)
    if (res.error) toast.error(res.error)
    else if (res.success && res.data) {
      toast.success('Salvo!')
      onAtualizado(res.data as ProgressoDisciplina)
    }
  }

  const handleRemover = async () => {
    setRemovendo(true)
    const novosDias = parseDias(progresso?.diasEstudo).filter(d => d !== diaId)
    const res = await upsertProgressoUsuarioDisciplina({
      planoId,
      disciplinaSemanaId: disc.id,
      diasEstudo: serializeDias(novosDias),
    })
    setRemovendo(false)
    if (res.error) toast.error(res.error)
    else if (res.success && res.data) onAtualizado(res.data as ProgressoDisciplina)
  }

  const cor = disc.disciplina.cor || '#3b82f6'

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
          <span className="font-medium text-sm">{disc.disciplina.nome}</span>
          {disc.materialNome && (
            <span className="text-xs text-muted-foreground truncate">{disc.materialNome}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="w-36">
        <Input
          type="number"
          min="0"
          value={horas}
          onChange={e => setHoras(e.target.value)}
          className="h-8 text-center"
        />
      </TableCell>
      <TableCell className="w-36">
        <Input
          type="number"
          min="0"
          value={questoes}
          onChange={e => setQuestoes(e.target.value)}
          className="h-8 text-center"
        />
      </TableCell>
      <TableCell className="w-20 text-right">
        <div className="flex items-center gap-1 justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-50"
            onClick={handleSalvar}
            disabled={salvando}
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleRemover}
            disabled={removendo}
          >
            {removendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─── Linha da tabela para disciplina extra (pool) ─────────────────────────────

function ExtraRow({
  extra,
  onRemoverDoDia,
  onSalvo,
}: {
  extra: DisciplinaExtra
  onRemoverDoDia: (extraId: string) => void
  onSalvo: (extra: DisciplinaExtra) => void
}) {
  const [horas, setHoras] = useState(String(extra.horasPlanejadas ?? 0))
  const [questoes, setQuestoes] = useState(String(extra.questoesPlanejadas ?? 0))
  const [salvando, setSalvando] = useState(false)
  const cor = extra.disciplina.cor || '#3b82f6'

  const handleSalvar = async () => {
    setSalvando(true)
    const res = await atualizarMetasExtraCicloUsuario({
      extraId: extra.id,
      horasPlanejadas: parseInt(horas) || 0,
      questoesPlanejadas: parseInt(questoes) || 0,
    })
    setSalvando(false)
    if (res.error) toast.error(res.error)
    else if (res.success && res.data) {
      toast.success('Salvo!')
      onSalvo(res.data as DisciplinaExtra)
    }
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
          <span className="font-medium text-sm">{extra.disciplina.nome}</span>
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">pool</Badge>
        </div>
      </TableCell>
      <TableCell className="w-36">
        <Input
          type="number"
          min="0"
          value={horas}
          onChange={e => setHoras(e.target.value)}
          className="h-8 text-center"
        />
      </TableCell>
      <TableCell className="w-36">
        <Input
          type="number"
          min="0"
          value={questoes}
          onChange={e => setQuestoes(e.target.value)}
          className="h-8 text-center"
        />
      </TableCell>
      <TableCell className="w-20 text-right">
        <div className="flex items-center gap-1 justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-50"
            onClick={handleSalvar}
            disabled={salvando}
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onRemoverDoDia(extra.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─── Bloco de um dia ──────────────────────────────────────────────────────────

function DiaBloco({
  dia,
  ciclo,
  planoId,
  progressos,
  pool,
  disciplinasExtras,
  onAtualizado,
  onExtraAdicionada,
  onExtraExcluida,
}: {
  dia: { id: string; label: string }
  ciclo: Ciclo
  planoId: string
  progressos: ProgressoDisciplina[]
  pool: PlanoPool[]
  disciplinasExtras: DisciplinaExtra[]
  onAtualizado: (p: ProgressoDisciplina) => void
  onExtraAdicionada: (extra: DisciplinaExtra) => void
  onExtraExcluida: (extraId: string) => void
}) {
  const [adicionando, setAdicionando] = useState(false)
  const [selecionada, setSelecionada] = useState('')
  const [salvandoAdd, setSalvandoAdd] = useState(false)

  const disciplinasNoDia = ciclo.disciplinas.filter(disc => {
    const prog = progressos.find(p => p.disciplinaSemanaId === disc.id)
    return parseDias(prog?.diasEstudo).includes(dia.id)
  })

  const idsAdminNoCiclo = ciclo.disciplinas.map(d => d.disciplinaId)
  const idsNoDia = disciplinasNoDia.map(d => d.disciplinaId)

  const opcoesAdmin = ciclo.disciplinas.filter(d => !idsNoDia.includes(d.disciplinaId))
  const opcoesPool = pool.filter(p =>
    !idsAdminNoCiclo.includes(p.disciplinaId) &&
    !disciplinasExtras.some(e => e.disciplinaId === p.disciplinaId && parseDias(e.diasEstudo).includes(dia.id))
  )

  const extrasNoDia = disciplinasExtras.filter(e => parseDias(e.diasEstudo).includes(dia.id))

  const handleAdicionar = async () => {
    if (!selecionada) return
    setSalvandoAdd(true)

    if (selecionada.startsWith('admin:')) {
      const discId = selecionada.replace('admin:', '')
      const prog = progressos.find(p => p.disciplinaSemanaId === discId)
      const dias = parseDias(prog?.diasEstudo)
      if (!dias.includes(dia.id)) dias.push(dia.id)

      const res = await upsertProgressoUsuarioDisciplina({
        planoId,
        disciplinaSemanaId: discId,
        diasEstudo: serializeDias(dias),
      })
      if (res.error) toast.error(res.error)
      else if (res.success && res.data) {
        onAtualizado(res.data as ProgressoDisciplina)
        setSelecionada('')
        setAdicionando(false)
      }
    } else if (selecionada.startsWith('pool:')) {
      const disciplinaId = selecionada.replace('pool:', '')
      const res = await adicionarDisciplinaCicloUsuario({ planoId, semanaId: ciclo.id, disciplinaId, dia: dia.id })
      if (res.error) toast.error(res.error)
      else if (res.success && res.data) {
        onExtraAdicionada(res.data as DisciplinaExtra)
        setSelecionada('')
        setAdicionando(false)
      }
    }

    setSalvandoAdd(false)
  }

  const handleRemoverExtraDoDia = async (extraId: string) => {
    const res = await removerDiaExtraCicloUsuario(extraId, dia.id)
    if (res.error) { toast.error(res.error); return }
    if ('deleted' in res && res.deleted) {
      onExtraExcluida(extraId)
    } else if (res.success && res.data) {
      onExtraAdicionada(res.data as DisciplinaExtra)
    }
  }

  const temOpcoes = opcoesAdmin.length > 0 || opcoesPool.length > 0

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Cabeçalho do dia */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b gap-3">
        <span className="text-sm font-semibold text-foreground capitalize">{dia.label}</span>

        <div className="flex items-center gap-2 ml-auto">
          {adicionando ? (
            <>
              <Select value={selecionada} onValueChange={setSelecionada}>
                <SelectTrigger className="h-7 w-52 text-xs">
                  <SelectValue placeholder="Selecione a disciplina…" />
                </SelectTrigger>
                <SelectContent>
                  {opcoesAdmin.map(d => (
                    <SelectItem key={d.id} value={`admin:${d.id}`}>
                      {d.disciplina.nome}
                    </SelectItem>
                  ))}
                  {opcoesPool.map(p => (
                    <SelectItem key={p.disciplinaId} value={`pool:${p.disciplinaId}`}>
                      {p.disciplina.nome} (pool)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-7 px-3 text-xs" onClick={handleAdicionar} disabled={!selecionada || salvandoAdd}>
                {salvandoAdd ? <Loader2 className="h-3 w-3 animate-spin" /> : 'OK'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setAdicionando(false); setSelecionada('') }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            temOpcoes && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAdicionando(true)}>
                <Plus className="h-3.5 w-3.5" />
                Adicionar disciplina
              </Button>
            )
          )}
        </div>
      </div>

      {/* Tabela */}
      {disciplinasNoDia.length > 0 || extrasNoDia.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Disciplina</TableHead>
              <TableHead className="w-36 text-center">Horas planejadas</TableHead>
              <TableHead className="w-36 text-center">Questões planejadas</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {disciplinasNoDia.map(disc => (
              <DisciplinaRow
                key={disc.id}
                disc={disc}
                diaId={dia.id}
                planoId={planoId}
                progresso={progressos.find(p => p.disciplinaSemanaId === disc.id)}
                onAtualizado={onAtualizado}
              />
            ))}
            {extrasNoDia.map(extra => (
              <ExtraRow
                key={extra.id}
                extra={extra}
                onRemoverDoDia={handleRemoverExtraDoDia}
                onSalvo={onExtraAdicionada}
              />
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma disciplina agendada para este dia.
        </p>
      )}
    </div>
  )
}

// ─── Card de ciclo ────────────────────────────────────────────────────────────

function CicloCard({
  ciclo,
  planoId,
  progressos,
  pool,
  disciplinasExtras,
  onAtualizado,
  onExtraAdicionada,
  onExtraRemovida,
  onExtraExcluida,
}: {
  ciclo: Ciclo
  planoId: string
  progressos: ProgressoDisciplina[]
  pool: PlanoPool[]
  disciplinasExtras: DisciplinaExtra[]
  onAtualizado: (p: ProgressoDisciplina) => void
  onExtraAdicionada: (extra: DisciplinaExtra) => void
  onExtraRemovida: (extraId: string) => void
  onExtraExcluida: (extraId: string) => void
}) {
  const [expandido, setExpandido] = useState(false)
  const extrasNoCiclo = disciplinasExtras.filter(e => e.semanaId === ciclo.id)
  // Extras sem nenhum dia associado (registros legados ou adicionados sem dia)
  const extrasSemDia = extrasNoCiclo.filter(e => !parseDias(e.diasEstudo).length)

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
          <Badge variant="outline" className="text-xs gap-1">
            <BookOpen className="h-3 w-3" />
            {ciclo.disciplinas.length} disciplina{ciclo.disciplinas.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>

      {expandido && (
        <CardContent className="pt-0 space-y-3">
          {ciclo.disciplinas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma disciplina neste ciclo.
            </p>
          ) : (
            getDiasCiclo(ciclo.dataInicio, ciclo.dataFim).map(dia => (
              <DiaBloco
                key={dia.id}
                dia={dia}
                ciclo={ciclo}
                planoId={planoId}
                progressos={progressos}
                pool={pool}
                disciplinasExtras={extrasNoCiclo}
                onAtualizado={onAtualizado}
                onExtraAdicionada={onExtraAdicionada}
                onExtraExcluida={onExtraExcluida}
              />
            ))
          )}

          {extrasSemDia.length > 0 && (
            <div className="pt-1">
              <p className="text-xs text-muted-foreground mb-2">Disciplinas extras adicionadas</p>
              <div className="flex flex-wrap gap-2">
                {extrasSemDia.map(extra => (
                  <Badge key={extra.id} variant="secondary" className="gap-1.5 pr-1">
                    {extra.disciplina.nome}
                    <button
                      onClick={() => onExtraRemovida(extra.id)}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
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

  const handleExtraRemovida = async (extraId: string) => {
    const res = await removerDisciplinaExtraCicloUsuario(extraId)
    if (res.error) toast.error(res.error)
    else {
      toast.success('Disciplina removida')
      handleRemoverExtraEstado(extraId)
    }
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
            onExtraRemovida={handleExtraRemovida}
            onExtraExcluida={handleRemoverExtraEstado}
          />
        ))
      )}
    </div>
  )
}
