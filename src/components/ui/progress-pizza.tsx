import React from 'react'

// Classes Tailwind que devem ser preservadas durante o build
// bg-gradient-to-r from-red-500 to-red-600
// bg-gradient-to-r from-orange-500 to-orange-600
// bg-gradient-to-r from-yellow-500 to-yellow-600
// bg-gradient-to-r from-green-500 to-green-600
// bg-gradient-to-r from-blue-500 to-blue-600
// bg-gradient-to-r from-blue-600 to-blue-700

interface ProgressPizzaProps {
  value: number
  className?: string
  size?: number
  strokeWidth?: number
  showPercentage?: boolean
}

export function ProgressPizza({ 
  value, 
  className = "", 
  size = 120, 
  strokeWidth = 8,
  showPercentage = true 
}: ProgressPizzaProps) {
  // Garantir que o valor esteja entre 0 e 100
  const progress = Math.min(Math.max(value, 0), 100)
  
  // Calcular o raio e circunferência
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  
  // Calcular o stroke-dasharray para o progresso
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progress / 100) * circumference
  
  // Função para obter a cor baseada no progresso (vermelho 1% até azul 100%)
  const getProgressColor = (progress: number) => {
    if (progress <= 0) return '#ef4444' // vermelho
    if (progress <= 25) return '#f97316' // laranja
    if (progress <= 50) return '#eab308' // amarelo
    if (progress <= 75) return '#22c55e' // verde
    if (progress <= 99) return '#3b82f6' // azul
    return '#1d4ed8' // azul escuro para 100%
  }
  
  // Função para obter a classe de gradiente baseada no progresso
  const getGradientClass = (progress: number) => {
    if (progress <= 0) return 'bg-gradient-to-r from-red-500 to-red-600'
    if (progress <= 25) return 'bg-gradient-to-r from-orange-500 to-orange-600'
    if (progress <= 50) return 'bg-gradient-to-r from-yellow-500 to-yellow-600'
    if (progress <= 75) return 'bg-gradient-to-r from-green-500 to-green-600'
    if (progress <= 99) return 'bg-gradient-to-r from-blue-500 to-blue-600'
    return 'bg-gradient-to-r from-blue-600 to-blue-700'
  }

  // Função para obter a classe de gradiente para texto
  const getTextGradientClass = (progress: number) => {
    if (progress <= 0) return 'bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent'
    if (progress <= 25) return 'bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent'
    if (progress <= 50) return 'bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent'
    if (progress <= 75) return 'bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent'
    if (progress <= 99) return 'bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent'
    return 'bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent'
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Círculo de fundo */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        
        {/* Círculo de progresso */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getProgressColor(progress)}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-all duration-500 ease-out`}
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
          }}
        />
      </svg>
      
      {/* Conteúdo central */}
      <div className="absolute inset-0 flex items-center justify-center">
        {showPercentage ? (
          <div className="text-center">
            <div className={`text-2xl font-bold ${getTextGradientClass(progress)}`}>
              {Math.round(progress)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Concluído
            </div>
          </div>
        ) : (
          <div className={`w-8 h-8 rounded-full ${getGradientClass(progress)}`} />
        )}
      </div>
    </div>
  )
} 