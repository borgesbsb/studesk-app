'use client'

import { useState, useEffect } from 'react'
import { Palette } from 'lucide-react'

export type PdfTheme = 'normal' | 'sepia' | 'night' | 'high-contrast' | 'low-brightness' | 'grayscale' | 'green'

export interface ThemeSettings {
  brightness: number
  contrast: number
  saturation: number
}

export interface PdfThemeConfig {
  id: PdfTheme
  name: string
  description: string
  baseFilter: string
  icon: string
  defaultSettings: ThemeSettings
}

export const PDF_THEMES: PdfThemeConfig[] = [
  {
    id: 'normal',
    name: 'Normal',
    description: 'Visualização padrão',
    baseFilter: '',
    icon: '📄',
    defaultSettings: { brightness: 100, contrast: 100, saturation: 100 }
  },
  {
    id: 'sepia',
    name: 'Sépia',
    description: 'Tom amarelado, reduz cansaço visual',
    baseFilter: 'sepia(50%)',
    icon: '📜',
    defaultSettings: { brightness: 90, contrast: 105, saturation: 90 }
  },
  {
    id: 'night',
    name: 'Noturno',
    description: 'Inverte cores para leitura à noite',
    baseFilter: 'invert(90%) hue-rotate(180deg)',
    icon: '🌙',
    defaultSettings: { brightness: 80, contrast: 120, saturation: 100 }
  },
  {
    id: 'high-contrast',
    name: 'Alto Contraste',
    description: 'Aumenta contraste para melhor legibilidade',
    baseFilter: '',
    icon: '⚡',
    defaultSettings: { brightness: 100, contrast: 150, saturation: 120 }
  },
  {
    id: 'low-brightness',
    name: 'Brilho Reduzido',
    description: 'Diminui brilho para ambientes escuros',
    baseFilter: '',
    icon: '🔅',
    defaultSettings: { brightness: 70, contrast: 110, saturation: 100 }
  },
  {
    id: 'grayscale',
    name: 'Escala de Cinza',
    description: 'Remove cores',
    baseFilter: 'grayscale(100%)',
    icon: '⚫',
    defaultSettings: { brightness: 100, contrast: 110, saturation: 0 }
  },
  {
    id: 'green',
    name: 'Verde Claro',
    description: 'Tom verde suave, confortável para leitura',
    baseFilter: 'sepia(40%) hue-rotate(40deg)',
    icon: '💚',
    defaultSettings: { brightness: 95, contrast: 105, saturation: 80 }
  }
]

export function buildFilterString(theme: PdfThemeConfig, settings: ThemeSettings | undefined): string {
  if (!settings) return 'none'

  const parts = []

  if (settings.brightness !== 100) {
    parts.push(`brightness(${settings.brightness}%)`)
  }
  if (settings.contrast !== 100) {
    parts.push(`contrast(${settings.contrast}%)`)
  }
  if (settings.saturation !== 100 && theme.id !== 'grayscale') {
    parts.push(`saturate(${settings.saturation}%)`)
  }
  if (theme.baseFilter) {
    parts.push(theme.baseFilter)
  }

  return parts.length > 0 ? parts.join(' ') : 'none'
}

interface PdfThemeSelectorProps {
  onThemeChange: (filter: string) => void
}

