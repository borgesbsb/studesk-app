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
  static async criarDisciplina(userId: string, data: CreateDisciplinaInput) {
    try {
      return await prisma.disciplina.create({
        data: {
          ...data,
          userId,
        },
      })
    } catch (error) {
      const errorLog = logError(error, 'criarDisciplina')
      throw new Error(formatPrismaError(error))
    }
  }

  static async listarDisciplinas(userId: string): Promise<Disciplina[]> {
    try {
      return await prisma.disciplina.findMany({
        where: { userId },
        orderBy: { nome: "asc" }
      })
    } catch (error) {
      const errorLog = logError(error, 'listarDisciplinas')
      throw new Error(formatPrismaError(error))
    }
  }

  static async buscarDisciplinaPorId(userId: string, id: string): Promise<Disciplina | null> {
    try {
      return await prisma.disciplina.findUnique({
        where: {
          id,
          userId
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'buscarDisciplinaPorId')
      throw new Error(formatPrismaError(error))
    }
  }

  static async atualizarDisciplina(userId: string, id: string, data: UpdateDisciplinaInput) {
    try {
      // Primeiro verifica se a disciplina pertence ao usuário
      const disciplina = await prisma.disciplina.findUnique({
        where: { id, userId }
      })

      if (!disciplina) {
        throw new Error('Disciplina não encontrada ou sem permissão')
      }

      return await prisma.disciplina.update({
        where: { id },
        data,
      })
    } catch (error) {
      const errorLog = logError(error, 'atualizarDisciplina')
      throw new Error(formatPrismaError(error))
    }
  }

  static async deletarDisciplina(userId: string, id: string) {
    try {
      // Usar transação para garantir integridade
      return await prisma.$transaction(async (tx) => {
        // Primeiro verifica se a disciplina pertence ao usuário
        const disciplina = await tx.disciplina.findUnique({
          where: { id, userId }
        })

        if (!disciplina) {
          throw new Error('Disciplina não encontrada ou sem permissão')
        }

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