'use client'

interface ReaderProgressBarProps {
  percentage: number
  wordsRead: number
  totalWords: number
  estimatedTimeLeft: number
  timeSpent: number
}

export function ReaderProgressBar({
  percentage,
  wordsRead,
  totalWords,
  estimatedTimeLeft,
  timeSpent,
}: ReaderProgressBarProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimeLeft = (minutes: number): string => {
    if (minutes < 1) return 'Menos de 1 min'
    if (minutes === 1) return '1 minuto'
    if (minutes < 60) return `${minutes} minutos`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}min`
  }

  return (
    <>
      {/* Barra de Progresso Fixa */}
      <div className="fixed top-0 left-0 right-0 z-30">
        <div
          className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </>
  )
}
