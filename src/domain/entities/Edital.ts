export interface EditalDisciplina {
  id: string
  editalId: string
  disciplinaId: string
  createdAt: Date
  disciplina?: {
    id: string
    nome: string
    cor?: string | null
    descricao?: string | null
    cargaHoraria: number
    peso: number
  }
}

export interface Edital {
  id: string
  userId: string
  nome: string
  descricao?: string | null
  orgao?: string | null
  cargo?: string | null
  ano?: number | null
  link?: string | null
  createdAt: Date
  updatedAt: Date
  disciplinas?: EditalDisciplina[]
}

export interface CreateEditalDTO {
  nome: string
  descricao?: string
  orgao?: string
  cargo?: string
  ano?: number
  link?: string
}

export interface UpdateEditalDTO {
  nome?: string
  descricao?: string
  orgao?: string
  cargo?: string
  ano?: number
  link?: string
}
