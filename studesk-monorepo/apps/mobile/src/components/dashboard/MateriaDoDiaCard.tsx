'use client'

import { MateriaDoDia } from '@/lib/api/dashboard'
import Link from 'next/link'

interface MateriaDoDiaCardProps {
  materia: MateriaDoDia
}

export function MateriaDoDiaCard({ materia }: MateriaDoDiaCardProps) {
  const progressoPercentual = materia.horasPlanejadas > 0
    ? Math.min(Math.round((materia.horasRealizadas / materia.horasPlanejadas) * 100), 100)
    : 0

  return (
    <Link
      href={`/disciplinas/${materia.disciplinaId}`}
      className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:scale-98 transition-transform"
    >
      {/* Header com nome e status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: materia.disciplinaCor || '#6366f1' }}
          >
            {materia.disciplinaNome.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm">{materia.disciplinaNome}</h3>
            {materia.materialNome && (
              <p className="text-xs text-gray-500 mt-0.5">{materia.materialNome}</p>
            )}
          </div>
        </div>

        {materia.concluida && (
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Observações/Assuntos */}
      {materia.observacoes && (
        <div className="mb-3">
          <p className="text-xs text-gray-600 line-clamp-2">{materia.observacoes}</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-600">Progresso</span>
          <span className="font-medium text-gray-900">{progressoPercentual}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressoPercentual}%`,
              backgroundColor: materia.disciplinaCor || '#6366f1'
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
        <div>
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-gray-600">Tempo</p>
          </div>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            {materia.horasRealizadas.toFixed(1)}h / {materia.horasPlanejadas.toFixed(1)}h
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-gray-600">Sessões PDF</p>
          </div>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            {materia.tempoSessoesPdf.toFixed(1)}h
          </p>
        </div>
      </div>
    </Link>
  )
}
