import { Disciplina } from "./Disciplina"

export interface DisciplinaMaterial {
  id: string
  disciplinaId: string
  materialId: string
  createdAt: Date
  updatedAt: Date
  disciplina?: Disciplina
}

export interface MaterialEstudo {
  id: string
  nome: string
  arquivoPdfUrl: string | null
  totalPaginas: number
  paginasLidas: number
  createdAt: string | Date
  updatedAt: string | Date
  disciplinas?: DisciplinaMaterial[]
}

export interface CreateMaterialEstudoDTO {
  nome: string
  totalPaginas: number
  paginasLidas?: number
  arquivoPdfUrl: string
  disciplinaIds: string[]
}

export interface UpdateMaterialEstudoDTO {
  nome?: string
  totalPaginas?: number
  paginasLidas?: number
  arquivoPdfUrl?: string
  disciplinaIds?: string[]
} 