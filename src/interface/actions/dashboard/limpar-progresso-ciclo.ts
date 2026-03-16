"use server"

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'

export async function limparProgressoCiclo(data?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await requireAuth()

    let baseDate: Date
    if (typeof data === 'string') {
      const [y, m, d] = data.split('-').map(Number)
      baseDate = new Date(Date.UTC(y, m - 1, d))
    } else {
      const now = new Date()
      baseDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    }
    const tomorrowUTC = new Date(baseDate.getTime() + 86400000)

    const planoAtivo = await prisma.planoEstudo.findFirst({
      where: {
        ativo: true,
        OR: [{ userId }, { userId: null, usuarios: { some: { userId } } }],
        dataInicio: { lt: tomorrowUTC },
        dataFim: { gte: baseDate }
      }
    })
    if (!planoAtivo) return { error: 'Nenhum plano ativo encontrado' }

    const semana = await prisma.semanaEstudo.findFirst({
      where: {
        planoId: planoAtivo.id,
        dataInicio: { lt: tomorrowUTC },
        dataFim: { gte: baseDate }
      }
    })
    if (!semana) return { error: 'Nenhum ciclo ativo encontrado' }

    if (planoAtivo.userId === null) {
      // ── PLANO COMPARTILHADO ──────────────────────────────────────────────
      const planoUsuario = await prisma.planoEstudoUsuario.findUnique({
        where: { planoId_userId: { planoId: planoAtivo.id, userId } }
      })
      if (!planoUsuario) return { error: 'Sem acesso ao plano' }

      const progressos = await prisma.progressoUsuarioDisciplina.findMany({
        where: { planoUsuarioId: planoUsuario.id, disciplinaSemana: { semanaId: semana.id } },
        select: { id: true }
      })
      const progressoIds = progressos.map(p => p.id)

      await prisma.progressoUsuarioDisciplinaDia.updateMany({
        where: { progressoId: { in: progressoIds } },
        data: { horasRealizadas: 0, questoesRealizadas: 0 }
      })

      await prisma.progressoUsuarioDisciplinaExtra.updateMany({
        where: { planoUsuarioId: planoUsuario.id, semanaId: semana.id },
        data: { horasRealizadas: 0, questoesRealizadas: 0 }
      })
    } else {
      // ── PLANO PESSOAL ────────────────────────────────────────────────────
      const disciplinaSemanaIds = await prisma.disciplinaSemana.findMany({
        where: { semanaId: semana.id },
        select: { id: true }
      })

      await prisma.disciplinaDia.updateMany({
        where: { disciplinaSemanaId: { in: disciplinaSemanaIds.map(d => d.id) } },
        data: { horasRealizadas: 0, questoesRealizadas: 0 }
      })
    }

    // Deletar HistoricoLeitura do usuário no período do ciclo
    await prisma.historicoLeitura.deleteMany({
      where: {
        userId,
        dataLeitura: { gte: semana.dataInicio, lte: semana.dataFim }
      }
    })

    revalidatePath('/[userHash]/dashboard', 'page')
    revalidatePath('/[userHash]/hoje', 'page')
    return { success: true }
  } catch (error) {
    console.error('Erro ao limpar progresso:', error)
    return { error: 'Erro ao limpar progresso' }
  }
}
