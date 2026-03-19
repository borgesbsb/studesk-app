"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { ResumoCompartilhar } from "@/interface/actions/dashboard/get-resumo-compartilhar"
import { BookOpen, Dumbbell, Clock, Target, GraduationCap } from "lucide-react"

interface ResumoCompartilharCardProps {
  resumo: ResumoCompartilhar | null
}

function formatarHoras(horas: number) {
  if (horas === 0) return "0min"
  const h = Math.floor(horas)
  const min = Math.round((horas - h) * 60)
  if (min === 0) return `${h}h`
  if (h === 0) return `${min}min`
  return `${h}h ${min}min`
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

function hoje() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

export function ResumoCompartilharCard({ resumo }: ResumoCompartilharCardProps) {
  const [atividadeFisica, setAtividadeFisica] = useState(0)

  if (!resumo) return null

  const dataStr = hoje()
  const dataCapitalizada = dataStr.charAt(0).toUpperCase() + dataStr.slice(1)

  return (
    <div
      className="rounded-xl overflow-hidden text-white select-none"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-lg w-7 h-7" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#a5b4fc' }}>Studesk</p>
            {resumo.nomePlano && (
              <p className="text-[9px] leading-tight" style={{ color: 'rgba(255,255,255,0.5)' }}>{resumo.nomePlano}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{dataCapitalizada}</p>
          {resumo.diaCiclo && (
            <p className="text-[9px]" style={{ color: '#818cf8' }}>Dia {resumo.diaCiclo} do ciclo</p>
          )}
        </div>
      </div>

      {/* Avatar + nome */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 0 2px rgba(99,102,241,0.3)' }}
        >
          {iniciais(resumo.nomeUsuario || 'U')}
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">{resumo.nomeUsuario || 'Estudante'}</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>Relatório de estudos</p>
        </div>
      </div>

      {/* Ontem */}
      <div className="mx-3 mb-2 rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <p className="text-[9px] font-bold tracking-widest uppercase mb-2" style={{ color: '#818cf8' }}>Ontem</p>
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
              <BookOpen className="h-3 w-3" style={{ color: '#4ade80' }} />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: '#4ade80' }}>{formatarHoras(resumo.ontem.horasEstudo)}</p>
              <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Estudadas</p>
            </div>
          </div>
          {resumo.ontem.questoesRealizadas > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.15)' }}>
                <Target className="h-3 w-3" style={{ color: '#fbbf24' }} />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: '#fbbf24' }}>{resumo.ontem.questoesRealizadas}q</p>
                <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Questões</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
              <Dumbbell className="h-3 w-3" style={{ color: '#f87171' }} />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: '#f87171' }}>
                {atividadeFisica > 0 ? `${atividadeFisica}h` : '—'}
              </p>
              <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Ativ. física</p>
            </div>
          </div>
        </div>
        {/* Input atividade fisica - não aparece no screenshot (fora da área capturada pelo CardCapture) */}
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Ativ. física (h):</span>
          <Input
            type="number" min={0} step={0.5}
            value={atividadeFisica}
            onChange={e => setAtividadeFisica(Number(e.target.value))}
            className="h-5 text-[10px] w-14 px-1.5 bg-white/10 border-white/10 text-white"
          />
        </div>
      </div>

      {/* Hoje */}
      <div className="mx-3 mb-3 rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#818cf8' }}>Hoje</p>
          {resumo.hoje.totalMinutosPlanejados > 0 && (
            <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <Clock className="h-2.5 w-2.5" />
              <span className="text-[9px]">{formatarMinutos(resumo.hoje.totalMinutosPlanejados)} planejadas</span>
            </div>
          )}
        </div>

        {resumo.hoje.disciplinas.length === 0 ? (
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Sem disciplinas planejadas</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {resumo.hoje.disciplinas.map((disc, i) => {
              const cor = disc.cor || '#6366f1'
              return (
                <div
                  key={i}
                  className="flex items-center gap-1 rounded-full px-2 py-0.5"
                  style={{ background: cor + '25', border: `1px solid ${cor}60` }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: cor }} />
                  <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {disc.nome}
                  </span>
                  {disc.minutosPlanejados > 0 && (
                    <span className="text-[9px]" style={{ color: cor }}>
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
        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>studesk.com.br</p>
        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>#estudos #concurso</p>
      </div>
    </div>
  )
}
