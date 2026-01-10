// Re-export Prisma types
export type {
  User,
  Disciplina,
  MaterialEstudo,
  PlanoEstudo,
  SemanaEstudo,
  DisciplinaSemana,
  HistoricoLeitura,
  DisciplinaMaterial,
} from '@studesk/database'

// Common API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  perPage: number
}

// Auth types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

// Study Plan types
export type PlanoEstudoMode = 'simples' | 'rapido' | 'agil' | 'disciplinas'

export interface CreatePlanoEstudoInput {
  titulo: string
  dataInicio: Date | string
  dataFim: Date | string
  modo: PlanoEstudoMode
  disciplinas: string[] // IDs das disciplinas
  horasPorSemana?: number
}

// Material types
export interface CreateMaterialInput {
  titulo: string
  urlPdf: string
  totalPaginas: number
  disciplinaIds?: string[]
}

export interface UpdateMaterialProgressInput {
  materialId: string
  paginaAtual: number
}

// Dashboard types
export interface MaterialDoDia {
  disciplina: {
    id: string
    nome: string
    cor: string
    icone: string
  }
  materiais: Array<{
    id: string
    titulo: string
    paginaAtual: number
    totalPaginas: number
    progresso: number
  }>
  horasPlanejadas: number
  horasRealizadas: number
}
