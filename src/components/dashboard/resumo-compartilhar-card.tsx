"use client"

import { useState } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { ResumoCompartilhar } from "@/interface/actions/dashboard/get-resumo-compartilhar"
import { BookOpen, Dumbbell, Target } from "lucide-react"

interface ResumoCompartilharCardProps {
  resumo: ResumoCompartilhar | null
}

function formatarHoras(horas: number) {
  if (horas === 0) return "0"
  const h = Math.floor(horas)
  const min = Math.round((horas - h) * 60)
  if (min === 0) return `${h}`
  if (h === 0) return `0`
  return `${h}`
}
function formatarHorasMin(horas: number) {
  const h = Math.floor(horas)
  const min = Math.round((horas - h) * 60)
  if (horas === 0) return { val: '0', unit: 'min' }
  if (min === 0) return { val: `${h}`, unit: 'h' }
  if (h === 0) return { val: `${min}`, unit: 'min' }
  return { val: `${h}h`, unit: `${min}min` }
}

function formatarMinutos(minutos: number) {
  if (minutos <= 0) return ""
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (m === 0) return `${h}h`
  if (h === 0) return `${m}min`
  return `${h}h${m}m`
}

function iniciais(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export function ResumoCompartilharCard({ resumo }: ResumoCompartilharCardProps) {
  const [atividadeFisica, setAtividadeFisica] = useState(0)

  if (!resumo) return null

  const dataStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
  const dataCapitalizada = dataStr.charAt(0).toUpperCase() + dataStr.slice(1)
  const estudo = formatarHorasMin(resumo.ontem.horasEstudo)

  return (
    <div className="rounded-xl overflow-hidden bg-card text-card-foreground select-none h-full flex flex-col border border-border">
      {/* Header bar */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border">
        <Image src="/logo-mvt.png" alt="Logo" width={140} height={38} className="object-contain" />
        <div className="text-right">
          <p className="text-[10px] font-medium text-muted-foreground">{dataCapitalizada}</p>
          {resumo.diaCiclo && (
            <p className="text-[9px] text-primary">Dia {resumo.diaCiclo} do ciclo</p>
          )}
        </div>
      </div>

      {/* Avatar + nome + plano */}
      <div className="px-4 py-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0 bg-primary text-primary-foreground ring-2 ring-primary/25">
          {iniciais(resumo.nomeUsuario || 'U')}
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold leading-tight truncate">{resumo.nomeUsuario || 'Estudante'}</p>
          {resumo.nomePlano && (
            <p className="text-[10px] truncate mt-0.5 text-muted-foreground">{resumo.nomePlano}</p>
          )}
        </div>
      </div>

      {/* ── ONTEM ── */}
      <div className="mx-4 rounded-xl px-4 py-3 mb-3 bg-muted border border-border">
        <p className="text-[9px] font-bold tracking-widest uppercase mb-3 text-primary">Ontem</p>
        <div className="grid grid-cols-3 gap-2">

          {/* Estudos */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/10 border border-green-500/25">
              <BookOpen className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold leading-none text-green-500">
                {estudo.val}<span className="text-[10px] ml-0.5">{estudo.unit}</span>
              </p>
              <p className="text-[9px] mt-0.5 text-muted-foreground">Estudadas</p>
            </div>
          </div>

          {/* Questões */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-500/10 border border-yellow-500/25">
              <Target className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold leading-none text-yellow-500">
                {resumo.ontem.questoesRealizadas}<span className="text-[10px] ml-0.5">q</span>
              </p>
              <p className="text-[9px] mt-0.5 text-muted-foreground">Questões</p>
            </div>
          </div>

          {/* Atividade física */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/25">
              <Dumbbell className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold leading-none text-red-500">
                {atividadeFisica > 0 ? atividadeFisica : '—'}
                {atividadeFisica > 0 && <span className="text-[10px] ml-0.5">h</span>}
              </p>
              <p className="text-[9px] mt-0.5 text-muted-foreground">Ativ. física</p>
            </div>
          </div>

        </div>

      </div>

      {/* Input atividade física */}
      <div className="mx-4 mb-3 flex items-center gap-1.5">
        <span className="text-[9px] text-muted-foreground">Ativ. física (h):</span>
        <Input
          type="number" min={0} step={0.5}
          value={atividadeFisica}
          onChange={e => setAtividadeFisica(Number(e.target.value))}
          className="h-5 text-[10px] w-14 px-1.5"
        />
      </div>

      {/* ── HOJE ── */}
      <div className="mx-4 mb-4 rounded-xl px-4 py-3 overflow-y-auto bg-muted border border-border">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[9px] font-bold tracking-widest uppercase text-primary">Hoje</p>
          {resumo.hoje.totalMinutosPlanejados > 0 && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {formatarMinutos(resumo.hoje.totalMinutosPlanejados)} planejadas
            </span>
          )}
        </div>

        {resumo.hoje.disciplinas.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">Sem disciplinas planejadas</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {resumo.hoje.disciplinas.map((disc, i) => {
              const cor = disc.cor || '#6366f1'
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                  style={{ background: cor + '18', border: `1px solid ${cor}40` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cor }} />
                    <span className="text-[11px] font-medium truncate">
                      {disc.nome}
                    </span>
                  </div>
                  {disc.minutosPlanejados > 0 && (
                    <span
                      className="text-[10px] font-bold shrink-0 ml-2 px-1.5 py-0.5 rounded-md"
                      style={{ color: cor, background: cor + '20' }}
                    >
                      {formatarMinutos(disc.minutosPlanejados)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <p className="text-[9px] text-muted-foreground/50">studesk.com.br</p>
        <p className="text-[9px] text-muted-foreground/50">#estudos #concurso</p>
      </div>
    </div>
  )
}
