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
import { deleteCiclo } from '@/interface/actions/plano-estudo/delete-ciclo'
import { adicionarDisciplinaSemana } from '@/interface/actions/plano-estudo/adicionar-disciplina'
import { deleteDisciplinaSemana } from '@/interface/actions/plano-estudo/delete-disciplina'
import { updateSemanaEstudo } from '@/interface/actions/plano-estudo/update-semana'
import { adicionarCicloAoPlano } from '@/interface/actions/plano-estudo/adicionar-ciclo'
import { reordenarDisciplinas } from '@/interface/actions/plano-estudo/reordenar-disciplinas'
import { listarDisciplinas } from '@/interface/actions/disciplina/list'
import { Calendar, Clock, Target, Book, FileText, Video, Save, Trash2, Plus, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
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

interface DisciplinaSemana {
  id: string
  createdAt: Date
  updatedAt: Date
  disciplinaId: string
  semanaId: string
  horasPlanejadas: number
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
  disciplina: {
    id: string
    nome: string
    createdAt: Date
    updatedAt: Date
    peso: number
    descricao: string | null
    cargaHoraria: number
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
    excluirDisciplina: (disciplinaSemanaId: string, semanaId: string) => void
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

  console.log(`📋 Renderizando disciplina ${index + 1}/${semana.disciplinas.length}:`, {
    id: disciplina.id,
    nome: disciplina.disciplina?.nome || 'Sem nome',
    diasEstudo: disciplina.diasEstudo,
    semanaId: semana.id,
    numeroSemana: semana.numeroSemana
  })

  return [
    <TableRow 
      key={`${disciplina.id}-main`}
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
                  console.log(`⏰ ${timestamp} 🎯 SELECT ONVALUECHANGE CHAMADO:`, valor)
                  console.log(`⏰ ${timestamp} 🎯 Disciplina atual antes da mudança:`, disciplina.disciplina?.nome)

                  // PRIMEIRO: Atualizar valor editado em memória
                  console.log(`⏰ ${timestamp} 🎯 PASSO 1: Atualizando valoresEditados...`)
                  console.log(`⏰ ${timestamp} 🎯 VALOR SENDO SALVO NO ESTADO:`, valor)
                  onDisciplinaActions.atualizarValorEditado(disciplina.id, 'disciplinaId', valor)

                  // SEGUNDO: Atualizar plano local para feedback visual imediato
                  const novaDisciplina = disciplinas.find(d => d.id === valor)
                  if (novaDisciplina && plano) {
                    console.log(`⏰ ${timestamp} 🎯 PASSO 2: Atualizando plano local com:`, novaDisciplina.nome)
                    // Lógica de atualização local...

                    // TERCEIRO: Salvar no servidor após um pequeno delay
                    setTimeout(() => {
                      const timestampDelay = new Date().toISOString().substr(14, 9)
                      console.log(`⏰ ${timestampDelay} 🎯 PASSO 3: Iniciando salvamento no servidor...`)
                      onDisciplinaActions.salvarEdicaoComValor(disciplina, 'disciplinaId', valor)
                    }, 50)
                  } else {
                    console.log(`⏰ ${timestamp} ❌ Nova disciplina não encontrada:`, valor)
                  }
                }}
                onOpenChange={(isOpen) => {
                  // Quando o select fechar (isOpen = false), cancelar edição
                  // Usamos um timeout para dar tempo do onValueChange executar primeiro
                  if (!isOpen) {
                    setTimeout(() => {
                      console.log('🔄 Select fechou, cancelando edição da disciplina')
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
                    console.log('Iniciando edição de disciplina com ID:', idDisciplinaAtual)
                    onDisciplinaActions.iniciarEdicao(disciplina.id, 'disciplinaId', idDisciplinaAtual)
                  } else {
                    console.log('⚠️ Edição bloqueada - há valores pendentes de salvamento')
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
        {estaEditando === 'horasPlanejadas' ? (
          <Input
            className="w-20 text-center"
            type="text"
            value={valoresEditadosDisciplina.horasPlanejadas || disciplina.horasPlanejadas}
            onChange={(e) => {
              const valor = e.target.value.replace(/[^0-9]/g, '')
              onDisciplinaActions.atualizarValorEditado(disciplina.id, 'horasPlanejadas', parseInt(valor) || 0)
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
            onDoubleClick={() => onDisciplinaActions.iniciarEdicao(disciplina.id, 'horasPlanejadas', disciplina.horasPlanejadas)}
          >
            {disciplina.horasPlanejadas}h
          </span>
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
            
            console.log(`🔍 Renderizando ${dia.id} para disciplina ${disciplina.id} (${disciplina.disciplina?.nome}):`, {
              diasEstudo: disciplina.diasEstudo,
              diasSelecionados,
              isChecked,
              diaId: dia.id,
              semanaId: semana.id,
              numeroSemana: semana.numeroSemana
            })
            
            return (
              <div key={`${disciplina.id}-${dia.id}-${disciplina.diasEstudo || 'empty'}`} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  id={`${disciplina.id}-${dia.id}`}
                  checked={isChecked}
                  key={`checkbox-${disciplina.id}-${dia.id}-${isChecked}`}
                  onChange={(e) => {
                    const checked = e.target.checked
                    console.log(`🗓️ Native Checkbox ${dia.id} (${dia.label}) para disciplina ${disciplina.id}`)
                    console.log(`🗓️ Estado atual: ${isChecked} → ${checked}`)
                    
                    const diasAtuais = onDisciplinaActions.parseDiasEstudo(disciplina.diasEstudo)
                    console.log(`🗓️ Dias atuais:`, diasAtuais)
                    
                    let novosDias: string[]
                    
                    if (checked) {
                      novosDias = [...diasAtuais.filter(d => d !== dia.id), dia.id]
                    } else {
                      novosDias = diasAtuais.filter(d => d !== dia.id)
                    }
                    
                    console.log(`🗓️ Novos dias calculados:`, novosDias)
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
  const [modalSelecionarCicloAberto, setModalSelecionarCicloAberto] = useState(false)
  const [cicloOrigemSelecionado, setCicloOrigemSelecionado] = useState<string | null>(null)
  
  // Estados para modal de seleção de disciplina
  const [modalAdicionarDisciplinaAberto, setModalAdicionarDisciplinaAberto] = useState(false)
  const [semanaParaAdicionar, setSemanaParaAdicionar] = useState<SemanaEstudoDetalhe | null>(null)
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<string | null>(null)

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
    console.log(`⏰ ${timestamp} 🔄 CARREGANDO PLANO - pode sobrescrever disciplinas alteradas!`) // Debug
    console.log(`⏰ ${timestamp} 📍 STACK TRACE COMPLETO:`, new Error().stack) // Debug stack trace completo
    
    // Bloquear carregamento se estamos atualizando dias
    if (atualizandoDias) {
      console.log(`⏰ ${timestamp} 🚫 BLOQUEADO: Não carregar plano durante atualização de dias`)
      return
    }
    try {
      const resultado = await getPlanoEstudoById(planoId)
      if (resultado.success && resultado.data) {
        console.log('📋 Plano carregado do servidor:', resultado.data) // Debug
        
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
                  console.log('🔄 Preservando disciplina alterada localmente:', disciplinaLocal.disciplina.nome)
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
      console.error('Erro ao carregar plano:', error)
    } finally {
      setLoading(false)
    }
  }

  const carregarDisciplinas = async () => {
    try {
      const resultado = await listarDisciplinas()
      if (resultado.success && resultado.data) {
        setDisciplinas(resultado.data)
      }
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error)
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
    console.log(`⏰ ${timestamp} 💾 SALVAR EDICAO COM VALOR DIRETO:`, { disciplinaId: disciplina.id, campo, valor })
    
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
          console.log('⚠️ Validação falhou: disciplina duplicada na semana') // Debug
          
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

      console.log('Salvando com valor direto:', dadosAtualizacao) // Debug

      const resultado = await updateProgressoEstudo(dadosAtualizacao)

      if (resultado.success) {
        const timestampSucesso = new Date().toISOString().substr(14, 9)
        console.log(`⏰ ${timestampSucesso} ✅ SALVAMENTO COM VALOR DIRETO BEM-SUCEDIDO`)
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
                    console.log('✅ Disciplina atualizada com valor direto:', updatedDisc.disciplina.nome)
                  }
                } else if (campo === 'diasEstudo') {
                  // Atualizar diasEstudo localmente
                  updatedDisc.diasEstudo = valor
                  console.log('✅ Dias da semana atualizados localmente:', valor)
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
          console.log(`⏰ ${new Date().toISOString().substr(14, 9)} ✅ DIAS ESTUDO COM VALOR DIRETO: Mantendo estados intactos`)
          // Não retornar precocemente, permitir que a atualização local aconteça
        }
      } else {
        setError(resultado.error || 'Erro ao atualizar disciplina')
      }
    } catch (error) {
      console.error('Erro ao salvar com valor direto:', error)
      setError('Erro inesperado ao salvar')
    } finally {
      setSalvandoId(null)
    }
  }

  const salvarEdicao = async (disciplina: DisciplinaSemana) => {
    const timestamp = new Date().toISOString().substr(14, 9)
    console.log(`⏰ ${timestamp} 💾 INICIANDO SALVAR EDIÇÃO para:`, disciplina.id)
    
    const valoresParaSalvar = valoresEditados[disciplina.id]
    if (!valoresParaSalvar) {
      console.log(`⏰ ${timestamp} ❌ NENHUM VALOR PARA SALVAR, abortando`)
      return
    }

    console.log(`⏰ ${timestamp} 💾 VALORES QUE SERÃO SALVOS:`, valoresParaSalvar)
    console.log(`⏰ ${timestamp} 🔍 VERIFICAÇÃO: 'disciplinaId' in valoresParaSalvar =`, 'disciplinaId' in valoresParaSalvar)
    try {
      setSalvandoId(disciplina.id)
      setSaving()
      
      const dadosAtualizacao: any = {
        disciplinaSemanaId: disciplina.id,
      }

      // Aplicar apenas os valores que foram editados
      if ('horasPlanejadas' in valoresParaSalvar) {
        dadosAtualizacao.horasPlanejadas = valoresParaSalvar.horasPlanejadas
        console.log('✅ Adicionando horasPlanejadas:', valoresParaSalvar.horasPlanejadas) // Debug
      }
      if ('questoesPlanejadas' in valoresParaSalvar) {
        dadosAtualizacao.questoesPlanejadas = valoresParaSalvar.questoesPlanejadas
        console.log('✅ Adicionando questoesPlanejadas:', valoresParaSalvar.questoesPlanejadas) // Debug
      }
      if ('observacoes' in valoresParaSalvar) {
        dadosAtualizacao.observacoes = valoresParaSalvar.observacoes
        console.log('✅ Adicionando observacoes:', valoresParaSalvar.observacoes) // Debug
      }
      if ('disciplinaId' in valoresParaSalvar) {
        dadosAtualizacao.disciplinaId = valoresParaSalvar.disciplinaId
        console.log('✅ Adicionando disciplinaId:', valoresParaSalvar.disciplinaId) // Debug
      } else {
        console.log('❌ disciplinaId NÃO encontrado em valoresParaSalvar') // Debug
        console.log('📊 valoresParaSalvar completo:', valoresParaSalvar) // Debug
      }

      console.log('Salvando:', dadosAtualizacao) // Debug

      const resultado = await updateProgressoEstudo(dadosAtualizacao)

      if (resultado.success) {
        const timestampSucesso = new Date().toISOString().substr(14, 9)
        console.log(`⏰ ${timestampSucesso} ✅ SALVAMENTO BEM-SUCEDIDO, atualizando localmente...`)
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
                    console.log('✅ Disciplina atualizada no salvarEdicao:', updatedDisc.disciplina.nome) // Debug
                  } else {
                    console.log('❌ Nova disciplina não encontrada:', valoresParaSalvar.disciplinaId) // Debug
                  }
                } else {
                  // Garantir que disciplina.disciplina sempre exista
                  if (!updatedDisc.disciplina) {
                    console.log('⚠️ Disciplina não definida, mantendo original') // Debug
                    updatedDisc.disciplina = disc.disciplina
                  }
                }
                
                return updatedDisc
              }
              return disc
            })
          }))
          
          // Recalcular totais da semana se necessário
          if ('horasPlanejadas' in valoresParaSalvar) {
            novoPlano.semanas = novoPlano.semanas.map(semana => {
              const semanaAtualizada = semana.disciplinas.find(d => d.id === disciplina.id)
              if (semanaAtualizada) {
                const totalHoras = semana.disciplinas.reduce((acc, d) => acc + d.horasPlanejadas, 0)
                return { ...semana, totalHoras }
              }
              return semana
            })
          }
          
          setPlano(novoPlano)
          console.log('Plano atualizado:', novoPlano) // Debug
        }
        
        // Para mudança de disciplina, dar delay na limpeza dos estados
        if ('disciplinaId' in valoresParaSalvar) {
          const timestampLimpeza = new Date().toISOString().substr(14, 9)
          console.log(`⏰ ${timestampLimpeza} 🧹 DISCIPLINA: Mantendo estados por 2 segundos para estabilizar Select...`)
          
          // Delay para limpeza de AMBOS os estados quando é disciplina
          setTimeout(() => {
            const timestampDelayLimpeza = new Date().toISOString().substr(14, 9)
            console.log(`⏰ ${timestampDelayLimpeza} 🧹 LIMPANDO ESTADOS APÓS DELAY (disciplina)`)
            
            setCamposEditando(prev => {
              const novo = { ...prev }
              delete novo[disciplina.id]
              console.log(`⏰ ${timestampDelayLimpeza} 🧹 CAMPOS EDITANDO APÓS LIMPEZA:`, novo)
              return novo
            })
            
            setValoresEditados(prev => {
              const novo = { ...prev }
              delete novo[disciplina.id]
              console.log(`⏰ ${timestampDelayLimpeza} 🧹 VALORES EDITADOS APÓS LIMPEZA:`, novo)
              return novo
            })
          }, 2000) // 2 segundos de delay para disciplina
        } else {
          // Para outros campos, limpar imediatamente
          const timestampLimpeza = new Date().toISOString().substr(14, 9)
          console.log(`⏰ ${timestampLimpeza} 🧹 LIMPANDO ESTADO DE EDIÇÃO IMEDIATAMENTE (outros campos)...`)
          
          setCamposEditando(prev => {
            const novo = { ...prev }
            delete novo[disciplina.id]
            console.log(`⏰ ${timestampLimpeza} 🧹 CAMPOS EDITANDO APÓS LIMPEZA:`, novo)
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
      console.error('Erro ao salvar:', error) // Debug
      setError('Erro inesperado ao salvar')
    } finally {
      setSalvandoId(null)
    }
  }

  const atualizarValorEditado = (disciplinaId: string, campo: string, valor: any) => {
    const timestamp = new Date().toISOString().substr(14, 9)
    console.log(`⏰ ${timestamp} 📝 ATUALIZANDO VALOR EDITADO:`, { disciplinaId, campo, valor })
    console.log(`⏰ ${timestamp} 📝 ESTADO ANTERIOR:`, valoresEditados[disciplinaId])
    
    setValoresEditados(prev => {
      const novo = {
        ...prev,
        [disciplinaId]: {
          ...prev[disciplinaId],
          [campo]: valor
        }
      }
      console.log(`⏰ ${timestamp} 📝 NOVO ESTADO COMPLETO:`, novo)
      console.log(`⏰ ${timestamp} 📝 ESPECÍFICO PARA ${disciplinaId}:`, novo[disciplinaId])
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
    const isRecemAdicionada = disciplinaSemana.horasPlanejadas === 1 && 
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
    console.log(`⏰ ${timestamp} 🔍 OBTER ID DISCIPLINA ATUAL para:`, disciplinaSemana.id) // Debug
    
    // Primeiro verifica se há valor editado em memória (durante edição ativa)
    const valorEditado = valoresEditados[disciplinaSemana.id]?.disciplinaId
    if (valorEditado) {
      console.log('✅ Valor editado encontrado:', valorEditado) // Debug
      return valorEditado
    }
    
    // Verifica se já tem disciplinaId salvo no objeto (após salvamento)
    if (disciplinaSemana.disciplinaId) {
      console.log('✅ DisciplinaId do objeto:', disciplinaSemana.disciplinaId) // Debug
      return disciplinaSemana.disciplinaId
    }
    
    // Por último, busca o ID da disciplina atual pelo nome (disciplinas originais)
    if (disciplinaSemana.disciplina?.nome) {
      const disciplinaAtual = disciplinas.find(d => d.nome === disciplinaSemana.disciplina.nome)
      if (disciplinaAtual) {
        console.log('✅ ID encontrado por nome:', disciplinaAtual.id, 'para disciplina:', disciplinaSemana.disciplina.nome) // Debug
        return disciplinaAtual.id
      }
    }
    
    console.log('❌ Nenhum ID encontrado para disciplina:', disciplinaSemana.disciplina?.nome || 'undefined') // Debug
    console.log('📊 Estado atual:', {
      disciplinaSemanaId: disciplinaSemana.id,
      valoresEditados: valoresEditados[disciplinaSemana.id],
      disciplinaId: disciplinaSemana.disciplinaId,
      disciplinaNome: disciplinaSemana.disciplina?.nome
    }) // Debug detalhado
    return ''
  }

  const obterIconeVeiculo = (tipo?: string) => {
    switch (tipo) {
      case 'video': return Video
      case 'pdf': return FileText
      case 'livro': return Book
      case 'apostila': return FileText
      default: return Book
    }
  }

  const diasSemana = [
    { id: 'seg', label: 'Seg' },
    { id: 'ter', label: 'Ter' },
    { id: 'qua', label: 'Qua' },
    { id: 'qui', label: 'Qui' },
    { id: 'sex', label: 'Sex' },
    { id: 'sab', label: 'Sáb' },
    { id: 'dom', label: 'Dom' },
  ]

  const parseDiasEstudo = (diasEstudo?: string | null): string[] => {
    console.log('🔍 parseDiasEstudo chamado com:', diasEstudo)
    
    if (!diasEstudo || diasEstudo.trim() === '') {
      console.log('🔍 diasEstudo vazio, retornando []')
      return []
    }
    
    // Se começa com '[' é JSON (pode ser array de números ou strings)
    if (diasEstudo.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(diasEstudo)
        console.log('🔍 JSON parsed:', parsed)
        
        if (Array.isArray(parsed)) {
          // Converter números para strings correspondentes aos dias
          const resultado = parsed.map(item => {
            if (typeof item === 'number') {
              const mapaDias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
              const diaString = mapaDias[item] || 'seg'
              console.log(`🔍 Convertendo número ${item} para string ${diaString}`)
              return diaString
            }
            return String(item)
          })
          console.log('🔍 Resultado final JSON:', resultado)
          return resultado
        }
        return []
      } catch (error) {
        console.warn('Erro ao fazer parse JSON do diasEstudo:', diasEstudo, error)
        return []
      }
    }
    
    // Caso contrário, é CSV
    const resultado = diasEstudo.split(',').filter(d => d.trim())
    console.log('🔍 Resultado final CSV:', resultado)
    return resultado
  }

  const atualizarDiasEstudo = async (disciplina: DisciplinaSemana, diasSelecionados: string[]) => {
    // Padronizar para formato CSV (consistente com adicionar-ciclo)
    const diasCsv = diasSelecionados.join(',')
    console.log('🗓️ Salvando dias da semana (formato CSV):', { disciplinaId: disciplina.id, diasSelecionados, diasCsv })
    
    // Marcar que estamos atualizando dias (bloquear carregarPlano)
    setAtualizandoDias(true)
    
    try {
      // Salvar diretamente no servidor sem atualização local prévia
      await salvarEdicaoComValor(disciplina, 'diasEstudo', diasCsv)
    } finally {
      // Sempre desmarcar flag, mesmo em caso de erro
      setTimeout(() => {
        setAtualizandoDias(false)
        console.log('🗓️ Atualização de dias finalizada, carregarPlano liberado novamente')
      }, 500) // Reduzido para 500ms
    }
  }

  const abrirModalAdicionarDisciplina = (semana: SemanaEstudoDetalhe) => {
    if (!disciplinas.length) {
      setError('Nenhuma disciplina disponível')
      return
    }
    
    // Encontrar disciplinas que ainda não estão no ciclo
    const disciplinasNoCiclo = semana.disciplinas.map(d => d.disciplinaId)
    const disciplinasDisponiveis = disciplinas.filter(d => !disciplinasNoCiclo.includes(d.id))
    
    if (!disciplinasDisponiveis.length) {
      setError('Todas as disciplinas já foram adicionadas a este ciclo')
      return
    }
    
    // Definir primeira disciplina disponível como padrão
    setSemanaParaAdicionar(semana)
    setDisciplinaSelecionada(disciplinasDisponiveis[0].id)
    setModalAdicionarDisciplinaAberto(true)
  }

  const confirmarAdicionarDisciplina = async () => {
    if (!semanaParaAdicionar || !disciplinaSelecionada) return
    
    setModalAdicionarDisciplinaAberto(false)
    setSaving()
    
    try {
      const disciplina = disciplinas.find(d => d.id === disciplinaSelecionada)
      console.log('➕ Adicionando disciplina selecionada:', disciplina?.nome)
      
      // Chamar a nova action para adicionar disciplina
      const resultado = await adicionarDisciplinaSemana({
        semanaId: semanaParaAdicionar.id,
        disciplinaId: disciplinaSelecionada,
        horasPlanejadas: 1,
        questoesPlanejadas: 0,
        diasEstudo: '[]'
      })
      
      if (resultado.success) {
        setSuccess(`Disciplina "${disciplina?.nome}" adicionada ao ciclo!`)
        // Recarregar o plano para obter a nova disciplina
        await carregarPlano()
        // Limpar valores editados para mostrar dados reais do banco
        setValoresEditados({})
      } else {
        setError(resultado.error || 'Erro ao adicionar disciplina')
      }
    } catch (error) {
      console.error('Erro ao adicionar disciplina:', error)
      setError('Erro inesperado ao adicionar disciplina')
    } finally {
      setSemanaParaAdicionar(null)
      setDisciplinaSelecionada(null)
    }
  }

  const excluirDisciplina = async (disciplinaSemanaId: string, semanaId: string) => {
    setSaving()
    
    try {
      console.log('🔄 Excluindo disciplina:', disciplinaSemanaId, 'da semana:', semanaId)
      
      const resultado = await deleteDisciplinaSemana(disciplinaSemanaId)
      
      if (resultado.success) {
        setSuccess()
        // Recarregar o plano para refletir a exclusão
        await carregarPlano()
      } else {
        setError(resultado.error || 'Erro ao excluir disciplina')
      }
    } catch (error) {
      console.error('Erro ao excluir disciplina:', error)
      setError('Erro inesperado ao excluir disciplina')
    }
  }

  const iniciarEdicaoData = (semanaId: string, dataInicio: string | Date, dataFim: string | Date) => {
    console.log('🎯 INICIAR EDIÇÃO:', { semanaId, dataInicio, dataFim })
    
    // Usar toISOString().split('T')[0] para evitar problemas de fuso horário
    const inicioDate = new Date(dataInicio)
    const fimDate = new Date(dataFim)
    
    const inicioFormatted = inicioDate.toISOString().split('T')[0]
    const fimFormatted = fimDate.toISOString().split('T')[0]
    
    console.log('🎯 DATAS FORMATADAS:', { inicioFormatted, fimFormatted })
    
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
      console.log('🔄 Salvando datas da semana:', semanaId, { dataInicio: dataInicioEditando, dataFim: dataFimEditando })
      
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
      console.error('Erro ao salvar datas:', error)
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
      const proximoNumero = Math.max(...plano.semanas.map(s => s.numeroSemana)) + 1
      
      // Determinar ciclo origem (selecionado ou último)
      const cicloOrigem = cicloOrigemId 
        ? plano.semanas.find(s => s.id === cicloOrigemId)
        : plano.semanas[plano.semanas.length - 1]
        
      if (!cicloOrigem) {
        setError('Ciclo origem não encontrado')
        return
      }
      
      // Calcular datas baseadas no último ciclo (sempre último para datas)
      const ultimoCiclo = plano.semanas[plano.semanas.length - 1]
      console.log('📅 Último ciclo (para datas):', { dataFim: ultimoCiclo.dataFim, formato: typeof ultimoCiclo.dataFim })
      console.log('📋 Ciclo origem (para disciplinas):', { numero: cicloOrigem.numeroSemana, disciplinas: cicloOrigem.disciplinas.length })
      
      // Obter data fim do último ciclo como string
      const ultimaDataFim = ultimoCiclo.dataFim instanceof Date 
        ? ultimoCiclo.dataFim.toISOString().split('T')[0]
        : ultimoCiclo.dataFim.split('T')[0]
      
      // Calcular próxima data início (dia seguinte ao fim do último ciclo)
      const [ano, mes, dia] = ultimaDataFim.split('-').map(Number)
      const proximaDataInicio = new Date(ano, mes - 1, dia + 1, 12, 0, 0)
      const proximaDataFim = new Date(ano, mes - 1, dia + 7, 12, 0, 0) // +7 dias
      
      const dataInicioStr = proximaDataInicio.toISOString().split('T')[0]
      const dataFimStr = proximaDataFim.toISOString().split('T')[0]
      
      console.log('🔄 Criando novo ciclo:', {
        planoId: plano.id,
        numeroSemana: proximoNumero,
        ultimaDataFim,
        dataInicio: dataInicioStr,
        dataFim: dataFimStr,
        cicloOrigemNumero: cicloOrigem.numeroSemana
      })
      
      // Copiar disciplinas do ciclo origem com seu planejamento
      const disciplinasCopiadas = cicloOrigem.disciplinas.map(disciplina => ({
        disciplinaId: disciplina.disciplinaId,
        disciplinaNome: disciplina.disciplina.nome,
        horasPlanejadas: disciplina.horasPlanejadas,
        questoesPlanejadas: disciplina.questoesPlanejadas,
        tipoVeiculo: disciplina.tipoVeiculo || 'pdf',
        materialNome: disciplina.materialNome || '',
        diasEstudo: disciplina.diasEstudo ? disciplina.diasEstudo.split(',').filter(d => d.trim()) : [],
        tempoVideoPlanejado: disciplina.tempoVideoPlanejado,
        parametro: disciplina.observacoes || ''
      }))
      
      console.log('📋 Copiando disciplinas do ciclo origem:', disciplinasCopiadas)
      
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
      console.error('Erro ao adicionar ciclo:', error)
      setError('Erro inesperado ao adicionar ciclo')
    }
  }

  const abrirModalSelecionarCiclo = () => {
    if (!plano || plano.semanas.length === 0) {
      setError('Nenhum ciclo disponível para copiar')
      return
    }
    
    // Definir último ciclo como padrão selecionado
    const ultimoCiclo = plano.semanas[plano.semanas.length - 1]
    setCicloOrigemSelecionado(ultimoCiclo.id)
    setModalSelecionarCicloAberto(true)
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
      console.error('Erro ao excluir ciclo:', error)
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

    console.log('🔄 Reordenando disciplinas:', { activeId: active.id, overId: over.id, activeIndex, overIndex })

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
      console.error('Erro ao reordenar disciplinas:', error)
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
              Selecione uma disciplina para adicionar ao ciclo.
            </DialogDescription>
          </DialogHeader>
          
          {semanaParaAdicionar && (
            <div className="p-3 bg-blue-50 rounded-lg flex-shrink-0">
              <div className="text-sm font-medium text-blue-900">
                Ciclo {semanaParaAdicionar.numeroSemana}
              </div>
              <div className="text-xs text-blue-600">
                {format(new Date(semanaParaAdicionar.dataInicio), 'dd/MM', { locale: ptBR })} - {format(new Date(semanaParaAdicionar.dataFim), 'dd/MM', { locale: ptBR })}
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {semanaParaAdicionar && disciplinas.filter(d => 
              !semanaParaAdicionar.disciplinas.map(ds => ds.disciplinaId).includes(d.id)
            ).map((disciplina) => (
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
          // Calcular total de horas planejadas dinamicamente
          const totalHorasPlanejadas = semana.disciplinas.reduce((acc, d) => acc + d.horasPlanejadas, 0)
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
          
          console.log('🕒 Progresso temporal para semana', semana.numeroSemana, ':', progressoTemporal, '%')

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
                                    console.log('🎯 MUDANÇA DATA INÍCIO:', e.target.value)
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
                                    console.log('🎯 MUDANÇA DATA FIM:', e.target.value)
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
                  <div className="grid grid-cols-4 gap-4 w-full mb-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Disciplinas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{semana.disciplinas.length}</div>
                        <p className="text-xs text-muted-foreground">
                          neste ciclo de estudos
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
                        <div className="text-2xl font-bold">{totalHorasPlanejadas}h</div>
                        <p className="text-xs text-muted-foreground">
                          planejadas para o ciclo
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
                        <div className="text-2xl font-bold">{semana.disciplinas.reduce((acc, d) => acc + d.questoesPlanejadas, 0)}</div>
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
                        <div className="text-2xl font-bold">{Math.ceil((new Date(semana.dataFim).getTime() - new Date(semana.dataInicio).getTime()) / (1000 * 60 * 60 * 24))}</div>
                        <p className="text-xs text-muted-foreground">
                          duração do ciclo
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                
                <div className="overflow-x-auto rounded-md border">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => handleDragEnd(event, semana.id)}
                >
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead className="min-w-[180px]">Disciplina</TableHead>
                        <TableHead className="min-w-[250px]">Assuntos</TableHead>
                        <TableHead className="min-w-[180px] text-center">Horas planejadas</TableHead>
                        <TableHead className="text-center">Questões planejadas</TableHead>
                        <TableHead className="text-center">Dias da semana</TableHead>
                        <TableHead className="w-12">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext 
                        items={semana.disciplinas.map(d => d.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {semana.disciplinas.map((disciplina, index) => {
                          const IconeVeiculo = obterIconeVeiculo(disciplina.tipoVeiculo || undefined)
                          const valorQuestoesAtual =
                            questoesEditadas[disciplina.id] !== undefined
                              ? questoesEditadas[disciplina.id]
                              : disciplina.questoesRealizadas
                          const progressoQuestoes = disciplina.questoesPlanejadas > 0
                            ? (valorQuestoesAtual / disciplina.questoesPlanejadas) * 100
                            : 0

                          const estaEditando = camposEditando[disciplina.id]
                          const valoresEditadosDisciplina = valoresEditados[disciplina.id] || {}

                          return (
                            <SortableDisciplinaRow
                              key={disciplina.id}
                              disciplina={disciplina}
                              index={index}
                              semana={semana}
                              IconeVeiculo={IconeVeiculo}
                              valorQuestoesAtual={valorQuestoesAtual}
                              progressoQuestoes={progressoQuestoes}
                              estaEditando={estaEditando}
                              valoresEditadosDisciplina={valoresEditadosDisciplina}
                              camposEditando={camposEditando}
                              valoresEditados={valoresEditados}
                              questoesEditadas={questoesEditadas}
                              salvandoId={salvandoId}
                              disciplinas={disciplinas}
                              plano={plano}
                              diasSemana={diasSemana}
                              onDisciplinaActions={{
                                iniciarEdicao,
                                atualizarValorEditado,
                                salvarEdicao,
                                salvarEdicaoComValor,
                                cancelarEdicao,
                                temEdicoesPendentes,
                                obterNomeDisciplina,
                                obterIdDisciplinaAtual,
                                parseDiasEstudo,
                                atualizarDiasEstudo,
                                excluirDisciplina
                              }}
                            />
                          )
                        })}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </DndContext>
                </div>
                
                {/* Botão para adicionar nova disciplina */}
                <div className="mt-3 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => abrirModalAdicionarDisciplina(semana)}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar disciplina
                  </Button>
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
            onClick={abrirModalSelecionarCiclo}
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
