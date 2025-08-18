import { Concurso } from "./Concurso"
import { MaterialEstudo } from "./MaterialEstudo"

export interface ConcursoDisciplina {
  id: string
  concursoId: string
  disciplinaId: string
  ordem: number
  peso: number
  questoes: number
  pontos: number
  createdAt: Date
  updatedAt: Date
  concurso?: Concurso
}

export interface DisciplinaMaterial {
  id: string
  disciplinaId: string
  materialId: string
  createdAt: Date
  updatedAt: Date
  material?: MaterialEstudo
}

export interface Disciplina {
  id: string
  nome: string
  descricao?: string | null
  cargaHoraria: number
  peso: number
  createdAt: Date
  updatedAt: Date
  concursos?: ConcursoDisciplina[]
  materiais?: DisciplinaMaterial[]
}

export interface CreateDisciplinaDTO {
  nome: string
  descricao?: string
  cargaHoraria?: number
  peso?: number
}

export interface UpdateDisciplinaDTO {
  nome?: string
  descricao?: string
  cargaHoraria?: number
  peso?: number
} 