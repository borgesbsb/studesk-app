import { Disciplina } from "./Disciplina"

export interface DisciplinaMaterial {
  id: string
  disciplinaId: string
  materialId: string
  createdAt: Date
  updatedAt: Date
  disciplina?: Disciplina
}

export type MaterialTipo = 'PDF' | 'VIDEO'

export interface MaterialEstudo {
  id: string
  nome: string
  tipo: MaterialTipo
  arquivoPdfUrl: string | null
  arquivoVideoUrl: string | null
  totalPaginas: number
  paginasLidas: number
  duracaoSegundos: number | null
  tempoAssistido: number | null
  createdAt: string | Date
  updatedAt: string | Date
  disciplinas?: DisciplinaMaterial[]
}

export interface CreateMaterialEstudoDTO {
  nome: string
  tipo: MaterialTipo
  totalPaginas: number
  paginasLidas?: number
  duracaoSegundos?: number
  tempoAssistido?: number
  arquivoPdfUrl?: string // Opcional - PDFs armazenados no IndexedDB
  arquivoVideoUrl?: string // Opcional - Vídeos armazenados no IndexedDB
  disciplinaIds: string[]
}

export interface UpdateMaterialEstudoDTO {
  nome?: string
  tipo?: MaterialTipo
  totalPaginas?: number
  paginasLidas?: number
  duracaoSegundos?: number
  tempoAssistido?: number
  arquivoPdfUrl?: string
  arquivoVideoUrl?: string
  disciplinaIds?: string[]
} 