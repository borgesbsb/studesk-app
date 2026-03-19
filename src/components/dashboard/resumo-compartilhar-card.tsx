"use client"

import { useState } from "react"
import { ResumoCompartilhar } from "@/interface/actions/dashboard/get-resumo-compartilhar"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { ProgressoCiclo } from "@/interface/actions/dashboard/get-progresso-ciclo"

interface ResumoCompartilharCardProps {
  resumo: ResumoCompartilhar | null
  progresso: ProgressoCiclo | null
}

function formatarHorasMin(horas: number) {
  const h = Math.floor(horas)
  const min = Math.round((horas - h) * 60)
  if (horas === 0) return '0min'
  if (min === 0) return `${h}h`
  if (h === 0) return `${min}min`
  return `${h}h${min}min`
}

function formatarMinutos(minutos: number) {
  if (minutos <= 0) return ""
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (m === 0) return `${h}h`
  if (h === 0) return `${m}min`
  return `${h}h${m}m`
}

function calcularPctCiclo(progresso: ProgressoCiclo | null): { dias: number; total: number; pct: number } | null {
  if (!progresso) return null
  const msPerDay = 1000 * 60 * 60 * 24
  const inicio = new Date(progresso.dataInicio); inicio.setHours(0, 0, 0, 0)
  const fim = new Date(progresso.dataFim); fim.setHours(0, 0, 0, 0)
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const total = Math.round((fim.getTime() - inicio.getTime()) / msPerDay) + 1
  const diaAtual = Math.min(Math.max(Math.floor((hoje.getTime() - inicio.getTime()) / msPerDay) + 1, 1), total)
  const pct = total > 1 ? Math.round(((diaAtual - 1) / (total - 1)) * 100) : 100
  return { dias: diaAtual, total, pct }
}

function gerarTexto(resumo: ResumoCompartilhar, atividadeFisica: number, progresso: ProgressoCiclo | null): string {
  const dataStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
  const dataCapitalizada = dataStr.charAt(0).toUpperCase() + dataStr.slice(1)
  const linhas: string[] = []

  if (resumo.nomePlano) linhas.push(`_${resumo.nomePlano}_`)
  linhas.push(`📅 ${dataCapitalizada}`)
  if (resumo.diaCiclo) {
    const ciclo = calcularPctCiclo(progresso)
    if (ciclo) {
      const blocos = 10
      const preenchido = Math.round((ciclo.pct / 100) * blocos)
      const barra = '█'.repeat(preenchido) + '░'.repeat(blocos - preenchido)
      linhas.push(`🔄 Dia ${ciclo.dias}/${ciclo.total} |${barra}| ${ciclo.pct}%`)
    } else {
      linhas.push(`🔄 Dia ${resumo.diaCiclo} do ciclo`)
    }
  }
  linhas.push('')
  linhas.push(`*— ONTEM —*`)
  linhas.push(`📖 Horas estudadas: *${formatarHorasMin(resumo.ontem.horasEstudo)}*`)
  linhas.push(`✅ Questões: *${resumo.ontem.questoesRealizadas}*`)
  if (atividadeFisica > 0) linhas.push(`🏋️ Atividade física: *${atividadeFisica}min*`)
  linhas.push('')

  if (resumo.hoje.disciplinas.length > 0) {
    linhas.push(`*— HOJE —*`)
    if (resumo.hoje.totalMinutosPlanejados > 0)
      linhas.push(`⏱ Total planejado: *${formatarMinutos(resumo.hoje.totalMinutosPlanejados)}*`)
    linhas.push('')
    for (const disc of resumo.hoje.disciplinas) {
      const tempo = disc.minutosPlanejados > 0 ? ` — ${formatarMinutos(disc.minutosPlanejados)}` : ''
      linhas.push(`▪️ ${disc.nome}${tempo}`)
    }
  }

  return linhas.join('\n')
}

export function ResumoCompartilharCard({ resumo, progresso }: ResumoCompartilharCardProps) {
  const [atividadeFisica, setAtividadeFisica] = useState(0)
  const [copiado, setCopiado] = useState(false)

  if (!resumo) return null

  const texto = gerarTexto(resumo, atividadeFisica, progresso)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      toast.success('Texto copiado!')
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      toast.error('Erro ao copiar')
    }
  }

  return (
    <div className="rounded-xl flex flex-col bg-card border border-border h-full">

      {/* Header */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between border-b border-border bg-primary/5">
        <p className="text-xs font-bold text-primary uppercase tracking-widest">Resumo para Compartilhar</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Ativ. física (min):</span>
          <Input
            type="number" min={0} step={5}
            value={atividadeFisica}
            onChange={e => setAtividadeFisica(Number(e.target.value))}
            className="h-6 text-xs w-14 px-2"
          />
          <Button size="sm" onClick={copiar} className="h-7 px-3 gap-1.5">
            {copiado
              ? <><Check className="h-3.5 w-3.5" /> Copiado</>
              : <><Copy className="h-3.5 w-3.5" /> Copiar</>
            }
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
          {texto}
        </pre>
      </div>

    </div>
  )
}
