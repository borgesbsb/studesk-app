import { ConcursoDisciplina } from "./Disciplina"

export interface Concurso {
    id: string
    nome: string
    orgao: string
    banca: string
    cargo: string
    editalUrl?: string | null
    imagemUrl?: string | null
    dataProva?: Date | null
    dataPublicacao?: Date | null
    inicioCurso?: Date | null
    createdAt: Date
    updatedAt: Date
    disciplinas?: ConcursoDisciplina[]
}

export interface CreateConcursoDTO {
    nome: string
    orgao: string
    banca: string
    cargo: string
    editalUrl?: string
    imagemUrl?: string
    dataProva?: Date
    dataPublicacao?: Date
    inicioCurso?: Date
}

export interface UpdateConcursoDTO {
    nome?: string
    orgao?: string
    banca?: string
    cargo?: string
    editalUrl?: string
    imagemUrl?: string
    dataProva?: Date
    dataPublicacao?: Date
    inicioCurso?: Date
}