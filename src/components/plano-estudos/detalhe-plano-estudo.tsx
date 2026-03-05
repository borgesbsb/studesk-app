'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { getPlanoEstudoById } from '@/interface/actions/plano-estudo/get-by-id'
import { updateProgressoEstudo } from '@/interface/actions/plano-estudo/update-progresso'
import { updateDisciplinaDia } from '@/interface/actions/plano-estudo/update-disciplina-dia'
import { deleteCiclo } from '@/interface/actions/plano-estudo/delete-ciclo'
import { adicionarDisciplinaSemana } from '@/interface/actions/plano-estudo/adicionar-disciplina'
import { deleteDisciplinaSemana } from '@/interface/actions/plano-estudo/delete-disciplina'
import { deleteDisciplinaDia } from '@/interface/actions/plano-estudo/delete-disciplina-dia'
import { updateSemanaEstudo } from '@/interface/actions/plano-estudo/update-semana'
import { adicionarCicloAoPlano } from '@/interface/actions/plano-estudo/adicionar-ciclo'
import { reordenarDisciplinas } from '@/interface/actions/plano-estudo/reordenar-disciplinas'
import { copiarDisciplinasDia } from '@/interface/actions/plano-estudo/copiar-disciplinas-dia'
import { listarDisciplinas } from '@/interface/actions/disciplina/list'
import { Calendar, Clock, Target, Book, FileText, Video, Save, Trash2, Plus, ChevronDown, ChevronUp, GripVertical, BookOpen, ListChecks, Timer } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { useSaveStatus } from '@/contexts/save-status-context'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  CSS,
} from '@dnd-kit/utilities'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface DisciplinaDia {
  id: string
  disciplinaSemanaId: string
  dia: string
  minutosPlanejados: number
  horasRealizadas: number
  questoesPlanejadas: number
  questoesRealizadas: number
  observacoes: string | null
  concluida: boolean
  createdAt: Date
  updatedAt: Date
}

interface DisciplinaSemana {
  id: string
  createdAt: Date
  updatedAt: Date
  disciplinaId: string
  semanaId: string
  minutosPlanejados: number
  horasRealizadas: number
  prioridade: number
  concluida: boolean
  observacoes: string | null
  tipoVeiculo: string | null
  materialUrl: string | null
  materialNome: string | null
  questoesPlanejadas: number
  questoesRealizadas: number
  tempoVideoPlanejado: number
  tempoVideoRealizado: number
  paginasLidas: number
  totalPaginas: number
  diasEstudo: string | null
  dias?: DisciplinaDia[] // Array de dias com valores independentes
  disciplina: {
    id: string
    nome: string
    createdAt: Date
    updatedAt: Date
    peso: number
    descricao: string | null
    cargaHoraria: number
    cor: string | null
  }
}

interface SemanaEstudoDetalhe {
  id: string
  numeroSemana: number
  dataInicio: string | Date
  dataFim: string | Date
  totalHoras: number
  horasRealizadas: number
  observacoes?: string | null | null
  disciplinas: DisciplinaSemana[]
}

interface PlanoEstudoDetalhe {
  id: string
  nome: string
  descricao?: string | null
  dataInicio: string | Date
  dataFim: string | Date
  ativo: boolean
  semanas: SemanaEstudoDetalhe[]
}

interface DetalhePlanoEstudoProps {
  planoId: string
}

interface Disciplina {
  id: string
  nome: string
  cor?: string | null
}

// Componente SortableDisciplinaRow
function SortableDisciplinaRow({ 
  disciplina, 
  index,
  semana,
  IconeVeiculo,
  valorQuestoesAtual,
  progressoQuestoes,
  estaEditando,
  valoresEditadosDisciplina,
  camposEditando,
  valoresEditados,
  questoesEditadas,
  salvandoId,
  disciplinas,
  plano,
  diasSemana,
  onDisciplinaActions
}: {
  disciplina: DisciplinaSemana
  index: number
  semana: SemanaEstudoDetalhe
  IconeVeiculo: any
  valorQuestoesAtual: number
  progressoQuestoes: number
  estaEditando: string | undefined
  valoresEditadosDisciplina: any
  camposEditando: Record<string, string>
  valoresEditados: Record<string, any>
  questoesEditadas: Record<string, number>
  salvandoId: string | null
  disciplinas: Disciplina[]
  plano: PlanoEstudoDetalhe | null
  diasSemana: { id: string; label: string }[]
  onDisciplinaActions: {
    iniciarEdicao: (disciplinaId: string, campo: string, valorAtual: any) => void
    atualizarValorEditado: (disciplinaId: string, campo: string, valor: any) => void
    salvarEdicao: (disciplina: DisciplinaSemana) => void
    salvarEdicaoComValor: (disciplina: DisciplinaSemana, campo: string, valor: any) => void
    cancelarEdicao: (disciplinaId: string) => void
    temEdicoesPendentes: (disciplinaId: string) => boolean
    obterNomeDisciplina: (disciplinaSemana: DisciplinaSemana) => string
    obterIdDisciplinaAtual: (disciplinaSemana: DisciplinaSemana) => string
    parseDiasEstudo: (diasEstudo?: string | null) => string[]
    atualizarDiasEstudo: (disciplina: DisciplinaSemana, diasSelecionados: string[]) => void
    excluirDisciplina: (disciplinaSemanaId: string, semanaId: string, diaId?: string) => void
  }
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: disciplina.id,
    disabled: estaEditando !== undefined // Desabilitar drag quando estiver editando
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow
      key={disciplina.id}
      ref={setNodeRef} 
      style={style}
      className={isDragging ? 'opacity-50' : ''}
    >
      {/* Coluna do handle de drag */}
      <TableCell className="w-8">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded flex items-center justify-center"
          style={{ touchAction: 'none' }}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <IconeVeiculo className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col min-w-0 flex-1">
            {estaEditando === 'disciplinaId' ? (
              <Select
                value={onDisciplinaActions.obterIdDisciplinaAtual(disciplina)}
                onValueChange={(valor) => {
                  const timestamp = new Date().toISOString().substr(14, 9)

                  // PRIMEIRO: Atualizar valor editado em memória
                  onDisciplinaActions.atualizarValorEditado(disciplina.id, 'disciplinaId', valor)

                  // SEGUNDO: Atualizar plano local para feedback visual imediato
                  const novaDisciplina = disciplinas.find(d => d.id === valor)
                  if (novaDisciplina && plano) {
                    // Lógica de atualização local...

                    // TERCEIRO: Salvar no servidor após um pequeno delay
                    setTimeout(() => {
                      const timestampDelay = new Date().toISOString().substr(14, 9)
                      onDisciplinaActions.salvarEdicaoComValor(disciplina, 'disciplinaId', valor)
                    }, 50)
                  } else {
                  }
                }}
                onOpenChange={(isOpen) => {
                  // Quando o select fechar (isOpen = false), cancelar edição
                  // Usamos um timeout para dar tempo do onValueChange executar primeiro
                  if (!isOpen) {
                    setTimeout(() => {
                      onDisciplinaActions.cancelarEdicao(disciplina.id)
                    }, 100)
                  }
                }}
              >
                <SelectTrigger className="w-full min-w-[150px]">
                  <SelectValue placeholder="Selecione uma disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {disciplinas.map((disc) => (
                    <SelectItem key={disc.id} value={disc.id}>
                      {disc.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span 
                className="font-medium cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                onDoubleClick={() => {
                  // IMPORTANTE: Só iniciar edição se não há valores pendentes de salvamento
                  if (!onDisciplinaActions.temEdicoesPendentes(disciplina.id)) {
                    const idDisciplinaAtual = onDisciplinaActions.obterIdDisciplinaAtual(disciplina)
                    onDisciplinaActions.iniciarEdicao(disciplina.id, 'disciplinaId', idDisciplinaAtual)
                  } else {
                  }
                }}
              >
                {onDisciplinaActions.obterNomeDisciplina(disciplina)}
              </span>
            )}
            {disciplina.concluida && (
              <div className="mt-1">
                <Badge variant="outline" className="text-xs text-green-600">Concluída</Badge>
              </div>
            )}
          </div>
        </div>
      </TableCell>

      {/* Assuntos - editável */}
      <TableCell>
        {estaEditando === 'observacoes' ? (
          <Textarea
            className="min-h-[60px] resize-none text-sm"
            value={valoresEditadosDisciplina.observacoes || disciplina.observacoes || ''}
            onChange={(e) => {
              onDisciplinaActions.atualizarValorEditado(disciplina.id, 'observacoes', e.target.value)
            }}
            onBlur={() => onDisciplinaActions.salvarEdicao(disciplina)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) onDisciplinaActions.salvarEdicao(disciplina)
              if (e.key === 'Escape') onDisciplinaActions.cancelarEdicao(disciplina.id)
            }}
            placeholder="Ex: Capítulo 1 - Teoria dos conjuntos, Exercícios 1 a 10..."
            autoFocus
          />
        ) : (
          <div
            className="text-xs text-muted-foreground cursor-pointer hover:bg-muted/30 p-2 rounded min-h-[40px] transition-colors"
            onDoubleClick={() => onDisciplinaActions.iniciarEdicao(disciplina.id, 'observacoes', disciplina.observacoes || '')}
            title="Duplo clique para editar assuntos"
          >
            {disciplina.observacoes || (
              <span className="italic text-muted-foreground/50">
                Clique para adicionar assuntos...
              </span>
            )}
          </div>
        )}
      </TableCell>

      {/* Horas planejadas - editável */}
      <TableCell className="text-center">
        {estaEditando === 'minutosPlanejados' ? (
          <Input
            className="w-20 text-center"
            type="text"
            value={valoresEditadosDisciplina.minutosPlanejados || disciplina.minutosPlanejados}
            onChange={(e) => {
              const valor = e.target.value.replace(/[^0-9]/g, '')
              onDisciplinaActions.atualizarValorEditado(disciplina.id, 'minutosPlanejados', parseInt(valor) || 0)
            }}
            onBlur={() => onDisciplinaActions.salvarEdicao(disciplina)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onDisciplinaActions.salvarEdicao(disciplina)
              if (e.key === 'Escape') onDisciplinaActions.cancelarEdicao(disciplina.id)
            }}
            autoFocus
          />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span
              className="text-sm cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
              onDoubleClick={() => onDisciplinaActions.iniciarEdicao(disciplina.id, 'minutosPlanejados', disciplina.minutosPlanejados)}
            >
              {disciplina.minutosPlanejados}h
            </span>
            {disciplina.diasEstudo && (
              <Badge variant="secondary" className="text-xs">
                {calcularHorasPorDia(disciplina.minutosPlanejados, disciplina.diasEstudo)}h/dia
              </Badge>
            )}
          </div>
        )}
      </TableCell>

      {/* Questões planejadas - editável */}
      <TableCell className="text-center">
        {estaEditando === 'questoesPlanejadas' ? (
          <Input
            className="w-20 text-center"
            type="text"
            value={valoresEditadosDisciplina.questoesPlanejadas || disciplina.questoesPlanejadas}
            onChange={(e) => {
              const valor = e.target.value.replace(/[^0-9]/g, '')
              onDisciplinaActions.atualizarValorEditado(disciplina.id, 'questoesPlanejadas', parseInt(valor) || 0)
            }}
            onBlur={() => onDisciplinaActions.salvarEdicao(disciplina)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onDisciplinaActions.salvarEdicao(disciplina)
              if (e.key === 'Escape') onDisciplinaActions.cancelarEdicao(disciplina.id)
            }}
            autoFocus
          />
        ) : (
          <span 
            className="text-sm cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
            onDoubleClick={() => onDisciplinaActions.iniciarEdicao(disciplina.id, 'questoesPlanejadas', disciplina.questoesPlanejadas)}
          >
            {disciplina.questoesPlanejadas}
          </span>
        )}
      </TableCell>

      {/* Dias da semana - checkboxes */}
      <TableCell className="text-center">
        <div className="flex flex-wrap gap-2 justify-center">
          {diasSemana.map((dia) => {
            const diasSelecionados = onDisciplinaActions.parseDiasEstudo(disciplina.diasEstudo)
            const isChecked = diasSelecionados.includes(dia.id)

            return (
              <div key={`${disciplina.id}-${dia.id}-${disciplina.diasEstudo || 'empty'}`} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  id={`${disciplina.id}-${dia.id}`}
                  checked={isChecked}
                  key={`checkbox-${disciplina.id}-${dia.id}-${isChecked}`}
                  onChange={(e) => {
                    const checked = e.target.checked
                    
                    const diasAtuais = onDisciplinaActions.parseDiasEstudo(disciplina.diasEstudo)
                    
                    let novosDias: string[]
                    
                    if (checked) {
                      novosDias = [...diasAtuais.filter(d => d !== dia.id), dia.id]
                    } else {
                      novosDias = diasAtuais.filter(d => d !== dia.id)
                    }
                    
                    onDisciplinaActions.atualizarDiasEstudo(disciplina, novosDias)
                  }}
                  className="h-4 w-4"
                />
                <label 
                  htmlFor={`${disciplina.id}-${dia.id}`}
                  className="text-xs cursor-pointer select-none hover:text-blue-600"
                >
                  {dia.label}
                </label>
              </div>
            )
          })}
        </div>
      </TableCell>

        {/* Ações - botão excluir */}
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDisciplinaActions.excluirDisciplina(disciplina.id, semana.id)}
            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
            title="Excluir disciplina"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
  )
}

