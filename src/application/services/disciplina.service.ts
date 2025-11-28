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
        orderBy: { nome: "asc" }
      })
    } catch (error) {
      const errorLog = logError(error, 'listarDisciplinas')
      throw new Error(formatPrismaError(error))
    }
  }

  static async buscarDisciplinaPorId(id: string): Promise<Disciplina | null> {
    try {
      return await prisma.disciplina.findUnique({
        where: { id }
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
      // Usar transação para garantir integridade
      return await prisma.$transaction(async (tx) => {
        // 1. Excluir todas as associações com materiais
        await tx.disciplinaMaterial.deleteMany({
          where: { disciplinaId: id }
        })
        
        // 2. Excluir a disciplina
        return await tx.disciplina.delete({
          where: { id }
        })
      })
    } catch (error) {
      const errorLog = logError(error, 'deletarDisciplina')
      throw new Error(formatPrismaError(error))
    }
  }

} 