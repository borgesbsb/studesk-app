'use client'

import { useState } from 'react'
import { Button } from '@studesk/ui/button'
import { Input } from '@studesk/ui/input'

interface AdicionarTempoModalProps {
  disciplinaNome: string
  onAdicionarTempo: (minutos: number) => Promise<void>
}

export function AdicionarTempoModal({ disciplinaNome, onAdicionarTempo }: AdicionarTempoModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [minutos, setMinutos] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(true)
  }

  const handleCloseModal = () => {
    setIsOpen(false)
    setMinutos('')
    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const minutosNum = parseInt(minutos) || 0

    if (minutosNum === 0) {
      return
    }

    setIsLoading(true)

    try {
      await onAdicionarTempo(minutosNum)
      handleCloseModal()
    } catch (error) {
      console.error('Erro ao adicionar tempo:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const totalMinutos = parseInt(minutos) || 0
  const tempoFormatado = totalMinutos > 0 ? `${totalMinutos} minutos` : ''

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="flex-1 flex items-center justify-center gap-1 py-2 px-1.5 bg-blue-50 rounded-lg active:bg-blue-100 transition-colors min-w-0"
        title="Adicionar tempo de estudo"
      >
        <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[10px] font-medium text-blue-700 truncate">Tempo</span>
      </button>

      {/* Bottom Sheet Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseModal}
          />

          {/* Modal Content - Bottom Sheet */}
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-xl animate-slide-up">
            {/* Handle bar for mobile */}
            <div className="flex justify-center mb-4 sm:hidden">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="text-center space-y-2 mb-6">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-900">Adicionar Tempo</h3>
              </div>
              <p className="text-sm text-gray-600 font-medium">
                {disciplinaNome}
              </p>
            </div>

            {/* Input */}
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block text-center">
                  Minutos de estudo
                </label>
                <Input
                  type="number"
                  min="1"
                  max="999"
                  value={minutos}
                  onChange={(e) => setMinutos(e.target.value)}
                  placeholder="0"
                  className="text-center text-3xl font-bold h-16 border-2"
                  autoFocus
                />
              </div>

              {tempoFormatado && (
                <div className="text-center py-3 px-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-lg font-semibold text-blue-600">{tempoFormatado}</p>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={isLoading}
                className="flex-1 h-12"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || totalMinutos === 0}
                className="flex-1 h-12"
              >
                {isLoading ? 'Salvando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
