"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { ResumoCompartilhar } from "@/interface/actions/dashboard/get-resumo-compartilhar"
import { BookOpen, Dumbbell, Target, GraduationCap } from "lucide-react"

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
    <div
      className="rounded-xl overflow-hidden text-white select-none h-full flex flex-col"
      style={{
        background: 'linear-gradient(145deg, #0a0f1e 0%, #12103a 45%, #0a1628 100%)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header bar */}
      <div
        className="px-4 pt-3 pb-2.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <GraduationCap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: '#a5b4fc' }}>Studesk</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>{dataCapitalizada}</p>
          {resumo.diaCiclo && (
            <p className="text-[9px]" style={{ color: '#818cf8' }}>Dia {resumo.diaCiclo} do ciclo</p>
          )}
        </div>
      </div>

      {/* Avatar + nome + plano */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 0 0 3px rgba(99,102,241,0.25), 0 4px 12px rgba(99,102,241,0.3)'
          }}
        >
          {iniciais(resumo.nomeUsuario || 'U')}
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold leading-tight truncate">{resumo.nomeUsuario || 'Estudante'}</p>
          {resumo.nomePlano && (
            <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{resumo.nomePlano}</p>
          )}
        </div>
      </div>

      {/* ── ONTEM ── */}
      <div
        className="mx-3 rounded-xl px-3 py-3 mb-2"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p className="text-[9px] font-bold tracking-widest uppercase mb-3" style={{ color: '#818cf8' }}>Ontem</p>
        <div className="grid grid-cols-3 gap-2">

          {/* Estudos */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <BookOpen className="h-5 w-5" style={{ color: '#4ade80' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold leading-none" style={{ color: '#4ade80' }}>
                {estudo.val}<span className="text-[10px] ml-0.5">{estudo.unit}</span>
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Estudadas</p>
            </div>
          </div>

          {/* Questões */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.25)' }}
            >
              <Target className="h-5 w-5" style={{ color: '#fbbf24' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold leading-none" style={{ color: '#fbbf24' }}>
                {resumo.ontem.questoesRealizadas}<span className="text-[10px] ml-0.5">q</span>
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Questões</p>
            </div>
          </div>

          {/* Atividade física */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <Dumbbell className="h-5 w-5" style={{ color: '#f87171' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold leading-none" style={{ color: '#f87171' }}>
                {atividadeFisica > 0 ? atividadeFisica : '—'}
                {atividadeFisica > 0 && <span className="text-[10px] ml-0.5">h</span>}
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Ativ. física</p>
            </div>
          </div>

        </div>

        {/* Input atividade física */}
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Ativ. física (h):</span>
          <Input
            type="number" min={0} step={0.5}
            value={atividadeFisica}
            onChange={e => setAtividadeFisica(Number(e.target.value))}
            className="h-5 text-[10px] w-14 px-1.5 bg-white/10 border-white/10 text-white"
          />
        </div>
      </div>

      {/* ── HOJE ── */}
      <div
        className="mx-3 mb-3 rounded-xl px-3 py-3 flex-1"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#818cf8' }}>Hoje</p>
          {resumo.hoje.totalMinutosPlanejados > 0 && (
            <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
              {formatarMinutos(resumo.hoje.totalMinutosPlanejados)} planejadas
            </span>
          )}
        </div>

        {resumo.hoje.disciplinas.length === 0 ? (
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Sem disciplinas planejadas</p>
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
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cor, boxShadow: `0 0 6px ${cor}` }} />
                    <span className="text-[11px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>
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
      <div className="px-4 pb-3 flex items-center justify-between">
        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.18)' }}>studesk.com.br</p>
        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.18)' }}>#estudos #concurso</p>
      </div>
    </div>
  )
}
