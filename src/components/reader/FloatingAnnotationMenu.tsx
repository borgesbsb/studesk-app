'use client'

import { Underline, Strikethrough } from 'lucide-react'

interface FloatingAnnotationMenuProps {
  isVisible: boolean
  position: { x: number; y: number } | null
  onHighlight: (color: string) => void
  onUnderline: (style: string, thickness: string, color: string) => void
  onStrikethrough: () => void
  theme: {
    bg: string
    text: string
    secondary: string
    border: string
    accent: string
  }
  // Configurações de sublinhado da barra do topo
  currentUnderlineStyle?: string
  currentUnderlineThickness?: string
  currentUnderlineColor?: string
}

export function FloatingAnnotationMenu({
  isVisible,
  position,
  onHighlight,
  onUnderline,
  onStrikethrough,
  theme,
  currentUnderlineStyle = 'solid',
  currentUnderlineThickness = '2px',
  currentUnderlineColor = '#3b82f6',
}: FloatingAnnotationMenuProps) {
  // Remover estados locais e submenu - agora usa as configurações da barra do topo

  if (!isVisible || !position) return null

  const highlightColors = [
    { color: '#fef08a', label: 'Amarelo' },
    { color: '#bbf7d0', label: 'Verde' },
    { color: '#bfdbfe', label: 'Azul' },
    { color: '#fecaca', label: 'Vermelho' },
  ]

  return (
    <div
      className="fixed z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 10}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg shadow-xl border backdrop-blur-sm"
        style={{
          backgroundColor: `${theme.bg}f5`,
          borderColor: theme.border,
        }}
      >
        {/* Cores de Highlight */}
        {highlightColors.map((item) => (
          <button
            key={item.color}
            onClick={() => onHighlight(item.color)}
            className="w-7 h-7 rounded-full border transition-all hover:scale-110"
            style={{
              backgroundColor: item.color,
              borderColor: `${theme.text}30`,
            }}
            title={item.label}
            aria-label={item.label}
          />
        ))}

        <div className="w-px h-6 mx-1" style={{ backgroundColor: theme.border }} />

        {/* Botão Sublinhar - Aplica direto com configurações do topo */}
        <button
          onClick={() => onUnderline(currentUnderlineStyle, currentUnderlineThickness, currentUnderlineColor)}
          className="p-1.5 rounded hover:bg-opacity-10 hover:bg-gray-500 transition-all"
          style={{ color: theme.text }}
          title="Sublinhar"
          aria-label="Sublinhar"
        >
          <Underline className="w-4 h-4" />
        </button>

        {/* Botão Riscar */}
        <button
          onClick={onStrikethrough}
          className="p-1.5 rounded hover:bg-opacity-10 hover:bg-gray-500 transition-all"
          style={{ color: theme.text }}
          title="Riscar"
          aria-label="Riscar"
        >
          <Strikethrough className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
