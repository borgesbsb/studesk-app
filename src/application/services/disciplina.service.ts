import { prisma } from "@/lib/db"
import { Disciplina } from "@/domain/entities/Disciplina"
import { logError, formatPrismaError } from "@/lib/error-handler"
import { Prisma } from "@prisma/client"

type CreateDisciplinaInput = {
  nome: string
  descricao?: string | null
  cor?: string | null
}

type UpdateDisciplinaInput = Partial<CreateDisciplinaInput>

export class DisciplinaService {
  static async criarDisciplina(data: CreateDisciplinaInput) {
    try {
      return await prisma.disciplina.create({
        data,
      })
    } catch (error) {
      const errorLog = logError(error, 'criarDisciplina')
      throw new Error(formatPrismaError(error))
    }
  }

  static async listarDisciplinas(): Promise<Disciplina[]> {
    try {
      return await prisma.disciplina.findMany({
        orderBy: { nome: "asc" },
        include: {
          concursos: {
            include: {
              concurso: true
            }
          }
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'listarDisciplinas')
      throw new Error(formatPrismaError(error))
    }
  }

  static async buscarDisciplinaPorId(id: string): Promise<Disciplina | null> {
    try {
      return await prisma.disciplina.findUnique({
        where: { id },
        include: {
          concursos: {
            include: {
              concurso: true
            }
          }
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'buscarDisciplinaPorId')
      throw new Error(formatPrismaError(error))
    }
  }

  static async atualizarDisciplina(id: string, data: UpdateDisciplinaInput) {
    try {
      return await prisma.disciplina.update({
        where: { id },
        data,
      })
    } catch (error) {
      const errorLog = logError(error, 'atualizarDisciplina')
      throw new Error(formatPrismaError(error))
    }
  }

  static async deletarDisciplina(id: string) {
    try {
      return await prisma.disciplina.delete({
        where: { id },
      })
    } catch (error) {
      const errorLog = logError(error, 'deletarDisciplina')
      throw new Error(formatPrismaError(error))
    }
  }

  // Métodos específicos para o relacionamento many-to-many
  static async adicionarDisciplinaAoConcurso(concursoId: string, disciplinaId: string, dados: {
    ordem?: number;
    peso?: number;
    questoes?: number;
    pontos?: number;
  }) {
    try {
      return await prisma.concursoDisciplina.create({
        data: {
          concursoId,
          disciplinaId,
          ordem: dados.ordem || 0,
          peso: dados.peso || 1.0,
          questoes: dados.questoes || 0,
          pontos: dados.pontos || 0.0
        },
        include: {
          disciplina: true,
          concurso: true
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'adicionarDisciplinaAoConcurso')
      throw new Error(formatPrismaError(error))
    }
  }

  static async removerDisciplinaDoConcurso(concursoId: string, disciplinaId: string) {
    try {
      return await prisma.concursoDisciplina.delete({
        where: {
          concursoId_disciplinaId: {
            concursoId,
            disciplinaId
          }
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'removerDisciplinaDoConcurso')
      throw new Error(formatPrismaError(error))
    }
  }

  static async atualizarDisciplinaNoConcurso(concursoId: string, disciplinaId: string, dados: {
    ordem?: number;
    peso?: number;
    questoes?: number;
    pontos?: number;
  }) {
    try {
      return await prisma.concursoDisciplina.update({
        where: {
          concursoId_disciplinaId: {
            concursoId,
            disciplinaId
          }
        },
        data: dados,
        include: {
          disciplina: true,
          concurso: true
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'atualizarDisciplinaNoConcurso')
      throw new Error(formatPrismaError(error))
    }
  }

  static async listarDisciplinasDoConcurso(concursoId: string) {
    try {
      return await prisma.concursoDisciplina.findMany({
        where: { concursoId },
        include: {
          disciplina: true
        },
        orderBy: { ordem: "asc" }
      })
    } catch (error) {
      const errorLog = logError(error, 'listarDisciplinasDoConcurso')
      throw new Error(formatPrismaError(error))
    }
  }
} 