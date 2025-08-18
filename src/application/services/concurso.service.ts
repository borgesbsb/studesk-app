// src/application/services/concurso.service.ts

import { prisma } from "@/lib/db"
import { Concurso } from "@/domain/entities/Concurso"
import { logError, formatPrismaError } from "@/lib/error-handler"
import { Prisma } from "@prisma/client"

type CreateConcursoInput = {
  nome: string
  orgao: string
  banca: string
  cargo: string
  editalUrl?: string | null
  imagemUrl?: string | null
  dataProva?: Date | null
  dataPublicacao?: Date | null
  inicioCurso?: Date | null
}

type UpdateConcursoInput = Partial<CreateConcursoInput>

export class ConcursoService {
  static async criarConcurso(data: CreateConcursoInput) {
    try {
      return await prisma.concurso.create({
        data,
      })
    } catch (error) {
      const errorLog = logError(error, 'criarConcurso')
      throw new Error(formatPrismaError(error))
    }
  }

  static async listarConcursos(): Promise<Concurso[]> {
    try {
      return await prisma.concurso.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          disciplinas: true
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'listarConcursos')
      throw new Error(formatPrismaError(error))
    }
  }

  static async buscarConcursoPorId(id: string): Promise<Concurso | null> {
    try {
      return await prisma.concurso.findUnique({
        where: { id },
        include: {
          disciplinas: true
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'buscarConcursoPorId')
      throw new Error(formatPrismaError(error))
    }
  }

  static async atualizarConcurso(id: string, data: UpdateConcursoInput) {
    try {
      return await prisma.concurso.update({
        where: { id },
        data,
      })
    } catch (error) {
      const errorLog = logError(error, 'atualizarConcurso')
      throw new Error(formatPrismaError(error))
    }
  }

  static async deletarConcurso(id: string) {
    try {
      return await prisma.concurso.delete({
        where: { id },
      })
    } catch (error) {
      const errorLog = logError(error, 'deletarConcurso')
      throw new Error(formatPrismaError(error))
    }
  }
}
