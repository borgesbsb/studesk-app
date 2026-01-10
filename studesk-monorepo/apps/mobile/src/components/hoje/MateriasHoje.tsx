'use client'

import { type MateriaDoDia } from '@/lib/api/dashboard'
import { useDashboard } from '@/contexts/dashboard-context'
import { useState } from 'react'
import { AdicionarTempoModal } from './AdicionarTempoModal'
import { AdicionarQuestoesModal } from './AdicionarQuestoesModal'
import { apiClient } from '@/lib/api-client'
import { useRouter, useParams } from 'next/navigation'

interface MateriasHojeProps {
  materias: MateriaDoDia[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}

export function MateriasHoje({ materias, loading, error, onRefresh }: MateriasHojeProps) {
  const { selectedDate } = useDashboard()
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const params = useParams()

  const handleAdicionarTempo = async (disciplinaId: string, minutos: number) => {
    setSaving(true)
    try {
      const response = await apiClient.post('/dashboard/adicionar-tempo', {
        disciplinaId,
        minutos,
        data: selectedDate.toISOString()
      }) as { success: boolean }

      if (response.success) {
        await onRefresh()
      }
    } catch (err) {
      console.error('Erro ao adicionar tempo:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleAdicionarQuestoes = async (disciplinaId: string, quantidade: number) => {
    setSaving(true)
    try {
      const response = await apiClient.post('/dashboard/adicionar-questoes', {
        disciplinaId,
        quantidade,
        data: selectedDate.toISOString()
      }) as { success: boolean }

      if (response.success) {
        await onRefresh()
      }
    } catch (err) {
      console.error('Erro ao adicionar questões:', err)
    } finally {
      setSaving(false)
    }
  }

  const calcularProgresso = (realizado: number, planejado: number) => {
    if (planejado === 0) return 0
    return Math.min(Math.round((realizado / planejado) * 100), 100)
  }

  const formatarTempo = (minutos: number) => {
    if (minutos < 60) {
      return `${minutos}m`
    }
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    return mins > 0 ? `${horas}h ${mins}m` : `${horas}h`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 text-sm mt-4">Carregando matérias...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-600 font-medium text-sm">Erro ao carregar</p>
          <p className="text-red-500 text-xs mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (materias.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Matérias para Estudar</h3>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-gray-600 text-sm">Nenhuma matéria programada</p>
          <p className="text-gray-500 text-xs mt-1">Crie um plano de estudos</p>
        </div>
      </div>
    )
  }

  const totalHorasPlanejadas = materias.reduce((acc, m) => acc + m.horasPlanejadas, 0)
  const totalHorasReais = materias.reduce((acc, m) => acc + m.tempoRealEstudo, 0)
  const materiasCompletas = materias.filter(m => m.concluida).length

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h3 className="font-bold text-gray-900 mb-4">Matérias para Estudar</h3>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-600 mb-1">Matérias</p>
          <p className="text-lg font-bold text-gray-900">{materiasCompletas}/{materias.length}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-600 mb-1">Tempo</p>
          <p className="text-lg font-bold text-gray-900">{formatarTempo(totalHorasReais)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-600 mb-1">Progresso</p>
          <p className="text-lg font-bold text-gray-900">
            {calcularProgresso(totalHorasReais, totalHorasPlanejadas)}%
          </p>
        </div>
      </div>

      {/* Lista de matérias */}
      <div className="space-y-3">
        {materias.map((materia) => {
          const progressoTempo = calcularProgresso(materia.tempoRealEstudo, materia.horasPlanejadas)
          const progressoQuestoes = calcularProgresso(materia.questoesRealizadas, materia.questoesPlanejadas)

          return (
            <div
              key={materia.id}
              className="border border-gray-200 rounded-xl p-4 active:bg-gray-50 transition-colors"
              style={materia.disciplinaCor && !materia.concluida ? {
                borderLeftWidth: '4px',
                borderLeftColor: materia.disciplinaCor
              } : undefined}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {materia.concluida && (
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    <h4 className="font-semibold text-gray-900 text-sm">{materia.disciplinaNome}</h4>
                  </div>
                  {materia.observacoes && (
                    <p className="text-xs text-gray-600 line-clamp-2">{materia.observacoes}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  materia.prioridade === 1 ? 'bg-red-100 text-red-700' :
                  materia.prioridade === 2 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {materia.prioridade === 1 ? 'Alta' : materia.prioridade === 2 ? 'Média' : 'Baixa'}
                </span>
              </div>

              {/* Progresso Tempo */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">Tempo</span>
                  <span className="font-medium text-gray-900">
                    {formatarTempo(materia.tempoRealEstudo)} / {formatarTempo(materia.horasPlanejadas)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${progressoTempo}%` }}
                  />
                </div>
              </div>

              {/* Progresso Questões */}
              {materia.questoesPlanejadas > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">Questões</span>
                    <span className="font-medium text-gray-900">
                      {materia.questoesRealizadas} / {materia.questoesPlanejadas}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600 rounded-full transition-all"
                      style={{ width: `${progressoQuestoes}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
                <AdicionarTempoModal
                  disciplinaNome={materia.disciplinaNome}
                  onAdicionarTempo={(minutos) => handleAdicionarTempo(materia.disciplinaId, minutos)}
                />
                {materia.questoesPlanejadas > 0 && (
                  <AdicionarQuestoesModal
                    disciplinaNome={materia.disciplinaNome}
                    onAdicionarQuestoes={(quantidade) => handleAdicionarQuestoes(materia.disciplinaId, quantidade)}
                  />
                )}
                <button
                  className="flex-1 flex items-center justify-center gap-1 py-2 px-1.5 bg-gray-50 rounded-lg active:bg-gray-100 transition-colors min-w-0"
                  onClick={() => {
                    const userHash = params.userHash as string
                    router.push(`/${userHash}/disciplinas/${materia.disciplinaId}/materiais`)
                  }}
                >
                  <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="text-[10px] font-medium text-gray-700 truncate">Materiais</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