// ========== Funções Helper para Distribuição de Horas ==========

/**
 * Formatar horas em "Xh Ymin"
 * @param horas - Valor em horas (decimal)
 * @returns String formatada (ex: "1h 30min", "45min", "2h")
 */
function formatarTempo(horas: number): string {
  const h = Math.floor(horas)
  const min = Math.round((horas - h) * 60)

  if (h === 0) {
    return `${min}min`
  } else if (min === 0) {
    return `${h}h`
  } else {
    return `${h}h ${min}min`
  }
}

function formatarMinutos(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

/**
 * Calcular dias do ciclo baseado nas datas de início e fim
 * @param dataInicio - Data de início do ciclo
 * @param dataFim - Data de fim do ciclo
 * @returns Array de dias do ciclo com id, label e data
 */
function calcularDiasCiclo(dataInicio: Date | string, dataFim: Date | string): Array<{ id: string; label: string; data: Date }> {
  const inicio = new Date(dataInicio)
  const fim = new Date(dataFim)
  // Usar UTC noon para tornar o cálculo timezone-independente
  inicio.setUTCHours(12, 0, 0, 0)
  fim.setUTCHours(12, 0, 0, 0)

  // Calcular número de dias
  const diffTime = Math.abs(fim.getTime() - inicio.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 para incluir o último dia

  const dias = []
  for (let i = 0; i < diffDays; i++) {
    const data = new Date(inicio)
    data.setUTCDate(inicio.getUTCDate() + i)

    dias.push({
      id: `dia${i + 1}`,
      label: `Dia ${i + 1}`,
      data: data
    })
  }

  return dias
}

/**
 * Calcula quantas horas por dia uma disciplina deve ser estudada
 * @param minutosPlanejados - Total de horas planejadas para a semana
 * @param diasEstudo - String CSV com dias selecionados (ex: "seg,qua,sex")
 * @returns Horas por dia (arredondado para 1 casa decimal)
 */
function calcularHorasPorDia(minutosPlanejados: number, diasEstudo: string | null): number {
  if (!diasEstudo || minutosPlanejados === 0) return 0

  const diasSelecionados = diasEstudo.split(',').filter(d => d.trim())
  // Filtrar apenas dias do formato novo (dia1, dia2, etc), ignorar formato antigo (seg, ter, etc)
  const diasNovos = diasSelecionados.filter(dia => !['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].includes(dia))

  if (diasNovos.length === 0) return 0

  return Math.round((minutosPlanejados / diasNovos.length) * 10) / 10
}

/**
 * Calcula a distribuição de horas por dia do ciclo para todas as disciplinas
 * @param disciplinas - Array de disciplinas da semana
 * @returns Objeto com total de horas por dia { dia1: 5, dia2: 3, ... }
 */
function calcularDistribuicaoPorDia(disciplinas: DisciplinaSemana[]): Record<string, number> {
  const distribuicao: Record<string, number> = {}

  disciplinas.forEach(disciplina => {
    if (!disciplina.diasEstudo) return

    const diasEstudo = disciplina.diasEstudo.trim()
    // Ignorar formato antigo (seg, ter, etc)
    const formatoAntigo = /^(seg|ter|qua|qui|sex|sab|dom)(,(seg|ter|qua|qui|sex|sab|dom))*$/.test(diasEstudo)
    if (formatoAntigo) return

    const diasSelecionados = disciplina.diasEstudo.split(',').filter(d => d.trim())

    diasSelecionados.forEach(dia => {
      if (!distribuicao[dia]) {
        distribuicao[dia] = 0
      }

      // Verificar se existe DisciplinaDia específico para este dia
      const disciplinaDia = disciplina.dias?.find(d => d.dia === dia)

      if (disciplinaDia) {
        // Usar valor específico do dia
        distribuicao[dia] += disciplinaDia.minutosPlanejados
      } else {
        // Calcular proporcionalmente se não existe valor específico
        const horasPorDia = calcularHorasPorDia(disciplina.minutosPlanejados, disciplina.diasEstudo)
        distribuicao[dia] += horasPorDia
      }
    })
  })

  // Arredondar valores finais
  Object.keys(distribuicao).forEach(dia => {
    distribuicao[dia] = Math.round(distribuicao[dia] * 10) / 10
  })

  return distribuicao
}

/**
 * Calcula a média de horas por dia útil do ciclo
 * @param totalHoras - Total de horas planejadas
 * @param disciplinas - Array de disciplinas para verificar dias de estudo
 * @returns Média de horas por dia
 */
function calcularMediaHorasPorDia(totalHoras: number, disciplinas: DisciplinaSemana[]): number {
  const distribuicao = calcularDistribuicaoPorDia(disciplinas)
  const diasComEstudo = Object.values(distribuicao).filter(h => h > 0).length

  if (diasComEstudo === 0) return 0

  return Math.round((totalHoras / diasComEstudo) * 10) / 10
}

/**
 * Agrupa disciplinas por dia da semana com suas respectivas horas
 * @param disciplinas - Array de disciplinas da semana
 * @returns Objeto com disciplinas agrupadas por dia
 */
function agruparDisciplinasPorDia(disciplinas: DisciplinaSemana[]): Record<string, Array<{ nome: string; horas: number; disciplinaId: string }>> {
  const agrupamento: Record<string, Array<{ nome: string; horas: number; disciplinaId: string }>> = {
    seg: [],
    ter: [],
    qua: [],
    qui: [],
    sex: [],
    sab: [],
    dom: []
  }

  disciplinas.forEach(disciplina => {
    if (!disciplina.diasEstudo) return

    const diasSelecionados = disciplina.diasEstudo.split(',').filter(d => d.trim())

    diasSelecionados.forEach(dia => {
      if (agrupamento[dia] !== undefined) {
        // Verificar se existe DisciplinaDia específico para este dia
        const disciplinaDia = disciplina.dias?.find(d => d.dia === dia)

        const horasPorDia = disciplinaDia
          ? disciplinaDia.minutosPlanejados
          : calcularHorasPorDia(disciplina.minutosPlanejados, disciplina.diasEstudo)

        agrupamento[dia].push({
          nome: disciplina.disciplina?.nome || 'Sem nome',
          horas: horasPorDia,
          disciplinaId: disciplina.disciplinaId
        })
      }
    })
  })

  return agrupamento
}

// ========== Componente de Card de Disciplina Interativo ==========

interface DisciplinaCardItemProps {
  disciplina: DisciplinaSemana
  diaId: string
  onDisciplinaActions: any
  salvandoId: string | null
  onEditarClick: (disciplina: DisciplinaSemana, dia: string) => void
}

function DisciplinaCardItem({
  disciplina,
  diaId,
  onDisciplinaActions,
  salvandoId,
  onEditarClick
}: DisciplinaCardItemProps) {
  // Buscar dados específicos deste dia se existir
  const disciplinaDia = disciplina.dias?.find(d => d.dia === diaId)

  // Se existe DisciplinaDia, usar seus valores, senão calcular proporcionalmente
  const horasPorDia = disciplinaDia
    ? disciplinaDia.minutosPlanejados
    : calcularHorasPorDia(disciplina.minutosPlanejados, disciplina.diasEstudo)

  const questoesPorDia = disciplinaDia
    ? disciplinaDia.questoesPlanejadas
    : disciplina.questoesPlanejadas

  const corDisciplina = disciplina.disciplina?.cor || '#3b82f6'

  // Formatar tempo: horasPorDia está em minutos
  const tempoFormatado = formatarMinutos(Math.round(horasPorDia))

  return (
    <div
      className="group relative rounded-lg border-2 hover:border-primary/40 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
      style={{
        borderColor: `${corDisciplina}40`,
        backgroundColor: 'white'
      }}
      onClick={() => onEditarClick(disciplina, diaId)}
    >
      {/* Barra colorida superior */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: corDisciplina }}
      />

      <div className="p-2">
        {/* Nome e botão excluir */}
        <div className="flex items-start justify-between gap-1 mb-2">
          <h5
            className="font-semibold text-[9px] flex-1 leading-tight line-clamp-2"
            style={{ color: corDisciplina }}
            title={disciplina.disciplina?.nome}
          >
            {disciplina.disciplina?.nome || 'Sem nome'}
          </h5>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 rounded-md"
            onClick={(e) => {
              e.stopPropagation()
              onDisciplinaActions.excluirDisciplina(disciplina.id, disciplina.semanaId, diaId)
            }}
            disabled={salvandoId === disciplina.id}
            title="Remover deste dia"
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>

        {/* Informações em grid */}
        <div className="space-y-1.5">
          {/* Horas */}
          <div className="flex items-center gap-1.5 bg-blue-50 rounded-md px-2 py-1">
            <div className="bg-blue-500 rounded-full p-0.5">
              <Timer className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-blue-700">{tempoFormatado}</span>
            <span className="text-[9px] text-blue-600 ml-auto">tempo</span>
          </div>

          {/* Questões */}
          <div className="flex items-center gap-1.5 bg-purple-50 rounded-md px-2 py-1">
            <div className="bg-purple-500 rounded-full p-0.5">
              <ListChecks className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-purple-700">{questoesPorDia}</span>
            <span className="text-[9px] text-purple-600 ml-auto">questões</span>
          </div>
        </div>
      </div>

      {/* Indicador de salvamento */}
      {salvandoId === disciplina.id && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-lg">
            <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-medium text-foreground">Salvando...</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ========== Modal de Edição de Disciplina por Dia ==========

interface ModalEditarDisciplinaDiaProps {
  disciplina: DisciplinaSemana | null
  dia: string | null // "dia1", "dia2", etc
  aberto: boolean
  onFechar: () => void
  onSalvar: (disciplina: DisciplinaSemana, dia: string, dados: {
    minutosPlanejados: number
    questoesPlanejadas: number
    observacoes: string
  }) => Promise<void>
}

function ModalEditarDisciplina({
  disciplina,
  dia,
  aberto,
  onFechar,
  onSalvar
}: ModalEditarDisciplinaDiaProps) {
  const [minutosPlanejados, setHorasPlanejadas] = useState(0)
  const [questoesPlanejadas, setQuestoesPlanejadas] = useState(0)
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (disciplina && dia) {
      // Buscar dados específicos deste dia se existir
      const disciplinaDia = disciplina.dias?.find(d => d.dia === dia)

      if (disciplinaDia) {
        // Se já existe entrada para este dia, usar os valores dela
        setHorasPlanejadas(Number(disciplinaDia.minutosPlanejados))
        setQuestoesPlanejadas(Number(disciplinaDia.questoesPlanejadas))
        setObservacoes(String(disciplinaDia.observacoes || ''))
      } else {
        // Se não existe, calcular valor padrão (distribuição uniforme)
        const horasPorDia = calcularHorasPorDia(disciplina.minutosPlanejados, disciplina.diasEstudo)
        const diasSelecionados = disciplina.diasEstudo?.split(',').filter(d => d.trim()) || []
        const questoesPorDia = Math.floor(disciplina.questoesPlanejadas / (diasSelecionados.length || 1))

        setHorasPlanejadas(Number(horasPorDia))
        setQuestoesPlanejadas(Number(questoesPorDia))
        setObservacoes('')
      }
    }
  }, [disciplina, dia])

  const handleSalvar = async () => {
    if (!disciplina || !dia) return

    setSalvando(true)
    try {
      // Agora salva apenas para o dia específico
      await onSalvar(disciplina, dia, {
        minutosPlanejados: Number(minutosPlanejados),
        questoesPlanejadas: Number(questoesPlanejadas),
        observacoes: String(observacoes)
      })
      onFechar()
    } finally {
      setSalvando(false)
    }
  }

  if (!disciplina) return null

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Disciplina</DialogTitle>
          <DialogDescription>
            {disciplina.disciplina?.nome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tempo de Leitura */}
          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2 italic">
              <span className="text-lg">📖</span>
              Tempo de Leitura (por dia)
            </label>

            {/* Stepper de Horas */}
            <div className="flex items-center justify-center gap-3 py-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => {
                  setHorasPlanejadas(Math.max(0, Math.round(minutosPlanejados) - 1))
                }}
              >
                <span className="text-lg font-bold">−</span>
              </Button>

              <div className="flex items-center justify-center min-w-[120px]">
                <span className="text-3xl font-bold text-primary">
                  {formatarMinutos(Math.round(minutosPlanejados))}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => {
                  setHorasPlanejadas(Math.round(minutosPlanejados) + 1)
                }}
              >
                <span className="text-lg font-bold">+</span>
              </Button>
            </div>

            {/* Barra de Intensidade */}
            <div className="space-y-1">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.min((minutosPlanejados / 240) * 100, 100)}%`,
                    backgroundColor: minutosPlanejados <= 60 ? '#10b981' : minutosPlanejados <= 120 ? '#3b82f6' : '#f59e0b'
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span>Leve</span>
                <span>Moderado</span>
                <span>Intenso</span>
              </div>
            </div>

            {/* Atalhos */}
            <div className="flex flex-wrap gap-2">
              {[30, 60, 90, 120, 180].map((valor) => (
                <Button
                  key={valor}
                  type="button"
                  variant={minutosPlanejados === valor ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setHorasPlanejadas(valor)}
                >
                  {formatarMinutos(valor)}
                </Button>
              ))}
            </div>
          </div>

          {/* Questões */}
          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2 italic">
              <span className="text-lg">❓</span>
              Questões para Praticar
            </label>

            {/* Stepper de Questões */}
            <div className="flex items-center justify-center gap-3 py-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => setQuestoesPlanejadas(Math.max(0, questoesPlanejadas - 1))}
              >
                <span className="text-lg font-bold">−</span>
              </Button>

              <div className="flex items-center justify-center min-w-[120px]">
                <span className="text-3xl font-bold text-purple-600">
                  {questoesPlanejadas}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => setQuestoesPlanejadas(questoesPlanejadas + 1)}
              >
                <span className="text-lg font-bold">+</span>
              </Button>
            </div>

            {/* Indicador Visual de Questões */}
            <div className="space-y-1">
              <div className="flex gap-0.5">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-2 rounded-sm transition-all duration-200"
                    style={{
                      backgroundColor: i < Math.min(questoesPlanejadas / 5, 20) ? '#9333ea' : '#e5e7eb'
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span>Poucas (5-10)</span>
                <span>Ideal (15-25)</span>
                <span>Muitas (50+)</span>
              </div>
            </div>

            {/* Atalhos */}
            <div className="flex flex-wrap gap-2">
              {[10, 20, 30, 50].map((valor) => (
                <Button
                  key={valor}
                  type="button"
                  variant={questoesPlanejadas === valor ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setQuestoesPlanejadas(valor)}
                >
                  {valor}
                </Button>
              ))}
            </div>
          </div>

          {/* Estimativa Total */}
          {disciplina && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⏳</span>
                  <span className="font-medium text-blue-900">Estimativa por dia:</span>
                  <span className="font-bold text-blue-700">
                    {formatarMinutos(Math.round(minutosPlanejados))} leitura
                    {questoesPlanejadas > 0 && ` + ${Math.round(questoesPlanejadas * 1.5)}min questões`}
                    {' = '}
                    ~{formatarMinutos(Math.round(minutosPlanejados + questoesPlanejadas * 1.5))}
                  </span>
                </div>
                {(() => {
                  const diasSelecionados = disciplina.diasEstudo?.split(',').filter(d => d.trim()) || []
                  const numDias = diasSelecionados.length || 1
                  const tempoTotalSemana = Math.round(minutosPlanejados) * numDias
                  return numDias > 1 && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 pl-7">
                      <span>Total na semana ({numDias} dias):</span>
                      <span className="font-semibold">
                        ~{formatarMinutos(tempoTotalSemana + Math.round(questoesPlanejadas * numDias * 1.5))}
                      </span>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Assuntos/Observações */}
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              <span className="text-lg">📋</span>
              Assuntos/Observações
            </label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Digite os assuntos ou observações..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ========== Componente de Visualização Semanal Interativa ==========

interface VisualizacaoSemanalProps {
  disciplinas: DisciplinaSemana[]
  semana: SemanaEstudoDetalhe
  onDisciplinaActions: any
  salvandoId: string | null
  onAdicionarDisciplina: (diaId: string, diaVazio: boolean) => void
  onRecarregarPlano: () => Promise<void>
}

function VisualizacaoSemanal({
  disciplinas,
  semana,
  onDisciplinaActions,
  salvandoId,
  onAdicionarDisciplina,
  onRecarregarPlano
}: VisualizacaoSemanalProps) {
  const [disciplinaEditando, setDisciplinaEditando] = useState<DisciplinaSemana | null>(null)
  const [diaEditando, setDiaEditando] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)

  // Calcular distribuição de horas por dia do ciclo dinamicamente
  const calcularDistribuicaoDinamica = (diasDoCiclo: Array<{ id: string; label: string; data: Date }>) => {
    const distribuicao: Record<string, number> = {}

    // Inicializar com zeros
    diasDoCiclo.forEach(dia => {
      distribuicao[dia.id] = 0
    })

    // Somar horas de cada disciplina por dia
    disciplinas.forEach(disciplina => {
      if (!disciplina.diasEstudo) return

      const diasSelecionados = disciplina.diasEstudo.split(',').filter(d => d.trim())

      diasSelecionados.forEach(dia => {
        if (distribuicao[dia] !== undefined) {
          // Verificar se existe DisciplinaDia específico para este dia
          const disciplinaDia = disciplina.dias?.find(d => d.dia === dia)

          if (disciplinaDia) {
            // Usar valor específico do dia
            distribuicao[dia] += disciplinaDia.minutosPlanejados
          } else {
            // Calcular proporcionalmente se não existe valor específico
            const horasPorDia = calcularHorasPorDia(disciplina.minutosPlanejados, disciplina.diasEstudo)
            distribuicao[dia] += horasPorDia
          }
        }
      })
    })

    // Arredondar valores
    Object.keys(distribuicao).forEach(dia => {
      distribuicao[dia] = Math.round(distribuicao[dia] * 10) / 10
    })

    return distribuicao
  }

  const abrirModalEdicao = (disciplina: DisciplinaSemana, dia: string) => {
    setDisciplinaEditando(disciplina)
    setDiaEditando(dia)
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setDisciplinaEditando(null)
    setDiaEditando(null)
  }

  const salvarEdicaoDisciplina = async (
    disciplina: DisciplinaSemana,
    dia: string,
    dados: { minutosPlanejados: number; questoesPlanejadas: number; observacoes: string }
  ) => {
    try {
      // Usar a action updateDisciplinaDia para salvar dados específicos do dia
      const resultado = await updateDisciplinaDia({
        disciplinaSemanaId: disciplina.id,
        dia: dia,
        minutosPlanejados: dados.minutosPlanejados,
        questoesPlanejadas: dados.questoesPlanejadas,
        observacoes: dados.observacoes
      })

      if (resultado.success) {
        console.log('✅ Salvamento bem-sucedido, recarregando dados do servidor')

        // Fechar o modal
        fecharModal()

        // Recarregar os dados do servidor
        await onRecarregarPlano()
      } else {
        console.error('❌ Erro ao salvar:', resultado.error)
      }
    } catch (error) {
      console.error('❌ Erro ao salvar edição:', error)
    }
  }

  // Calcular dias do ciclo baseado nas datas
  const diasDoCiclo = calcularDiasCiclo(semana.dataInicio, semana.dataFim)
  const distribuicao = calcularDistribuicaoDinamica(diasDoCiclo)

  return (
    <>
      <ModalEditarDisciplina
        disciplina={disciplinaEditando}
        dia={diaEditando}
        aberto={modalAberto}
        onFechar={fecharModal}
        onSalvar={salvarEdicaoDisciplina}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Distribuição Semanal por Disciplina</h4>
          <p className="text-xs text-muted-foreground">Clique para editar</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {diasDoCiclo.map(dia => {
            const disciplinasDoDia = disciplinas.filter(d => {
              const dias = d.diasEstudo?.split(',').filter(x => x.trim()) || []
              return dias.includes(dia.id)
            })
            const totalHoras = distribuicao[dia.id]
            const temEstudo = totalHoras > 0

            return (
              <Card key={dia.id} className={`${temEstudo ? 'border-primary/30' : 'border-muted'}`}>
                <CardHeader className="pb-2 pt-3 px-4 space-y-0">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <div className="flex flex-col">
                      <span>{dia.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {format(dia.data, 'dd/MM', { locale: ptBR })}
                      </span>
                    </div>
                    <Badge variant={temEstudo ? "default" : "outline"} className="text-xs">
                      {totalHoras > 0 ? `${totalHoras}h` : '0h'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-2">
                  {/* Grid de disciplinas do dia */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                    {disciplinasDoDia.length > 0 ? (
                      disciplinasDoDia.map((disc) => (
                        <DisciplinaCardItem
                          key={disc.id}
                          disciplina={disc}
                          diaId={dia.id}
                          onDisciplinaActions={onDisciplinaActions}
                          salvandoId={salvandoId}
                          onEditarClick={abrirModalEdicao}
                        />
                      ))
                    ) : (
                      <div className="col-span-full">
                        <p className="text-[10px] text-muted-foreground italic text-center py-2">
                          Sem estudos
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Botão para adicionar disciplina */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-6 text-[10px]"
                    onClick={() => onAdicionarDisciplina(dia.id, disciplinasDoDia.length === 0)}
                  >
                    <Plus className="h-2.5 w-2.5 mr-1" />
                    {disciplinasDoDia.length === 0 ? 'Copiar/Adicionar' : 'Adicionar'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ========== Componente Principal ==========

export function DetalhePlanoEstudo({ planoId }: DetalhePlanoEstudoProps) {
  const [plano, setPlano] = useState<PlanoEstudoDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [questoesEditadas, setQuestoesEditadas] = useState<Record<string, number>>({})
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [excluindoCicloId, setExcluindoCicloId] = useState<string | null>(null)
  const [cicloParaExcluir, setCicloParaExcluir] = useState<SemanaEstudoDetalhe | null>(null)
  const [atualizandoDias, setAtualizandoDias] = useState<boolean>(false)
  
  const { setSaving, setSuccess, setError } = useSaveStatus()
  
  // Estados para edição in-line
  const [camposEditando, setCamposEditando] = useState<Record<string, string>>({}) // disciplinaId -> campo
  const [valoresEditados, setValoresEditados] = useState<Record<string, any>>({}) // disciplinaId -> valores
  
  // Estados para edição de datas da semana - simplificado
  const [semanaEditando, setSemanaEditando] = useState<string | null>(null)
  const [dataInicioEditando, setDataInicioEditando] = useState<string>('')
  const [dataFimEditando, setDataFimEditando] = useState<string>('')
  
  // Estado para colapsar cards - todos fechados por padrão
  const [semanasColapsadas, setSemanasColapsadas] = useState<Record<string, boolean>>({})
  
  // Estados para modal de seleção de ciclo origem
  const [modalEscolhaTipoCicloAberto, setModalEscolhaTipoCicloAberto] = useState(false)
  const [modalSelecionarCicloAberto, setModalSelecionarCicloAberto] = useState(false)
  const [cicloOrigemSelecionado, setCicloOrigemSelecionado] = useState<string | null>(null)
  
  // Estados para modal de seleção de disciplina
  const [modalAdicionarDisciplinaAberto, setModalAdicionarDisciplinaAberto] = useState(false)
  const [semanaParaAdicionar, setSemanaParaAdicionar] = useState<SemanaEstudoDetalhe | null>(null)
  const [diaParaAdicionar, setDiaParaAdicionar] = useState<string | null>(null)
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<string | null>(null)
  const [disciplinaOrigemParaCopiar, setDisciplinaOrigemParaCopiar] = useState<string | null>(null) // ID da DisciplinaSemana origem

  // Estados para modal de copiar disciplinas de outro dia
  const [modalCopiarDiaAberto, setModalCopiarDiaAberto] = useState(false)
  const [diaOrigemSelecionado, setDiaOrigemSelecionado] = useState<string | null>(null)
  const [modoCopia, setModoCopia] = useState<'dia' | 'manual'>('dia') // 'dia' = copiar de outro dia, 'manual' = escolher disciplinas

  // Configuração dos sensores de drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Drag só ativa após 8px de movimento
      },
    })
  )
  

  useEffect(() => {
    carregarPlano()
    carregarDisciplinas()
  }, [planoId])

  const carregarPlano = async () => {
    const timestamp = new Date().toISOString().substr(14, 9)
    
    // Bloquear carregamento se estamos atualizando dias
    if (atualizandoDias) {
      return
    }
    try {
      const resultado = await getPlanoEstudoById(planoId)
      if (resultado.success && resultado.data) {
        // Se houver plano anterior, preservar disciplinas que foram alteradas localmente
        if (plano) {
          const planoAtualizado = { ...resultado.data }

          // Para cada disciplina que foi alterada localmente, manter a alteração
          planoAtualizado.semanas = planoAtualizado.semanas.map(semana => ({
            ...semana,
            disciplinas: semana.disciplinas.map(disciplinaServidor => {
              // Buscar a disciplina correspondente no plano local
              const semanaLocal = plano.semanas.find(s => s.id === semana.id)
              const disciplinaLocal = semanaLocal?.disciplinas.find(d => d.id === disciplinaServidor.id)

              // Se a disciplina foi alterada localmente (tem disciplinaId), preservar
              if (disciplinaLocal?.disciplinaId && disciplinaLocal.disciplina?.nome) {
                // Verificar se a disciplina local é diferente da do servidor
                if (disciplinaLocal.disciplinaId !== disciplinaServidor.disciplina.id) {
                  return disciplinaLocal
                }
              }

              return disciplinaServidor
            })
          }))

          setPlano(planoAtualizado)
        } else {
          setPlano(resultado.data)
        }
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const carregarDisciplinas = async () => {
    try {
      const resultado = await listarDisciplinas()
      if (resultado.success && resultado.data) {
        setDisciplinas(resultado.data)
      } else {
      }
    } catch (error) {
    }
  }

  const calcularEstatisticas = () => {
    if (!plano) return { progresso: 0, totalHoras: 0, horasRealizadas: 0 }
    
    const totalHoras = plano.semanas.reduce((acc, s) => acc + s.totalHoras, 0)
    const horasRealizadas = plano.semanas.reduce((acc, s) => acc + s.horasRealizadas, 0)
    const progresso = totalHoras > 0 ? (horasRealizadas / totalHoras) * 100 : 0
    
    return { progresso: Math.round(progresso), totalHoras, horasRealizadas }
  }

  const atualizarQuestoes = async (disciplina: DisciplinaSemana, novasQuestoes: number) => {
    try {
      setSalvandoId(disciplina.id)
      setSaving()
      const resultado = await updateProgressoEstudo({
        disciplinaSemanaId: disciplina.id,
        horasRealizadas: disciplina.horasRealizadas,
        concluida: disciplina.concluida,
        observacoes: disciplina.observacoes || undefined,
        questoesRealizadas: novasQuestoes,
      })

      if (resultado.success) {
        setSuccess()
        
        // Atualizar localmente sem recarregar (mesmo padrão da salvarEdicao)
        if (plano) {
          const novoPlano = { ...plano }
          novoPlano.semanas = novoPlano.semanas.map(semana => ({
            ...semana,
            disciplinas: semana.disciplinas.map(disc => {
              if (disc.id === disciplina.id) {
                return {
                  ...disc,
                  questoesRealizadas: novasQuestoes
                }
              }
              return disc
            })
          }))
          setPlano(novoPlano)
        }
        
        setQuestoesEditadas(prev => {
          const novo = { ...prev }
          delete novo[disciplina.id]
          return novo
        })
      } else {
        setError(resultado.error || 'Erro ao atualizar questões')
      }
    } catch (error) {
      setError('Erro inesperado ao salvar')
    } finally {
      setSalvandoId(null)
    }
  }

  // Funções para edição in-line
  const iniciarEdicao = (disciplinaId: string, campo: string, valorAtual: any) => {
    setCamposEditando({ [disciplinaId]: campo })
    setValoresEditados({ [disciplinaId]: { [campo]: valorAtual } })
  }

  const cancelarEdicao = (disciplinaId: string) => {
    setCamposEditando(prev => {
      const novo = { ...prev }
      delete novo[disciplinaId]
      return novo
    })
    setValoresEditados(prev => {
      const novo = { ...prev }
      delete novo[disciplinaId]
      return novo
    })
  }

  const salvarEdicaoComValor = async (disciplina: DisciplinaSemana, campo: string, valor: any) => {
    const timestamp = new Date().toISOString().substr(14, 9)
    
    // Validação específica para mudança de disciplina
    if (campo === 'disciplinaId') {
      // Encontrar a semana que contém esta disciplina
      const semanaAtual = plano?.semanas.find(s => 
        s.disciplinas.some(d => d.id === disciplina.id)
      )
      
      if (semanaAtual) {
        // Verificar se já existe outra disciplina com o mesmo disciplinaId nesta semana
        const disciplinaExistente = semanaAtual.disciplinas.find(d => 
          d.id !== disciplina.id && // Não é a disciplina atual sendo editada
          (d.disciplinaId === valor || // Já tem a disciplinaId que queremos alterar
           (d.disciplina?.nome && disciplinas.find(disc => disc.id === valor)?.nome === d.disciplina.nome)) // Ou tem o mesmo nome
        )
        
        if (disciplinaExistente) {
          const nomeNovaDisciplina = disciplinas.find(d => d.id === valor)?.nome
          setError(`A disciplina "${nomeNovaDisciplina}" já existe neste ciclo de estudo`)
          
          // Cancelar edição e limpar estados
          setCamposEditando(prev => {
            const novo = { ...prev }
            delete novo[disciplina.id]
            return novo
          })
          setValoresEditados(prev => {
            const novo = { ...prev }
            delete novo[disciplina.id]
            return novo
          })
          setSalvandoId(null)
          return
        }
      }
    }
    
    try {
      setSalvandoId(disciplina.id)
      setSaving()
      
      const dadosAtualizacao: any = {
        disciplinaSemanaId: disciplina.id,
        [campo]: valor
      }


      const resultado = await updateProgressoEstudo(dadosAtualizacao)

      if (resultado.success) {
        const timestampSucesso = new Date().toISOString().substr(14, 9)
        setSuccess()
        
        // Atualizar localmente
        if (plano) {
          const novoPlano = { ...plano }
          novoPlano.semanas = novoPlano.semanas.map(semana => ({
            ...semana,
            disciplinas: semana.disciplinas.map(disc => {
              if (disc.id === disciplina.id) {
                const updatedDisc = { ...disc }
                
                if (campo === 'disciplinaId') {
                  const novaDisciplina = disciplinas.find(d => d.id === valor)
                  if (novaDisciplina) {
                    // Criar um objeto disciplina temporário com as propriedades necessárias
                    updatedDisc.disciplina = {
                      id: novaDisciplina.id,
                      nome: novaDisciplina.nome,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      peso: 1,
                      descricao: null,
                      cargaHoraria: 0
                    }
                    updatedDisc.disciplinaId = valor
                  }
                } else if (campo === 'diasEstudo') {
                  // Atualizar diasEstudo localmente
                  updatedDisc.diasEstudo = valor
                } else {
                  // Para outros campos, atualizar diretamente
                  (updatedDisc as any)[campo] = valor
                }
                
                return updatedDisc
              }
              return disc
            })
          }))
          setPlano(novoPlano)
        }
        
        // Limpar estados de edição com delay para disciplina
        if (campo === 'disciplinaId') {
          setTimeout(() => {
            setCamposEditando(prev => {
              const novo = { ...prev }
              delete novo[disciplina.id]
              return novo
            })
            setValoresEditados(prev => {
              const novo = { ...prev }
              delete novo[disciplina.id]
              return novo
            })
          }, 2000)
        } else if (campo === 'diasEstudo') {
          // Para diasEstudo, NÃO fazer nenhuma limpeza adicional
          // Não retornar precocemente, permitir que a atualização local aconteça
        }
      } else {
        setError(resultado.error || 'Erro ao atualizar disciplina')
      }
    } catch (error) {
      setError('Erro inesperado ao salvar')
    } finally {
      setSalvandoId(null)
    }
  }

  const salvarEdicao = async (disciplina: DisciplinaSemana) => {
    const timestamp = new Date().toISOString().substr(14, 9)
    
    const valoresParaSalvar = valoresEditados[disciplina.id]
    if (!valoresParaSalvar) {
      return
    }

    try {
      setSalvandoId(disciplina.id)
      setSaving()
      
      const dadosAtualizacao: any = {
        disciplinaSemanaId: disciplina.id,
      }

      // Aplicar apenas os valores que foram editados
      if ('minutosPlanejados' in valoresParaSalvar) {
        dadosAtualizacao.minutosPlanejados = valoresParaSalvar.minutosPlanejados
      }
      if ('questoesPlanejadas' in valoresParaSalvar) {
        dadosAtualizacao.questoesPlanejadas = valoresParaSalvar.questoesPlanejadas
      }
      if ('observacoes' in valoresParaSalvar) {
        dadosAtualizacao.observacoes = valoresParaSalvar.observacoes
      }
      if ('disciplinaId' in valoresParaSalvar) {
        dadosAtualizacao.disciplinaId = valoresParaSalvar.disciplinaId
      } else {
      }


      const resultado = await updateProgressoEstudo(dadosAtualizacao)

      if (resultado.success) {
        const timestampSucesso = new Date().toISOString().substr(14, 9)
        setSuccess()
        
        // Atualizar localmente sem recarregar
        if (plano) {
          const novoPlano = { ...plano }
          novoPlano.semanas = novoPlano.semanas.map(semana => ({
            ...semana,
            disciplinas: semana.disciplinas.map(disc => {
              if (disc.id === disciplina.id) {
                const updatedDisc = {
                  ...disc,
                  ...valoresParaSalvar
                }
                
                // Se mudou a disciplina, atualizar o objeto disciplina CORRETAMENTE
                if ('disciplinaId' in valoresParaSalvar) {
                  const novaDisciplina = disciplinas.find(d => d.id === valoresParaSalvar.disciplinaId)
                  if (novaDisciplina) {
                    // Criar um objeto disciplina completo com as propriedades necessárias
                    updatedDisc.disciplina = {
                      id: novaDisciplina.id,
                      nome: novaDisciplina.nome,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      peso: 1,
                      descricao: null,
                      cargaHoraria: 0
                    }
                    updatedDisc.disciplinaId = valoresParaSalvar.disciplinaId
                  } else {
                  }
                } else {
                  // Garantir que disciplina.disciplina sempre exista
                  if (!updatedDisc.disciplina) {
                    updatedDisc.disciplina = disc.disciplina
                  }
                }
                
                return updatedDisc
              }
              return disc
            })
          }))
          
          // Recalcular totais da semana se necessário
          if ('minutosPlanejados' in valoresParaSalvar) {
            novoPlano.semanas = novoPlano.semanas.map(semana => {
              const semanaAtualizada = semana.disciplinas.find(d => d.id === disciplina.id)
              if (semanaAtualizada) {
                const totalHoras = semana.disciplinas.reduce((acc, d) => acc + d.minutosPlanejados, 0)
                return { ...semana, totalHoras }
              }
              return semana
            })
          }
          
          setPlano(novoPlano)
        }
        
        // Para mudança de disciplina, dar delay na limpeza dos estados
        if ('disciplinaId' in valoresParaSalvar) {
          const timestampLimpeza = new Date().toISOString().substr(14, 9)
          
          // Delay para limpeza de AMBOS os estados quando é disciplina
          setTimeout(() => {
            const timestampDelayLimpeza = new Date().toISOString().substr(14, 9)
            
            setCamposEditando(prev => {
              const novo = { ...prev }
              delete novo[disciplina.id]
              return novo
            })
            
            setValoresEditados(prev => {
              const novo = { ...prev }
              delete novo[disciplina.id]
              return novo
            })
          }, 2000) // 2 segundos de delay para disciplina
        } else {
          // Para outros campos, limpar imediatamente
          const timestampLimpeza = new Date().toISOString().substr(14, 9)
          
          setCamposEditando(prev => {
            const novo = { ...prev }
            delete novo[disciplina.id]
            return novo
          })
          
          setValoresEditados(prev => {
            const novo = { ...prev }
            delete novo[disciplina.id]
            return novo
          })
        }
      } else {
        setError(resultado.error || 'Erro ao atualizar dados')
      }
    } catch (error) {
      setError('Erro inesperado ao salvar')
    } finally {
      setSalvandoId(null)
    }
  }

  const salvarEdicaoCompleta = async (
    disciplina: DisciplinaSemana,
    dados: { minutosPlanejados: number; questoesPlanejadas: number; observacoes: string }
  ) => {
    try {
      setSalvandoId(disciplina.id)
      setSaving()

      const dadosParaEnviar = {
        disciplinaSemanaId: disciplina.id,
        minutosPlanejados: Number(dados.minutosPlanejados),
        questoesPlanejadas: Number(dados.questoesPlanejadas),
        observacoes: String(dados.observacoes)
      }


      const resultado = await updateProgressoEstudo(dadosParaEnviar)

      if (resultado.success) {
        setSuccess()

        // Atualizar plano localmente
        if (plano) {
          const novoPlano = { ...plano }
          novoPlano.semanas = novoPlano.semanas.map(semana => ({
            ...semana,
            disciplinas: semana.disciplinas.map(disc => {
              if (disc.id === disciplina.id) {
                return {
                  ...disc,
                  minutosPlanejados: dados.minutosPlanejados,
                  questoesPlanejadas: dados.questoesPlanejadas,
                  observacoes: dados.observacoes
                }
              }
              return disc
            })
          }))

          setPlano(novoPlano)
        }
      } else {
        setError(resultado.error || 'Erro ao atualizar disciplina')
      }
    } catch (error) {
      setError('Erro inesperado ao salvar')
    } finally {
      setSalvandoId(null)
    }
  }

  const atualizarValorEditado = (disciplinaId: string, campo: string, valor: any) => {
    const timestamp = new Date().toISOString().substr(14, 9)

    setValoresEditados(prev => {
      const novo = {
        ...prev,
        [disciplinaId]: {
          ...prev[disciplinaId],
          [campo]: valor
        }
      }
      return novo
    })
  }

  const temEdicoesPendentes = (disciplinaId: string) => {
    return disciplinaId in camposEditando && disciplinaId in valoresEditados
  }

  const obterNomeDisciplina = (disciplinaSemana: DisciplinaSemana) => {
    // Primeiro tenta pegar o nome da disciplina atual
    if (disciplinaSemana.disciplina?.nome) {
      return disciplinaSemana.disciplina.nome
    }
    
    // Se não tem, tenta buscar pelo disciplinaId salvo
    if (disciplinaSemana.disciplinaId) {
      const disciplinaEncontrada = disciplinas.find(d => d.id === disciplinaSemana.disciplinaId)
      if (disciplinaEncontrada) {
        return disciplinaEncontrada.nome
      }
    }
    
    // Verificar se é uma disciplina recém-adicionada sem disciplina definida
    const isRecemAdicionada = disciplinaSemana.minutosPlanejados === 1 && 
                             disciplinaSemana.questoesPlanejadas === 0 && 
                             disciplinaSemana.diasEstudo === '[]' &&
                             disciplinaSemana.horasRealizadas === 0 &&
                             disciplinaSemana.questoesRealizadas === 0 &&
                             !disciplinaSemana.disciplina?.nome &&
                             !disciplinaSemana.disciplinaId
    
    if (isRecemAdicionada) {
      return '- (clique duplo para escolher disciplina)'
    }
    
    // Se ainda não tem, tenta pelos valores editados
    const valorEditado = valoresEditados[disciplinaSemana.id]?.disciplinaId
    if (valorEditado) {
      const disciplinaEncontrada = disciplinas.find(d => d.id === valorEditado)
      if (disciplinaEncontrada) {
        return disciplinaEncontrada.nome
      }
    }
    
    return 'Disciplina não definida'
  }

  const obterIdDisciplinaAtual = (disciplinaSemana: DisciplinaSemana) => {
    const timestamp = new Date().toISOString().substr(14, 9)
    
    // Primeiro verifica se há valor editado em memória (durante edição ativa)
    const valorEditado = valoresEditados[disciplinaSemana.id]?.disciplinaId
    if (valorEditado) {
      return valorEditado
    }
    
    // Verifica se já tem disciplinaId salvo no objeto (após salvamento)
    if (disciplinaSemana.disciplinaId) {
      return disciplinaSemana.disciplinaId
    }
    
    // Por último, busca o ID da disciplina atual pelo nome (disciplinas originais)
    if (disciplinaSemana.disciplina?.nome) {
      const disciplinaAtual = disciplinas.find(d => d.nome === disciplinaSemana.disciplina.nome)
      if (disciplinaAtual) {
        return disciplinaAtual.id
      }
    }

    return ''
  }

  // Função helper para obter dias do ciclo de uma semana específica
  const obterDiasCiclo = (semana: SemanaEstudoDetalhe) => {
    return calcularDiasCiclo(semana.dataInicio, semana.dataFim)
  }

  // Usar primeira semana como referência para dias (ou criar dinamicamente quando necessário)
  const diasSemana = plano?.semanas[0] ? obterDiasCiclo(plano.semanas[0]) : []

  const parseDiasEstudo = (diasEstudo?: string | null): string[] => {
    
    if (!diasEstudo || diasEstudo.trim() === '') {
      return []
    }
    
    // Se começa com '[' é JSON (pode ser array de números ou strings)
    if (diasEstudo.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(diasEstudo)
        
        if (Array.isArray(parsed)) {
          // Converter números para strings correspondentes aos dias
          const resultado = parsed.map(item => {
            if (typeof item === 'number') {
              const mapaDias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
              const diaString = mapaDias[item] || 'seg'
              return diaString
            }
            return String(item)
          })
          return resultado
        }
        return []
      } catch (error) {
        return []
      }
    }
    
    // Caso contrário, é CSV
    const resultado = diasEstudo.split(',').filter(d => d.trim())
    return resultado
  }

  const atualizarDiasEstudo = async (disciplina: DisciplinaSemana, diasSelecionados: string[]) => {
    // Padronizar para formato CSV (consistente com adicionar-ciclo)
    const diasCsv = diasSelecionados.join(',')
    
    // Marcar que estamos atualizando dias (bloquear carregarPlano)
    setAtualizandoDias(true)
    
    try {
      // Salvar diretamente no servidor sem atualização local prévia
      await salvarEdicaoComValor(disciplina, 'diasEstudo', diasCsv)
    } finally {
      // Sempre desmarcar flag, mesmo em caso de erro
      setTimeout(() => {
        setAtualizandoDias(false)
      }, 500) // Reduzido para 500ms
    }
  }

  const abrirModalAdicionarDisciplina = (semana: SemanaEstudoDetalhe, diaId?: string, diaVazio?: boolean) => {
    // Obter dias específicos deste ciclo
    const diasDesteCiclo = obterDiasCiclo(semana)

    if (!disciplinas.length) {
      setError('Nenhuma disciplina disponível. Por favor, cadastre disciplinas primeiro.')
      return
    }

    // Se o dia está vazio, abrir modal de copiar de outro dia
    if (diaVazio && diaId) {
      setSemanaParaAdicionar(semana)
      setDiaParaAdicionar(diaId)
      setModalCopiarDiaAberto(true)
      return
    }

    // Se foi clicado em um dia específico, mostrar apenas disciplinas que NÃO estão nesse dia
    if (diaId) {
      // Disciplinas que já estão nesse dia específico
      const disciplinasNoDia = semana.disciplinas.filter(d =>
        d.diasEstudo?.split(',').includes(diaId)
      ).map(d => d.disciplinaId)

      // Mostrar todas as disciplinas que não estão nesse dia específico
      const disciplinasDisponiveis = disciplinas.filter(d => !disciplinasNoDia.includes(d.id))

      if (!disciplinasDisponiveis.length) {
        const diaLabel = diasDesteCiclo.find(d => d.id === diaId)?.label || 'este dia'
        setError(`Todas as disciplinas já foram adicionadas a ${diaLabel}`)
        return
      }

      setSemanaParaAdicionar(semana)
      setDiaParaAdicionar(diaId)
      setDisciplinaSelecionada(disciplinasDisponiveis[0].id)
      setModalAdicionarDisciplinaAberto(true)
    } else {
      // Se não foi clicado em dia específico, usar lógica antiga (ciclo completo)
      const disciplinasNoCiclo = semana.disciplinas.map(d => d.disciplinaId)
      const disciplinasDisponiveis = disciplinas.filter(d => !disciplinasNoCiclo.includes(d.id))

      if (!disciplinasDisponiveis.length) {
        setError('Todas as disciplinas já foram adicionadas a este ciclo')
        return
      }

      setSemanaParaAdicionar(semana)
      setDiaParaAdicionar(null)
      setDisciplinaSelecionada(disciplinasDisponiveis[0].id)
      setModalAdicionarDisciplinaAberto(true)
    }
  }

  const confirmarAdicionarDisciplina = async () => {
    if (!semanaParaAdicionar || !disciplinaSelecionada) return

    // Fechar ambos os modais (qual estiver aberto)
    setModalAdicionarDisciplinaAberto(false)
    setModalCopiarDiaAberto(false)
    setSaving()

    try {
      const disciplina = disciplinas.find(d => d.id === disciplinaSelecionada)

      // Verificar se a disciplina já existe no ciclo
      const disciplinaExistente = semanaParaAdicionar.disciplinas.find(
        d => d.disciplinaId === disciplinaSelecionada
      )

      if (disciplinaExistente && diaParaAdicionar) {
        // Se a disciplina já existe e estamos adicionando em um dia específico,
        // adicionar o dia aos diasEstudo existentes

        const diasAtuais = disciplinaExistente.diasEstudo?.split(',').filter(d => d) || []
        const novosDias = [...new Set([...diasAtuais, diaParaAdicionar])].sort()
        const diasCsv = novosDias.join(',')

        const resultado = await updateProgressoEstudo({
          disciplinaSemanaId: disciplinaExistente.id,
          diasEstudo: diasCsv
        })

        if (resultado.success) {
          // Se tem disciplina origem para copiar, buscar os dados (independente do dia)
          if (disciplinaOrigemParaCopiar && diaParaAdicionar) {
            const disciplinaOrigem = plano?.semanas
              .flatMap(s => s.disciplinas)
              .find(d => d.id === disciplinaOrigemParaCopiar)

            if (disciplinaOrigem?.dias && disciplinaOrigem.dias.length > 0) {
              // Pegar o primeiro dia disponível da disciplina origem (o dia específico não importa)
              const primeiroDia = disciplinaOrigem.dias[0]

              await updateDisciplinaDia({
                disciplinaSemanaId: disciplinaExistente.id,
                dia: diaParaAdicionar,
                minutosPlanejados: primeiroDia.minutosPlanejados,
                questoesPlanejadas: primeiroDia.questoesPlanejadas,
                observacoes: primeiroDia.observacoes || undefined
              })
            }
          }

          setSuccess(`"${disciplina?.nome}" adicionada ao dia!`)
          await carregarPlano()
          setValoresEditados({})
        } else {
          setError(resultado.error || 'Erro ao adicionar dia à disciplina')
        }
      } else {
        // Se a disciplina não existe no ciclo, criar nova entrada

        const diasEstudo = diaParaAdicionar ? diaParaAdicionar : ''

        // Se tem disciplina origem selecionada, buscar seus dados para copiar
        let dadosParaCopiar: any = {
          minutosPlanejados: 1,
          questoesPlanejadas: 0
        }

        if (disciplinaOrigemParaCopiar) {
          // Buscar a disciplina origem em todas as semanas do plano
          const disciplinaOrigem = plano?.semanas
            .flatMap(s => s.disciplinas)
            .find(d => d.id === disciplinaOrigemParaCopiar)

          if (disciplinaOrigem) {
            dadosParaCopiar = {
              minutosPlanejados: disciplinaOrigem.minutosPlanejados,
              questoesPlanejadas: disciplinaOrigem.questoesPlanejadas,
              tipoVeiculo: disciplinaOrigem.tipoVeiculo || undefined,
              materialNome: disciplinaOrigem.materialNome || undefined,
              tempoVideoPlanejado: disciplinaOrigem.tempoVideoPlanejado || undefined,
              parametro: disciplinaOrigem.observacoes || undefined
            }
          }
        }

        const resultado = await adicionarDisciplinaSemana({
          semanaId: semanaParaAdicionar.id,
          disciplinaId: disciplinaSelecionada,
          diasEstudo,
          ...dadosParaCopiar
        })

        if (resultado.success) {
          // Se tem disciplina origem para copiar E ela tem dias alocados, copiar os DisciplinaDia
          if (disciplinaOrigemParaCopiar) {
            const disciplinaOrigem = plano?.semanas
              .flatMap(s => s.disciplinas)
              .find(d => d.id === disciplinaOrigemParaCopiar)

            if (disciplinaOrigem?.dias && disciplinaOrigem.dias.length > 0) {
              // Copiar cada DisciplinaDia da origem
              const disciplinaSemanaId = resultado.data.id

              for (const diaOrigem of disciplinaOrigem.dias) {
                await updateDisciplinaDia({
                  disciplinaSemanaId: disciplinaSemanaId,
                  dia: diaOrigem.dia,
                  minutosPlanejados: diaOrigem.minutosPlanejados,
                  questoesPlanejadas: diaOrigem.questoesPlanejadas,
                  observacoes: diaOrigem.observacoes || undefined
                })
              }
            }
          }

          const mensagem = disciplinaOrigemParaCopiar
            ? `Disciplina "${disciplina?.nome}" adicionada ao ciclo com dados copiados!`
            : `Disciplina "${disciplina?.nome}" adicionada ao ciclo!`
          setSuccess(mensagem)
          await carregarPlano()
          setValoresEditados({})
        } else {
          setError(resultado.error || 'Erro ao adicionar disciplina')
        }
      }
    } catch (error) {
      setError('Erro inesperado ao adicionar disciplina')
    } finally {
      setSemanaParaAdicionar(null)
      setDisciplinaSelecionada(null)
      setDisciplinaOrigemParaCopiar(null)
    }
  }

  const copiarDisciplinasDeDia = async () => {
    if (!semanaParaAdicionar || !diaParaAdicionar || !diaOrigemSelecionado) {
      setError('Dados insuficientes para copiar disciplinas')
      return
    }

    try {
      console.log('🔄 Iniciando cópia de disciplinas')
      console.log('📅 Dia origem:', diaOrigemSelecionado)
      console.log('📅 Dia destino:', diaParaAdicionar)
      console.log('📚 Semana:', semanaParaAdicionar.id)
      console.log('📊 Disciplinas na semana:', semanaParaAdicionar.disciplinas?.length || 0)

      // Debug detalhado: verificar estrutura das disciplinas
      console.log('🔍 DEBUG - Estrutura das disciplinas:')
      semanaParaAdicionar.disciplinas?.forEach((disc, idx) => {
        console.log(`  [${idx}] ${disc.disciplina?.nome || 'SEM NOME'}`)
        console.log(`      - ID: ${disc.id}`)
        console.log(`      - diasEstudo: "${disc.diasEstudo}"`)
        console.log(`      - dias array:`, disc.dias)
        console.log(`      - dias.length:`, disc.dias?.length || 0)
        if (disc.dias && disc.dias.length > 0) {
          disc.dias.forEach(d => {
            console.log(`        → dia: "${d.dia}", horas: ${d.minutosPlanejados}, questões: ${d.questoesPlanejadas}`)
          })
        }
      })

      // Debug: mostrar quais disciplinas têm o dia origem
      const disciplinasComDiaOrigem = semanaParaAdicionar.disciplinas?.filter(disc =>
        disc.dias?.some(d => d.dia === diaOrigemSelecionado)
      )
      console.log('📋 Disciplinas no dia origem:', disciplinasComDiaOrigem?.length || 0, disciplinasComDiaOrigem)

      // Chamar a nova action que cria disciplinas totalmente independentes
      const resultado = await copiarDisciplinasDia({
        semanaId: semanaParaAdicionar.id,
        diaOrigem: diaOrigemSelecionado,
        diaDestino: diaParaAdicionar
      })

      console.log('📦 Resultado da cópia:', resultado)

      if (!resultado.success) {
        setError(resultado.error || 'Erro ao copiar disciplinas')
        return
      }

      const diasDoCiclo = obterDiasCiclo(semanaParaAdicionar)
      const diaDestinoLabel = diasDoCiclo.find(d => d.id === diaParaAdicionar)?.label || 'dia'
      const diaOrigemLabel = diasDoCiclo.find(d => d.id === diaOrigemSelecionado)?.label || 'dia origem'

      console.log('✅ Cópia concluída!')
      setSuccess(resultado.message || `Disciplinas copiadas de ${diaOrigemLabel} para ${diaDestinoLabel}!`)
      await carregarPlano()
    } catch (error) {
      console.error('❌ Erro ao copiar disciplinas:', error)
      setError('Erro ao copiar disciplinas')
    } finally {
      setModalCopiarDiaAberto(false)
      setSemanaParaAdicionar(null)
      setDiaParaAdicionar(null)
      setDiaOrigemSelecionado(null)
      setModoCopia('dia')
    }
  }

  const excluirDisciplina = async (disciplinaSemanaId: string, semanaId: string, diaId?: string) => {

    setSaving()

    try {
      // Se diaId for fornecido, remover apenas daquele dia específico
      if (diaId) {

        // Buscar a disciplina atual no plano
        const semana = plano?.semanas.find(s => s.id === semanaId)
        const disciplina = semana?.disciplinas.find(d => d.id === disciplinaSemanaId)

        if (!disciplina) {
          setError('Disciplina não encontrada')
          return
        }

        // Remover o dia específico
        const diasAtuais = disciplina.diasEstudo?.split(',').filter(d => d) || []
        const novosDias = diasAtuais.filter(d => d !== diaId)

        // Se não sobrar nenhum dia, deletar completamente
        if (novosDias.length === 0) {
          const resultado = await deleteDisciplinaSemana(disciplinaSemanaId)

          if (resultado.success) {
            setSuccess('Disciplina removida completamente')
            await carregarPlano()
          } else {
            setError(resultado.error || 'Erro ao excluir disciplina')
          }
        } else {
          // Atualizar o campo diasEstudo E deletar o DisciplinaDia específico
          console.log(`🗑️ Removendo disciplina do dia ${diaId}`)
          console.log(`   Dias atuais: [${diasAtuais.join(', ')}]`)
          console.log(`   Novos dias: [${novosDias.join(', ')}]`)

          // Primeiro, deletar o DisciplinaDia do dia específico
          const disciplinaDia = disciplina.dias?.find(d => d.dia === diaId)
          if (disciplinaDia) {
            console.log(`   Deletando DisciplinaDia: ${disciplinaDia.id}`)
            const resultadoDelete = await deleteDisciplinaDia(disciplinaDia.id)
            if (!resultadoDelete.success) {
              console.error('   ⚠️ Erro ao deletar DisciplinaDia:', resultadoDelete.error)
            }
          }

          // Atualizar apenas os dias de estudo
          const resultado = await updateProgressoEstudo({
            disciplinaSemanaId: disciplinaSemanaId,
            diasEstudo: novosDias.join(',')
          })

          if (resultado.success) {
            // Buscar a semana para obter os dias corretos
            const semanaAtual = plano?.semanas.find(s => s.id === semanaId)
            const diasDoCiclo = semanaAtual ? obterDiasCiclo(semanaAtual) : []
            const diaLabel = diasDoCiclo.find(d => d.id === diaId)?.label || 'dia'
            setSuccess(`Disciplina removida de ${diaLabel}`)
            await carregarPlano()
          } else {
            setError(resultado.error || 'Erro ao atualizar dias de estudo')
          }
        }
      } else {
        // Comportamento padrão: deletar completamente

        const resultado = await deleteDisciplinaSemana(disciplinaSemanaId)

        if (resultado.success) {
          setSuccess('Disciplina excluída')
          await carregarPlano()
        } else {
          setError(resultado.error || 'Erro ao excluir disciplina')
        }
      }
    } catch (error) {
      setError('Erro inesperado ao excluir disciplina')
    } finally {
    }
  }

  const iniciarEdicaoData = (semanaId: string, dataInicio: string | Date, dataFim: string | Date) => {
    
    // Usar toISOString().split('T')[0] para evitar problemas de fuso horário
    const inicioDate = new Date(dataInicio)
    const fimDate = new Date(dataFim)
    
    const inicioFormatted = inicioDate.toISOString().split('T')[0]
    const fimFormatted = fimDate.toISOString().split('T')[0]
    
    
    setSemanaEditando(semanaId)
    setDataInicioEditando(inicioFormatted)
    setDataFimEditando(fimFormatted)
  }

  const cancelarEdicaoData = (semanaId: string) => {
    setSemanaEditando(null)
    setDataInicioEditando('')
    setDataFimEditando('')
  }

  const validarSobreposicaoDatas = (semanaId: string, novaDataInicio: string, novaDataFim: string) => {
    if (!plano) return true
    
    // Verificar sobreposição apenas com outros ciclos (não consigo mesmo)
    for (const semana of plano.semanas) {
      if (semana.id === semanaId) continue // Pular a própria semana
      
      const semanaInicioStr = format(new Date(semana.dataInicio), 'yyyy-MM-dd')
      const semanaFimStr = format(new Date(semana.dataFim), 'yyyy-MM-dd')
      
      // Verificar se há sobreposição real (permitir ciclos adjacentes)
      if ((novaDataInicio < semanaFimStr && novaDataFim > semanaInicioStr)) {
        setError(`As datas não podem se sobrepor ao Ciclo ${semana.numeroSemana}`)
        return false
      }
    }
    
    return true
  }

  const criarDataSemFusoHorario = (dataString: string) => {
    // Criar data local sem conversão de fuso horário
    const [ano, mes, dia] = dataString.split('-').map(Number)
    return new Date(ano, mes - 1, dia, 12, 0, 0) // Meio-dia local
  }

  const salvarEdicaoData = async (semanaId: string) => {
    if (!dataInicioEditando || !dataFimEditando) return

    // Validar apenas se data início não é posterior à data fim
    if (dataInicioEditando > dataFimEditando) {
      setError('Data de início não pode ser posterior à data de fim')
      return
    }

    // Validar sobreposição apenas com outros ciclos
    if (!validarSobreposicaoDatas(semanaId, dataInicioEditando, dataFimEditando)) {
      return
    }

    setSaving()
    
    try {
      
      // Enviar as datas exatamente como strings para evitar conversões
      const resultado = await updateSemanaEstudo({
        semanaId,
        dataInicio: dataInicioEditando,
        dataFim: dataFimEditando
      })
      
      if (resultado.success) {
        setSuccess()
        setSemanaEditando(null)
        setDataInicioEditando('')
        setDataFimEditando('')
        
        // Atualizar o plano local com as datas preservadas
        if (plano) {
          setPlano({
            ...plano,
            semanas: plano.semanas.map(s => 
              s.id === semanaId ? { 
                ...s, 
                dataInicio: criarDataSemFusoHorario(dataInicioEditando).toISOString(), 
                dataFim: criarDataSemFusoHorario(dataFimEditando).toISOString() 
              } : s
            )
          })
        }
      } else {
        setError(resultado.error || 'Erro ao salvar datas')
      }
    } catch (error) {
      setError('Erro ao salvar datas')
    }
  }

  const calcularProgressoTemporal = (dataInicio: string, dataFim: string) => {
    const inicio = new Date(dataInicio)
    const fim = new Date(dataFim)
    const hoje = new Date()
    
    // Se ainda não começou
    if (hoje < inicio) return 0
    
    // Se já terminou
    if (hoje > fim) return 100
    
    // Calcular progresso baseado nos dias
    const totalDias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
    const diasDecorridos = Math.ceil((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
    
    return Math.min(100, Math.max(0, (diasDecorridos / totalDias) * 100))
  }

  const alternarColapso = (semanaId: string) => {
    setSemanasColapsadas(prev => ({
      ...prev,
      [semanaId]: !prev[semanaId]
    }))
  }

  const adicionarNovoCiclo = async (cicloOrigemId?: string) => {
    if (!plano) return

    setSaving()

    try {
      // Calcular próximo número de semana
      const proximoNumero = plano.semanas.length > 0
        ? Math.max(...plano.semanas.map(s => s.numeroSemana)) + 1
        : 1

      // Determinar se estamos criando ciclo vazio ou copiando
      const cicloOrigem = cicloOrigemId
        ? plano.semanas.find(s => s.id === cicloOrigemId)
        : null

      // Se cicloOrigemId foi passado mas não encontrado, é um erro
      if (cicloOrigemId && !cicloOrigem) {
        setError('Ciclo origem não encontrado')
        return
      }

      // Calcular datas
      let dataInicioStr: string
      let dataFimStr: string

      if (plano.semanas.length > 0) {
        // Se há ciclos existentes, usar data após o último
        const ultimoCiclo = plano.semanas[plano.semanas.length - 1]

        // Obter data fim do último ciclo como string
        const ultimaDataFim = ultimoCiclo.dataFim instanceof Date
          ? ultimoCiclo.dataFim.toISOString().split('T')[0]
          : ultimoCiclo.dataFim.split('T')[0]

        // Calcular próxima data início (dia seguinte ao fim do último ciclo)
        const [ano, mes, dia] = ultimaDataFim.split('-').map(Number)
        const proximaDataInicio = new Date(ano, mes - 1, dia + 1, 12, 0, 0)
        const proximaDataFim = new Date(ano, mes - 1, dia + 7, 12, 0, 0) // +7 dias

        dataInicioStr = proximaDataInicio.toISOString().split('T')[0]
        dataFimStr = proximaDataFim.toISOString().split('T')[0]
      } else {
        // Se é o primeiro ciclo, usar semana atual
        const hoje = new Date()
        const diaSemana = hoje.getDay() // 0 = domingo, 1 = segunda

        const dataInicio = new Date(hoje)
        // Se hoje é segunda (1), usar hoje. Senão, próxima segunda
        if (diaSemana === 1) {
          // Hoje é segunda, usar hoje mesmo
        } else if (diaSemana === 0) {
          // Hoje é domingo, próxima segunda é amanhã (+1)
          dataInicio.setDate(hoje.getDate() + 1)
        } else {
          // Qualquer outro dia, calcular próxima segunda
          const diasParaSegunda = 8 - diaSemana
          dataInicio.setDate(hoje.getDate() + diasParaSegunda)
        }

        const dataFim = new Date(dataInicio)
        dataFim.setDate(dataInicio.getDate() + 6) // 7 dias depois

        dataInicioStr = dataInicio.toISOString().split('T')[0]
        dataFimStr = dataFim.toISOString().split('T')[0]
      }

      // Copiar disciplinas do ciclo origem (se houver) ou criar vazio
      const disciplinasCopiadas = cicloOrigem
        ? cicloOrigem.disciplinas.map(disciplina => ({
            disciplinaId: disciplina.disciplinaId,
            disciplinaNome: disciplina.disciplina.nome,
            minutosPlanejados: disciplina.minutosPlanejados,
            questoesPlanejadas: disciplina.questoesPlanejadas,
            tipoVeiculo: disciplina.tipoVeiculo || 'pdf',
            materialNome: disciplina.materialNome || '',
            diasEstudo: disciplina.diasEstudo ? disciplina.diasEstudo.split(',').filter(d => d.trim()) : [],
            tempoVideoPlanejado: disciplina.tempoVideoPlanejado,
            parametro: disciplina.observacoes || ''
          }))
        : [] // Array vazio para ciclo sem disciplinas

      
      const resultado = await adicionarCicloAoPlano(
        plano.id,
        proximoNumero,
        disciplinasCopiadas, // Disciplinas copiadas do ciclo anterior
        dataInicioStr, // Data início calculada
        dataFimStr // Data fim calculada
      )
      
      if (resultado.success) {
        setSuccess()
        // Adicionar o novo ciclo ao estado local sem recarregar
        if (plano && resultado.data) {
          const novoCiclo = resultado.data
          setPlano({
            ...plano,
            semanas: [...plano.semanas, novoCiclo]
          })
        }
      } else {
        setError(resultado.error || 'Erro ao adicionar ciclo')
      }
      
    } catch (error) {
      setError('Erro inesperado ao adicionar ciclo')
    }
  }

  const abrirModalEscolhaTipoCiclo = () => {
    setModalEscolhaTipoCicloAberto(true)
  }

  const abrirModalSelecionarCiclo = () => {
    if (!plano || plano.semanas.length === 0) {
      setError('Nenhum ciclo disponível para copiar')
      return
    }

    // Definir último ciclo como padrão selecionado
    const ultimoCiclo = plano.semanas[plano.semanas.length - 1]
    setCicloOrigemSelecionado(ultimoCiclo.id)
    setModalEscolhaTipoCicloAberto(false)
    setModalSelecionarCicloAberto(true)
  }

  const criarCicloVazio = () => {
    setModalEscolhaTipoCicloAberto(false)
    adicionarNovoCiclo(undefined)
  }
  
  const confirmarCriacaoCiclo = async () => {
    setModalSelecionarCicloAberto(false)
    await adicionarNovoCiclo(cicloOrigemSelecionado || undefined)
    setCicloOrigemSelecionado(null)
  }

  const confirmarExclusaoCiclo = async () => {
    if (!cicloParaExcluir) return

    try {
      setExcluindoCicloId(cicloParaExcluir.id)
      
      const resultado = await deleteCiclo(cicloParaExcluir.id, planoId)
      
      if (resultado.success) {
        setSuccess(`Ciclo ${cicloParaExcluir.numeroSemana} excluído com sucesso!`)
        // Recarregar o plano para refletir as mudanças
        await carregarPlano()
        setCicloParaExcluir(null)
      } else {
        setError(resultado.error || 'Erro ao excluir ciclo')
      }
    } catch (error) {
      setError('Erro inesperado ao excluir ciclo')
    } finally {
      setExcluindoCicloId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent, semanaId: string) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) return
    
    // Encontrar a semana atual
    const semanaAtual = plano?.semanas.find(s => s.id === semanaId)
    if (!semanaAtual) return

    const disciplinas = semanaAtual.disciplinas
    const activeIndex = disciplinas.findIndex(d => d.id === active.id)
    const overIndex = disciplinas.findIndex(d => d.id === over.id)
    
    if (activeIndex === overIndex) return


    try {
      setSaving()
      
      // Atualizar localmente primeiro para feedback imediato
      if (plano) {
        const novoPlano = { ...plano }
        const semana = novoPlano.semanas.find(s => s.id === semanaId)
        
        if (semana) {
          // Reordenar array local
          const novasDisciplinas = [...semana.disciplinas]
          const [disciplinaMovida] = novasDisciplinas.splice(activeIndex, 1)
          novasDisciplinas.splice(overIndex, 0, disciplinaMovida)
          
          semana.disciplinas = novasDisciplinas
          setPlano(novoPlano)
        }
      }

      // Criar nova ordem com base na posição final
      const novaOrdem = disciplinas.map((disciplina, index) => {
        if (disciplina.id === active.id) {
          return disciplina.id
        }
        return disciplina.id
      })
      
      // Ajustar a ordem baseada no movimento
      const disciplinaMovida = novaOrdem.splice(activeIndex, 1)[0]
      novaOrdem.splice(overIndex, 0, disciplinaMovida)

      // Salvar no servidor
      const resultado = await reordenarDisciplinas(novaOrdem)
      
      if (resultado.success) {
        setSuccess('Ordem das disciplinas atualizada!')
      } else {
        setError('Erro ao salvar nova ordem')
        // Recarregar em caso de erro para reverter mudanças locais
        await carregarPlano()
      }
    } catch (error) {
      setError('Erro inesperado ao reordenar')
      // Recarregar em caso de erro
      await carregarPlano()
    }
  }

  

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!plano) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <h3 className="text-lg font-semibold mb-2">Plano não encontrado</h3>
          <p className="text-muted-foreground">O plano de estudos solicitado não existe.</p>
        </CardContent>
      </Card>
    )
  }

  const stats = calcularEstatisticas()

  return (
    <div className="space-y-6">
      {/* Modal para adicionar disciplina */}
      <Dialog open={modalAdicionarDisciplinaAberto} onOpenChange={setModalAdicionarDisciplinaAberto}>
        <DialogContent className="w-[95vw] max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Adicionar Disciplina</DialogTitle>
            <DialogDescription>
              {diaParaAdicionar && semanaParaAdicionar
                ? `Selecione uma disciplina para adicionar ao ${obterDiasCiclo(semanaParaAdicionar).find(d => d.id === diaParaAdicionar)?.label || 'dia'}.`
                : 'Selecione uma disciplina para adicionar ao ciclo.'
              }
            </DialogDescription>
          </DialogHeader>

          {semanaParaAdicionar && (
            <div className="p-3 bg-blue-50 rounded-lg flex-shrink-0">
              <div className="text-sm font-medium text-blue-900">
                Ciclo {semanaParaAdicionar.numeroSemana}
                {diaParaAdicionar && ` - ${obterDiasCiclo(semanaParaAdicionar).find(d => d.id === diaParaAdicionar)?.label}`}
              </div>
              <div className="text-xs text-blue-600">
                {format(new Date(semanaParaAdicionar.dataInicio), 'dd/MM', { locale: ptBR })} - {format(new Date(semanaParaAdicionar.dataFim), 'dd/MM', { locale: ptBR })}
              </div>
            </div>
          )}

          {/* Seção para selecionar card existente para copiar OU criar nova */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Copiar de uma disciplina existente (opcional)</label>
              <Select
                value={disciplinaOrigemParaCopiar || 'nova'}
                onValueChange={(value) => {
                  if (value === 'nova') {
                    setDisciplinaOrigemParaCopiar(null)
                    setDisciplinaSelecionada(null)
                  } else {
                    setDisciplinaOrigemParaCopiar(value)
                    // Quando seleciona um card, automaticamente seleciona a disciplina correspondente
                    const disciplinaSemana = plano?.semanas
                      .flatMap(s => s.disciplinas)
                      .find(d => d.id === value)
                    if (disciplinaSemana) {
                      setDisciplinaSelecionada(disciplinaSemana.disciplinaId)
                    }
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Criar nova disciplina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nova">➕ Criar nova disciplina</SelectItem>
                  {plano?.semanas.flatMap(semana =>
                    semana.disciplinas
                      // Filtrar apenas disciplinas que não estão no dia/ciclo atual
                      .filter(disc => {
                        if (diaParaAdicionar) {
                          // Se é para um dia específico, mostrar apenas se não está nesse dia
                          const disciplinasNoDia = semanaParaAdicionar?.disciplinas
                            .filter(d => d.diasEstudo?.split(',').includes(diaParaAdicionar))
                            .map(d => d.disciplinaId) || []
                          return !disciplinasNoDia.includes(disc.disciplinaId)
                        } else {
                          // Se é para o ciclo completo, mostrar apenas se não está no ciclo
                          const disciplinasNoCiclo = semanaParaAdicionar?.disciplinas.map(d => d.disciplinaId) || []
                          return !disciplinasNoCiclo.includes(disc.disciplinaId)
                        }
                      })
                      .map(disc => {
                        const disciplinaInfo = disciplinas.find(d => d.id === disc.disciplinaId)
                        const cicloLabel = `Ciclo ${semana.numeroSemana}`
                        const diasLabel = disc.diasEstudo
                          ? obterDiasCiclo(semana)
                              .filter(dia => disc.diasEstudo?.split(',').includes(dia.id))
                              .map(dia => dia.label)
                              .join(', ')
                          : 'Todos os dias'

                        // Calcular total de horas e questões dos dias alocados
                        const totalHoras = disc.dias?.reduce((sum, dia) => sum + dia.minutosPlanejados, 0) || disc.minutosPlanejados || 0
                        const totalQuestoes = disc.dias?.reduce((sum, dia) => sum + dia.questoesPlanejadas, 0) || disc.questoesPlanejadas || 0

                        return {
                          id: disc.id,
                          disciplinaId: disc.disciplinaId,
                          label: `${disciplinaInfo?.nome || 'Disciplina'} - ${cicloLabel} (${diasLabel}) - ${totalHoras.toFixed(1)}h${totalQuestoes > 0 ? `, ${totalQuestoes} questões` : ''}`
                        }
                      })
                  ).map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mostrar lista de disciplinas apenas se NÃO selecionou card para copiar */}
            {!disciplinaOrigemParaCopiar && (
              <div>
                <label className="text-sm font-medium mb-2 block">Selecione a disciplina</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {semanaParaAdicionar && (() => {
                    // Se tem dia específico, filtrar disciplinas que não estão naquele dia
                    if (diaParaAdicionar) {
                      const disciplinasNoDia = semanaParaAdicionar.disciplinas
                        .filter(d => d.diasEstudo?.split(',').includes(diaParaAdicionar))
                        .map(d => d.disciplinaId)
                      return disciplinas.filter(d => !disciplinasNoDia.includes(d.id))
                    }
                    // Se não, filtrar disciplinas que não estão no ciclo
                    return disciplinas.filter(d =>
                      !semanaParaAdicionar.disciplinas.map(ds => ds.disciplinaId).includes(d.id)
                    )
                  })().map((disciplina) => (
                    <div key={disciplina.id} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`disciplina-${disciplina.id}`}
                        name="disciplinaSelecao"
                        value={disciplina.id}
                        checked={disciplinaSelecionada === disciplina.id}
                        onChange={(e) => setDisciplinaSelecionada(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 flex-shrink-0"
                      />
                      <label htmlFor={`disciplina-${disciplina.id}`} className="flex-1 cursor-pointer">
                        <div className="flex justify-between items-center p-2 border rounded hover:bg-gray-50">
                          <div className="font-medium text-sm truncate pr-2">
                            {disciplina.nome}
                          </div>
                          {disciplinaSelecionada === disciplina.id && (
                            <div className="text-blue-600 flex-shrink-0">
                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback da disciplina selecionada quando copiando */}
            {disciplinaOrigemParaCopiar && disciplinaSelecionada && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <p className="font-medium text-blue-900">
                  ✓ Copiando: {disciplinas.find(d => d.id === disciplinaSelecionada)?.nome}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setModalAdicionarDisciplinaAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarAdicionarDisciplina}
              disabled={!disciplinaSelecionada}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Copiar Disciplinas de Outro Dia */}
      <Dialog open={modalCopiarDiaAberto} onOpenChange={setModalCopiarDiaAberto}>
        <DialogContent className="max-w-md max-h-[75vh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-base">Adicionar ao {semanaParaAdicionar && diaParaAdicionar && obterDiasCiclo(semanaParaAdicionar).find(d => d.id === diaParaAdicionar)?.label}</DialogTitle>
            <DialogDescription className="text-xs">
              Ciclo {semanaParaAdicionar?.numeroSemana}
            </DialogDescription>
          </DialogHeader>

          {/* Tabs para escolher modo */}
          <div className="flex border-b px-4">
            <button
              onClick={() => setModoCopia('dia')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                modoCopia === 'dia'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Copiar Dia
            </button>
            <button
              onClick={() => setModoCopia('manual')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                modoCopia === 'manual'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ➕ Escolher
            </button>
          </div>

          {/* Conteúdo baseado no modo selecionado */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {modoCopia === 'dia' ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 mb-2">
                  Copiar disciplinas de:
                </p>
                <div className="space-y-1.5">
                  {semanaParaAdicionar && obterDiasCiclo(semanaParaAdicionar)
                    .filter(dia => dia.id !== diaParaAdicionar)
                    .map(dia => {
                      const disciplinasDoDia = semanaParaAdicionar.disciplinas.filter(disc => {
                        const diasEstudo = disc.diasEstudo?.split(',').filter(d => d) || []
                        return diasEstudo.includes(dia.id)
                      })

                      if (disciplinasDoDia.length === 0) return null

                      return (
                        <div
                          key={dia.id}
                          onClick={() => setDiaOrigemSelecionado(dia.id)}
                          className={`p-2 border rounded cursor-pointer transition-all ${
                            diaOrigemSelecionado === dia.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-sm">{dia.label}</div>
                              <div className="text-xs text-gray-500">
                                {disciplinasDoDia.length} disciplina(s)
                              </div>
                            </div>
                            {diaOrigemSelecionado === dia.id && (
                              <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      )
                    }).filter(Boolean)}
                </div>
                {semanaParaAdicionar && obterDiasCiclo(semanaParaAdicionar)
                  .filter(dia => dia.id !== diaParaAdicionar)
                  .every(dia => {
                    const disciplinasDoDia = semanaParaAdicionar.disciplinas.filter(disc => {
                      const diasEstudo = disc.diasEstudo?.split(',').filter(d => d) || []
                      return diasEstudo.includes(dia.id)
                    })
                    return disciplinasDoDia.length === 0
                  }) && (
                  <div className="text-center py-6 text-xs text-gray-500">
                    Nenhum dia com disciplinas neste ciclo.
                    <br />
                    Use "Escolher" para adicionar manualmente.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 mb-2">
                  Selecione uma disciplina:
                </p>
                <div className="space-y-1.5">
                  {semanaParaAdicionar && (() => {
                    const disciplinasNoDia = semanaParaAdicionar.disciplinas
                      .filter(d => d.diasEstudo?.split(',').includes(diaParaAdicionar || ''))
                      .map(d => d.disciplinaId)
                    return disciplinas.filter(d => !disciplinasNoDia.includes(d.id))
                  })().map((disciplina) => (
                    <div
                      key={disciplina.id}
                      onClick={() => {
                        setDisciplinaSelecionada(disciplina.id)
                        setDisciplinaOrigemParaCopiar(null)
                      }}
                      className={`flex items-center justify-between p-2 border rounded cursor-pointer transition-all ${
                        disciplinaSelecionada === disciplina.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      <div className="text-sm">
                        {disciplina.nome}
                      </div>
                      {disciplinaSelecionada === disciplina.id && (
                        <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 px-4 pb-4 pt-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setModalCopiarDiaAberto(false)
                setDiaOrigemSelecionado(null)
                setDisciplinaSelecionada(null)
                setModoCopia('dia')
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (modoCopia === 'dia') {
                  copiarDisciplinasDeDia()
                } else {
                  confirmarAdicionarDisciplina()
                }
              }}
              disabled={modoCopia === 'dia' ? !diaOrigemSelecionado : !disciplinaSelecionada}
            >
              {modoCopia === 'dia' ? 'Copiar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de escolha do tipo de ciclo */}
      <Dialog open={modalEscolhaTipoCicloAberto} onOpenChange={setModalEscolhaTipoCicloAberto}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Ciclo</DialogTitle>
            <DialogDescription>
              Escolha como deseja criar o novo ciclo de estudos
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div
              onClick={criarCicloVazio}
              className="flex items-start space-x-4 p-4 border-2 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all"
            >
              <div className="flex-shrink-0 mt-1">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-base mb-1">Criar Ciclo Vazio</h4>
                <p className="text-sm text-muted-foreground">
                  Inicie um novo ciclo do zero e adicione disciplinas manualmente
                </p>
              </div>
            </div>

            <div
              onClick={() => {
                if (plano && plano.semanas.length > 0) {
                  abrirModalSelecionarCiclo()
                }
              }}
              className={`flex items-start space-x-4 p-4 border-2 rounded-lg transition-all ${
                !plano || plano.semanas.length === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer hover:border-green-500 hover:bg-green-50/50'
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-base mb-1">Copiar de Ciclo Anterior</h4>
                <p className="text-sm text-muted-foreground">
                  Crie um novo ciclo copiando as configurações de um ciclo existente
                </p>
                {(!plano || plano.semanas.length === 0) && (
                  <p className="text-xs text-red-500 mt-2">
                    Nenhum ciclo disponível para copiar
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalEscolhaTipoCicloAberto(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para selecionar ciclo origem */}
      <Dialog open={modalSelecionarCicloAberto} onOpenChange={setModalSelecionarCicloAberto}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Escolher Ciclo para Copiar</DialogTitle>
            <DialogDescription>
              Selecione de qual ciclo você deseja copiar as disciplinas e configurações.
              As datas serão automaticamente definidas como próxima semana.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {plano?.semanas.map((semana) => (
              <div key={semana.id} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`ciclo-${semana.id}`}
                  name="cicloOrigem"
                  value={semana.id}
                  checked={cicloOrigemSelecionado === semana.id}
                  onChange={(e) => setCicloOrigemSelecionado(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor={`ciclo-${semana.id}`} className="flex-1 cursor-pointer">
                  <div className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <div className="font-medium">
                        Ciclo {semana.numeroSemana}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(semana.dataInicio).toLocaleDateString('pt-BR')} até {new Date(semana.dataFim).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {semana.disciplinas.length} disciplina(s), {semana.totalHoras}h planejadas
                      </div>
                    </div>
                    {cicloOrigemSelecionado === semana.id && (
                      <div className="text-blue-600">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalSelecionarCicloAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarCriacaoCiclo}
              disabled={!cicloOrigemSelecionado}
            >
              Criar Ciclo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Header do plano */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{plano.nome}</CardTitle>
              {plano.descricao && (
                <CardDescription className="mt-2">{plano.descricao}</CardDescription>
              )}
            </div>
            <Badge variant={plano.ativo ? "default" : "secondary"}>
              {plano.ativo ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Período</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(plano.dataInicio), "dd/MM/yyyy", { locale: ptBR })} - {" "}
                  {format(new Date(plano.dataFim), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Horas</p>
                <p className="text-sm text-muted-foreground">
                  {stats.horasRealizadas}h / {stats.totalHoras}h
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Progresso</p>
                <p className="text-sm text-muted-foreground">{stats.progresso}%</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={stats.progresso} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Semanas em tabela */}
      <div className="space-y-6">
        {plano.semanas.map((semana) => {
          // Filtrar APENAS disciplinas que TÊM dias alocados no NOVO formato (dia1, dia2, etc)
          const disciplinasComDias = semana.disciplinas.filter(d => {
            const diasEstudo = d.diasEstudo?.trim()
            // Ignorar formato antigo (seg, ter, qua, qui, sex, sab, dom)
            const formatoAntigo = diasEstudo && /^(seg|ter|qua|qui|sex|sab|dom)(,(seg|ter|qua|qui|sex|sab|dom))*$/.test(diasEstudo)
            // Aceitar apenas formato novo (dia1, dia2, etc) e não vazio
            const temDias = diasEstudo && diasEstudo !== '' && diasEstudo !== '[]' && !formatoAntigo
            return temDias
          })

          // Calcular total de horas planejadas da semana (somando as horas de cada dia alocado)
          const totalHorasPlanejadas = semana.disciplinas.reduce((acc, disciplina) => {
            const horasDisciplina = disciplina.dias?.reduce((accDias, dia) => accDias + dia.minutosPlanejados, 0) || 0
            return acc + horasDisciplina
          }, 0)

          // Calcular total de questões planejadas da semana (somando as questões de cada dia alocado)
          const totalQuestoesReais = semana.disciplinas.reduce((acc, disciplina) => {
            const questoesDisciplina = disciplina.dias?.reduce((accDias, dia) => accDias + dia.questoesPlanejadas, 0) || 0
            return acc + questoesDisciplina
          }, 0)

          // Calcular número de dias ÚNICOS com estudo (dias que têm pelo menos uma disciplina)
          const diasUnicos = new Set<string>()
          disciplinasComDias.forEach(d => {
            const dias = d.diasEstudo?.split(',').filter(dia => dia.trim()) || []
            dias.forEach(dia => diasUnicos.add(dia.trim()))
          })
          const numDiasComEstudo = diasUnicos.size

          // Calcular média de horas por dia (usando apenas os dias que têm estudo)
          const mediaHorasPorDia = numDiasComEstudo > 0 ? totalHorasPlanejadas / numDiasComEstudo : 0

          const progressoSemana = totalHorasPlanejadas > 0
            ? (semana.horasRealizadas / totalHorasPlanejadas) * 100
            : 0
          
          // Calcular progresso temporal
          const progressoTemporal = calcularProgressoTemporal(
            typeof semana.dataInicio === 'string' ? semana.dataInicio : semana.dataInicio.toISOString(),
            typeof semana.dataFim === 'string' ? semana.dataFim : semana.dataFim.toISOString()
          )
          const estaColapsado = semanasColapsadas[semana.id] !== undefined ? semanasColapsadas[semana.id] : true
          
          // Calcular cor baseada no progresso temporal
          const obterCorProgresso = (progresso: number) => {
            if (progresso <= 30) return 'from-blue-500 to-blue-400' // Azul para início
            if (progresso <= 60) return 'from-green-500 to-green-400' // Verde para meio
            if (progresso <= 80) return 'from-yellow-500 to-yellow-400' // Amarelo para próximo do fim
            return 'from-red-500 to-red-400' // Vermelho para fim
          }
          

          return (
            <Card key={semana.id}>
              <CardHeader>
                {/* Primeira linha: Título com período e botão excluir */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
                      {semana.numeroSemana}
                    </span>
                    <CardTitle className="flex items-center gap-2 flex-1">
                      Ciclo de Estudo {semana.numeroSemana}
                      {semanaEditando === semana.id ? (
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col gap-1">
                                <label className="text-xs text-muted-foreground">Início</label>
                                <Input
                                  type="date"
                                  value={dataInicioEditando}
                                  onChange={(e) => {
                                    setDataInicioEditando(e.target.value)
                                  }}
                                  className="w-auto text-sm"
                                  onBlur={() => salvarEdicaoData(semana.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') salvarEdicaoData(semana.id)
                                    if (e.key === 'Escape') cancelarEdicaoData(semana.id)
                                  }}
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs text-muted-foreground">Fim</label>
                                <Input
                                  type="date"
                                  value={dataFimEditando}
                                  onChange={(e) => {
                                    setDataFimEditando(e.target.value)
                                  }}
                                  className="w-auto text-sm"
                                  onBlur={() => salvarEdicaoData(semana.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') salvarEdicaoData(semana.id)
                                    if (e.key === 'Escape') cancelarEdicaoData(semana.id)
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <Badge 
                              variant="secondary" 
                              className="text-sm px-2 py-1 cursor-pointer hover:bg-gray-200"
                              onDoubleClick={() => iniciarEdicaoData(semana.id, semana.dataInicio, semana.dataFim)}
                            >
                              {format(new Date(semana.dataInicio), 'dd/MM', { locale: ptBR })} - {format(new Date(semana.dataFim), 'dd/MM/yyyy', { locale: ptBR })}
                            </Badge>
                          )}
                          
                          {/* Barra de progresso temporal */}
                          <div className="flex-1 bg-gray-200 rounded-full h-1 mx-4">
                            <div 
                              className={`bg-gradient-to-r ${obterCorProgresso(progressoTemporal)} h-full transition-all duration-500 rounded-full animate-pulse`}
                              style={{ width: `${progressoTemporal}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground min-w-[35px] text-right">{Math.round(progressoTemporal)}%</span>
                          
                          {/* Botão colapsar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => alternarColapso(semana.id)}
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                            title={estaColapsado ? "Expandir" : "Colapsar"}
                          >
                            {estaColapsado ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                          </Button>
                    </CardTitle>
                  </div>
                  <div>
                    {plano && plano.semanas.length > 1 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={excluindoCicloId === semana.id}
                            title={`Excluir Ciclo ${semana.numeroSemana}`}
                            onClick={() => setCicloParaExcluir(semana)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Excluir Ciclo</DialogTitle>
                            <DialogDescription>
                              Tem certeza de que deseja excluir o Ciclo {cicloParaExcluir?.numeroSemana}?
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                              Esta ação irá:
                            </div>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                              <li>Excluir todas as {cicloParaExcluir?.disciplinas.length || 0} disciplina{(cicloParaExcluir?.disciplinas.length || 0) !== 1 ? 's' : ''} do ciclo</li>
                              <li>Renumerar os ciclos posteriores</li>
                              <li>Não pode ser desfeita</li>
                            </ul>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setCicloParaExcluir(null)}
                              disabled={excluindoCicloId === cicloParaExcluir?.id}
                            >
                              Cancelar
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={confirmarExclusaoCiclo}
                              disabled={excluindoCicloId === cicloParaExcluir?.id}
                            >
                              {excluindoCicloId === cicloParaExcluir?.id ? "Excluindo..." : "Excluir Ciclo"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardHeader>

              {!estaColapsado && (
                <CardContent>
                  {/* Cards de informações do ciclo */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full mb-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Disciplinas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{disciplinasComDias.length}</div>
                        <p className="text-xs text-muted-foreground">
                          alocadas no ciclo
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total de Horas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatarMinutos(Math.round(totalHorasPlanejadas))}</div>
                        <p className="text-xs text-muted-foreground">
                          planejadas para o ciclo
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Média Horas/Dia
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatarMinutos(Math.round(mediaHorasPorDia))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          por dia de estudo
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Questões Planejadas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{totalQuestoesReais}</div>
                        <p className="text-xs text-muted-foreground">
                          para serem resolvidas
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Dias Estudados
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{numDiasComEstudo}</div>
                        <p className="text-xs text-muted-foreground">
                          dias com disciplinas
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Visualização Semanal de Distribuição de Horas */}
                  <div className="mb-6">
                    <VisualizacaoSemanal
                      disciplinas={semana.disciplinas}
                      semana={semana}
                      onDisciplinaActions={{
                        excluirDisciplina,
                        salvarEdicaoCompleta
                      }}
                      salvandoId={salvandoId}
                      onAdicionarDisciplina={(diaId, diaVazio) => abrirModalAdicionarDisciplina(semana, diaId, diaVazio)}
                      onRecarregarPlano={carregarPlano}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
        
        {/* Botão para adicionar novo ciclo */}
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={abrirModalEscolhaTipoCiclo}
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Adicionar Ciclo de Estudos
          </Button>
        </div>
      </div>
    </div>
  )
}
