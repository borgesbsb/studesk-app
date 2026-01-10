// Tipos compartilhados do Reader

export type ReadingTheme = 'light' | 'dark' | 'sepia' | 'high-contrast'
export type FontFamily = 'sans-serif' | 'serif' | 'mono'
export type ColumnWidth = 'narrow' | 'medium' | 'wide' | 'full'
export type LineHeight = 'compact' | 'normal' | 'relaxed' | 'loose'
export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export interface ReaderPreferences {
  theme: ReadingTheme
  fontFamily: FontFamily
  fontSize: number
  columnWidth: ColumnWidth
  columnWidthCustom?: number // Largura personalizada em pixels (400-1200)
  lineHeight: LineHeight
  textAlign: TextAlign
}

export interface Annotation {
  id: string
  texto: string
  startOffset: number
  endOffset: number
  cor: string
  tipo: string
  pagina?: number
  metadata?: any
}

export interface ReadingProgress {
  scrollPercentage: number
  lastPosition: number
  timeSpent: number // em segundos
}

export const THEME_CONFIGS: Record<ReadingTheme, {
  bg: string
  text: string
  secondary: string
  border: string
  accent: string
  bgSecondary: string
}> = {
  light: {
    bg: '#ffffff',
    text: '#1a1a1a',
    secondary: '#666666',
    border: '#e5e7eb',
    accent: '#3b82f6',
    bgSecondary: '#f3f4f6',
  },
  dark: {
    bg: '#1a1a1a',
    text: '#e5e7eb',
    secondary: '#9ca3af',
    border: '#374151',
    accent: '#60a5fa',
    bgSecondary: '#374151',
  },
  sepia: {
    bg: '#f4ecd8',
    text: '#5f4b32',
    secondary: '#8b7355',
    border: '#d4c5a9',
    accent: '#8b6914',
    bgSecondary: '#e8dcc0',
  },
  'high-contrast': {
    bg: '#000000',
    text: '#ffff00',
    secondary: '#ffff00',
    border: '#ffff00',
    accent: '#ffff00',
    bgSecondary: '#1a1a1a',
  },
}

export const COLUMN_WIDTH_VALUES: Record<ColumnWidth, string> = {
  narrow: '600px',
  medium: '750px',
  wide: '900px',
  full: '100%',
}

export const LINE_HEIGHT_VALUES: Record<LineHeight, number> = {
  compact: 1.4,
  normal: 1.6,
  relaxed: 1.8,
  loose: 2.0,
}

export const FONT_FAMILIES: Record<FontFamily, string> = {
  'sans-serif': 'system-ui, -apple-system, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  mono: '"Courier New", Courier, monospace',
}

export const TEXT_ALIGN_VALUES: Record<TextAlign, string> = {
  left: 'left',
  center: 'center',
  right: 'right',
  justify: 'justify',
}
