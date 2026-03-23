import { prisma } from "@/lib/db"
import { logError, formatPrismaError } from "@/lib/error-handler"
import { Edital } from "@/domain/entities/Edital"

// Usuário só visualiza editais do admin (userId: null)
export class EditalService {
  static async listarEditais(): Promise<Edital[]> {
    try {
      return await prisma.edital.findMany({
        where: { userId: null },
        include: {
          disciplinas: {
            include: { disciplina: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { nome: 'asc' },
      }) as unknown as Edital[]
    } catch (error) {
      logError(error, 'listarEditais')
      throw new Error(formatPrismaError(error))
    }
  }

  static async buscarEditalPorId(id: string): Promise<Edital | null> {
    try {
      return await prisma.edital.findUnique({
        where: { id, userId: null },
        include: {
          disciplinas: {
            include: { disciplina: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      }) as unknown as Edital | null
    } catch (error) {
      logError(error, 'buscarEditalPorId')
      throw new Error(formatPrismaError(error))
    }
  }
}
