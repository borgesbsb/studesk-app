'use client'

import { X, Sun, Moon, BookOpen, Type, AlignLeft, Maximize2, AlignJustify, AlignCenter, AlignRight } from 'lucide-react'
import type {
  ReaderPreferences,
  ReadingTheme,
  FontFamily,
  ColumnWidth,
  LineHeight,
  TextAlign,
} from './types'
import { THEME_CONFIGS } from './types'

interface ReaderSettingsProps {
  isOpen: boolean
  onClose: () => void
  preferences: ReaderPreferences
  onUpdatePreference: <K extends keyof ReaderPreferences>(
    key: K,
    value: ReaderPreferences[K]
  ) => void
}

export function ReaderSettings({
  isOpen,
  onClose,
  preferences,
  onUpdatePreference,
}: ReaderSettingsProps) {
  if (!isOpen) return null

  const theme = THEME_CONFIGS[preferences.theme]

  const themes: { value: ReadingTheme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Claro', icon: <Sun className="w-5 h-5" /> },
    { value: 'dark', label: 'Escuro', icon: <Moon className="w-5 h-5" /> },
    { value: 'sepia', label: 'Sépia', icon: <BookOpen className="w-5 h-5" /> },
    { value: 'high-contrast', label: 'Alto Contraste', icon: <Type className="w-5 h-5" /> },
  ]

  const fonts: { value: FontFamily; label: string }[] = [
    { value: 'sans-serif', label: 'Sans Serif' },
    { value: 'serif', label: 'Serif' },
    { value: 'mono', label: 'Monoespaçada' },
  ]

  const widths: { value: ColumnWidth; label: string }[] = [
    { value: 'narrow', label: 'Estreita' },
    { value: 'medium', label: 'Média' },
    { value: 'wide', label: 'Larga' },
    { value: 'full', label: 'Total' },
  ]

  const lineHeights: { value: LineHeight; label: string }[] = [
    { value: 'compact', label: 'Compacto' },
    { value: 'normal', label: 'Normal' },
    { value: 'relaxed', label: 'Relaxado' },
    { value: 'loose', label: 'Espaçado' },
  ]

  const textAligns: { value: TextAlign; label: string; icon: React.ReactNode }[] = [
    { value: 'left', label: 'Esquerda', icon: <AlignLeft className="w-4 h-4" /> },
    { value: 'center', label: 'Centro', icon: <AlignCenter className="w-4 h-4" /> },
    { value: 'right', label: 'Direita', icon: <AlignRight className="w-4 h-4" /> },
    { value: 'justify', label: 'Justificado', icon: <AlignJustify className="w-4 h-4" /> },
  ]

  return (
    <>
      {/* Overlay - Ultra sutil e transparente sem blur */}
      <div
        className="fixed inset-0 z-40 transition-opacity"
        style={{ backgroundColor: `${theme.bg}20` }}
        onClick={onClose}
      />

      {/* Painel de Configurações */}
      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-md shadow-2xl z-50 overflow-y-auto"
        style={{ backgroundColor: theme.bg }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ color: theme.text }}>
              Configurações de Leitura
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full transition-colors"
              style={{ color: theme.text }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.text}15`}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label="Fechar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Temas */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text, opacity: 0.8 }}>
              <Sun className="w-4 h-4" />
              Tema
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((themeOption) => (
                <button
                  key={themeOption.value}
                  onClick={() => onUpdatePreference('theme', themeOption.value)}
                  className="flex items-center gap-2 p-4 rounded-lg border-2 transition-all"
                  style={{
                    borderColor: preferences.theme === themeOption.value ? theme.accent : theme.border,
                    backgroundColor: preferences.theme === themeOption.value ? `${theme.accent}15` : 'transparent',
                    color: preferences.theme === themeOption.value ? theme.accent : theme.text
                  }}
                >
                  {themeOption.icon}
                  <span className="font-medium text-sm">{themeOption.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Família de Fonte */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text, opacity: 0.8 }}>
              <Type className="w-4 h-4" />
              Fonte
            </h3>
            <div className="space-y-2">
              {fonts.map((font) => (
                <button
                  key={font.value}
                  onClick={() => onUpdatePreference('fontFamily', font.value)}
                  className="w-full text-left p-3 rounded-lg border-2 transition-all"
                  style={{
                    borderColor: preferences.fontFamily === font.value ? theme.accent : theme.border,
                    backgroundColor: preferences.fontFamily === font.value ? `${theme.accent}15` : 'transparent',
                    color: preferences.fontFamily === font.value ? theme.accent : theme.text,
                    fontFamily:
                      font.value === 'sans-serif'
                        ? 'system-ui, sans-serif'
                        : font.value === 'serif'
                          ? 'Georgia, serif'
                          : 'monospace',
                  }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tamanho da Fonte */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text, opacity: 0.8 }}>Tamanho da Fonte</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  onUpdatePreference('fontSize', Math.max(12, preferences.fontSize - 2))
                }
                className="px-4 py-2 rounded-lg font-bold transition-colors"
                style={{ backgroundColor: `${theme.text}15`, color: theme.text }}
              >
                A-
              </button>
              <div className="flex-1 text-center">
                <input
                  type="range"
                  min="12"
                  max="32"
                  step="2"
                  value={preferences.fontSize}
                  onChange={(e) => onUpdatePreference('fontSize', parseInt(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm mt-1 block" style={{ color: theme.secondary }}>{preferences.fontSize}px</span>
              </div>
              <button
                onClick={() =>
                  onUpdatePreference('fontSize', Math.min(32, preferences.fontSize + 2))
                }
                className="px-4 py-2 rounded-lg font-bold transition-colors"
                style={{ backgroundColor: `${theme.text}15`, color: theme.text }}
              >
                A+
              </button>
            </div>
          </div>

          {/* Largura da Coluna */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text, opacity: 0.8 }}>
              <Maximize2 className="w-4 h-4" />
              Largura
            </h3>

            {/* Presets de largura */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {widths.map((width) => (
                <button
                  key={width.value}
                  onClick={() => {
                    onUpdatePreference('columnWidth', width.value)
                    onUpdatePreference('columnWidthCustom', undefined)
                  }}
                  className="p-3 rounded-lg border-2 text-sm font-medium transition-all"
                  style={{
                    borderColor: preferences.columnWidth === width.value && !preferences.columnWidthCustom ? theme.accent : theme.border,
                    backgroundColor: preferences.columnWidth === width.value && !preferences.columnWidthCustom ? `${theme.accent}15` : 'transparent',
                    color: preferences.columnWidth === width.value && !preferences.columnWidthCustom ? theme.accent : theme.text
                  }}
                >
                  {width.label}
                </button>
              ))}
            </div>

            {/* Slider de largura personalizada */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium" style={{ color: theme.secondary }}>
                  Ajuste personalizado
                </label>
                <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{
                  color: preferences.columnWidthCustom ? theme.accent : theme.secondary,
                  backgroundColor: preferences.columnWidthCustom ? `${theme.accent}15` : 'transparent'
                }}>
                  {preferences.columnWidthCustom || 750}px
                </span>
              </div>
              <input
                type="range"
                min="400"
                max="2000"
                step="50"
                value={preferences.columnWidthCustom || 750}
                onChange={(e) => onUpdatePreference('columnWidthCustom', parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${theme.accent} 0%, ${theme.accent} ${((preferences.columnWidthCustom || 750) - 400) / 16}%, ${theme.border} ${((preferences.columnWidthCustom || 750) - 400) / 16}%, ${theme.border} 100%)`
                }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px]" style={{ color: theme.secondary, opacity: 0.6 }}>400px</span>
                <span className="text-[10px]" style={{ color: theme.secondary, opacity: 0.6 }}>2000px</span>
              </div>
            </div>
          </div>

          {/* Espaçamento entre Linhas */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text, opacity: 0.8 }}>
              <AlignLeft className="w-4 h-4" />
              Espaçamento
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {lineHeights.map((height) => (
                <button
                  key={height.value}
                  onClick={() => onUpdatePreference('lineHeight', height.value)}
                  className="p-3 rounded-lg border-2 text-sm font-medium transition-all"
                  style={{
                    borderColor: preferences.lineHeight === height.value ? theme.accent : theme.border,
                    backgroundColor: preferences.lineHeight === height.value ? `${theme.accent}15` : 'transparent',
                    color: preferences.lineHeight === height.value ? theme.accent : theme.text
                  }}
                >
                  {height.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alinhamento de Texto */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text, opacity: 0.8 }}>
              <AlignJustify className="w-4 h-4" />
              Alinhamento
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {textAligns.map((align) => (
                <button
                  key={align.value}
                  onClick={() => onUpdatePreference('textAlign', align.value)}
                  className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all"
                  style={{
                    borderColor: preferences.textAlign === align.value ? theme.accent : theme.border,
                    backgroundColor: preferences.textAlign === align.value ? `${theme.accent}15` : 'transparent',
                    color: preferences.textAlign === align.value ? theme.accent : theme.text
                  }}
                >
                  {align.icon}
                  <span>{align.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
