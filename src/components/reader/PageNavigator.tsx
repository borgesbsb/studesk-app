'use client'

import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'

interface PageNavigatorProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  theme: {
    bg: string
    text: string
    border: string
  }
}

export function PageNavigator({
  currentPage,
  totalPages,
  onPageChange,
  theme,
}: PageNavigatorProps) {
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page)
    }
  }

  return (
    <div
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-30 border-2"
      style={{
        backgroundColor: theme.bg,
        borderColor: theme.border,
        color: theme.text,
      }}
    >
      {/* Botão Anterior */}
      <button
        onClick={goToPreviousPage}
        disabled={currentPage === 1}
        className="p-2 rounded-lg hover:bg-opacity-10 hover:bg-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Página anterior"
        title="Página anterior"
      >
        <ChevronLeft className="w-5 h-5" style={{ color: theme.text }} />
      </button>

      {/* Indicador de Página */}
      <div className="flex items-center gap-3">
        <BookOpen className="w-5 h-5" style={{ color: theme.text }} />

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const page = parseInt(e.target.value)
              if (!isNaN(page)) {
                goToPage(page)
              }
            }}
            className="w-16 px-2 py-1 text-center rounded border text-sm font-mono"
            style={{
              backgroundColor: theme.bg,
              color: theme.text,
              borderColor: theme.border,
            }}
          />
          <span className="text-sm font-medium" style={{ color: theme.text }}>
            / {totalPages}
          </span>
        </div>
      </div>

      {/* Botão Próximo */}
      <button
        onClick={goToNextPage}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg hover:bg-opacity-10 hover:bg-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Próxima página"
        title="Próxima página"
      >
        <ChevronRight className="w-5 h-5" style={{ color: theme.text }} />
      </button>
    </div>
  )
}
