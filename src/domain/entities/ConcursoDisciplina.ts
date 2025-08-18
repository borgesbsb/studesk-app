import { Concurso } from "./Concurso"
import { Disciplina } from "./Disciplina"

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
  disciplina?: Disciplina
} 