export function PdfThemeSelector({ onThemeChange }: PdfThemeSelectorProps) {
  const [currentTheme, setCurrentTheme] = useState<PdfTheme>('normal')
  const [isOpen, setIsOpen] = useState(false)
  const [themeSettings, setThemeSettings] = useState<Record<PdfTheme, ThemeSettings>>(() => {
    const defaults: Record<PdfTheme, ThemeSettings> = {} as any
    PDF_THEMES.forEach(theme => {
      defaults[theme.id] = { ...theme.defaultSettings }
    })
    return defaults
  })

  // Carregar tema e configurações salvas do localStorage (apenas uma vez)
  useEffect(() => {
    const savedTheme = localStorage.getItem('pdf-viewer-theme') as PdfTheme
    const savedSettings = localStorage.getItem('pdf-viewer-theme-settings')

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setThemeSettings(parsed)
      } catch (e) {
        console.error('Erro ao carregar configurações:', e)
      }
    }

    if (savedTheme && PDF_THEMES.some(t => t.id === savedTheme)) {
      setCurrentTheme(savedTheme)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Atualizar filtro quando as configurações mudarem
  useEffect(() => {
    const theme = PDF_THEMES.find(t => t.id === currentTheme)
    if (!theme) return

    const settings = themeSettings[currentTheme]
    if (!settings) return

    const filterString = buildFilterString(theme, settings)
    onThemeChange(filterString)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTheme, themeSettings])

  const handleThemeSelect = (themeId: PdfTheme) => {
    setCurrentTheme(themeId)
    localStorage.setItem('pdf-viewer-theme', themeId)
  }

  const handleSettingChange = (themeId: PdfTheme, setting: keyof ThemeSettings, value: number) => {
    setThemeSettings(prev => {
      const updated = {
        ...prev,
        [themeId]: {
          ...prev[themeId],
          [setting]: value
        }
      }
      localStorage.setItem('pdf-viewer-theme-settings', JSON.stringify(updated))
      return updated
    })
  }

  const handleResetTheme = (themeId: PdfTheme) => {
    const theme = PDF_THEMES.find(t => t.id === themeId)!
    setThemeSettings(prev => {
      const updated = {
        ...prev,
        [themeId]: { ...theme.defaultSettings }
      }
      localStorage.setItem('pdf-viewer-theme-settings', JSON.stringify(updated))
      return updated
    })
  }

  const currentThemeConfig = PDF_THEMES.find(t => t.id === currentTheme) || PDF_THEMES[0]

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          color: '#333',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f5f5f5'
          e.currentTarget.style.borderColor = '#0078d4'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'white'
          e.currentTarget.style.borderColor = '#e0e0e0'
        }}
        title="Alterar tema de visualização"
      >
        <span style={{ fontSize: '16px' }}>{currentThemeConfig.icon}</span>
        <span>{currentThemeConfig.name}</span>
        <span style={{ fontSize: '10px', marginLeft: '2px' }}>▼</span>
      </button>

      {isOpen && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
          />

          {/* Dropdown */}
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: '280px',
              zIndex: 1000,
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '8px 12px',
              borderBottom: '1px solid #e0e0e0',
              background: '#f9f9f9',
              fontWeight: '600',
              fontSize: '12px',
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Temas de Visualização
            </div>

            {PDF_THEMES.map((theme) => {
              const settings = themeSettings[theme.id] || theme.defaultSettings
              const isActive = currentTheme === theme.id

              return (
                <div
                  key={theme.id}
                  style={{
                    background: isActive ? '#f0f7ff' : 'white',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  {/* Header do tema */}
                  <button
                    onClick={() => handleThemeSelect(theme.id)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <span style={{ fontSize: '20px', minWidth: '24px' }}>{theme.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: isActive ? '600' : '500',
                        fontSize: '14px',
                        color: isActive ? '#0078d4' : '#333',
                        marginBottom: '2px'
                      }}>
                        {theme.name}
                        {isActive && (
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '12px',
                            color: '#0078d4'
                          }}>✓</span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#666',
                        lineHeight: '1.3'
                      }}>
                        {theme.description}
                      </div>
                    </div>
                  </button>

                  {/* Sliders de ajuste (aparecem quando o tema está ativo) */}
                  {isActive && (
                    <div style={{
                      padding: '8px 16px 16px 52px',
                      background: '#fafbfc',
                      borderTop: '1px solid #e8eef3'
                    }}>
                      {/* Brilho */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '4px'
                        }}>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: '#555', textTransform: 'uppercase' }}>
                            💡 Brilho
                          </label>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#0078d4', minWidth: '45px', textAlign: 'right' }}>
                            {settings.brightness}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="150"
                          value={settings.brightness}
                          onChange={(e) => handleSettingChange(theme.id, 'brightness', Number(e.target.value))}
                          style={{ width: '100%', cursor: 'pointer' }}
                        />
                      </div>

                      {/* Contraste */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '4px'
                        }}>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: '#555', textTransform: 'uppercase' }}>
                            ⚡ Contraste
                          </label>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#0078d4', minWidth: '45px', textAlign: 'right' }}>
                            {settings.contrast}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="200"
                          value={settings.contrast}
                          onChange={(e) => handleSettingChange(theme.id, 'contrast', Number(e.target.value))}
                          style={{ width: '100%', cursor: 'pointer' }}
                        />
                      </div>

                      {/* Saturação (exceto para grayscale) */}
                      {theme.id !== 'grayscale' && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px'
                          }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#555', textTransform: 'uppercase' }}>
                              🎨 Saturação
                            </label>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#0078d4', minWidth: '45px', textAlign: 'right' }}>
                              {settings.saturation}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="200"
                            value={settings.saturation}
                            onChange={(e) => handleSettingChange(theme.id, 'saturation', Number(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer' }}
                          />
                        </div>
                      )}

                      {/* Botão Reset */}
                      <button
                        onClick={() => handleResetTheme(theme.id)}
                        style={{
                          width: '100%',
                          padding: '6px 12px',
                          background: 'white',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#666',
                          transition: 'all 0.2s',
                          marginTop: '4px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f5f5f5'
                          e.currentTarget.style.borderColor = '#999'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white'
                          e.currentTarget.style.borderColor = '#ddd'
                        }}
                      >
                        🔄 Restaurar Padrão
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
