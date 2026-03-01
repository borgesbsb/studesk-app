'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

// Retorna o PlanoEstudoUsuario do usuário autenticado para um plano compartilhado,
// incluindo os progressos por disciplina e disciplinas extras
export async function getProgressoUsuarioPlano(planoId: string) {
  try {
    const { userId } = await requireAuth()

    const planoUsuario = await prisma.planoEstudoUsuario.findUnique({
      where: { planoId_userId: { planoId, userId } },
      include: {
        plano: {
          include: {
            disciplinasDisponiveis: {
              include: { disciplina: { select: { id: true, nome: true, cor: true } } },
              orderBy: { createdAt: 'asc' }
            },
            semanas: {
              include: {
                disciplinas: {
                  include: {
                    disciplina: true,
                    dias: { orderBy: { dia: 'asc' } }
                  },
                  orderBy: { prioridade: 'asc' }
                }
              },
              orderBy: { numeroSemana: 'asc' }
            }
          }
        },
        progressos: {
          include: {
            dias: { orderBy: { dia: 'asc' } }
          }
        },
        disciplinasExtras: {
          include: {
            disciplina: { select: { id: true, nome: true, cor: true } }
          },
          orderBy: { dia: 'asc' }
        }
      }
    })

    if (!planoUsuario) return { error: 'Plano não encontrado ou sem acesso' }
    return { success: true, data: planoUsuario }
  } catch (error) {
    console.error('Erro ao buscar progresso do usuário:', error)
    return { error: 'Erro ao buscar progresso' }
  }
}

// Cria ou atualiza o progresso de um usuário em uma disciplina de um plano compartilhado
export async function upsertProgressoUsuarioDisciplina(data: {
  planoId: string
  disciplinaSemanaId: string
  horasPlanejadas?: number
  questoesPlanejadas?: number
  tempoVideoPlanejado?: number
  totalPaginas?: number
  diasEstudo?: string
  horasRealizadas?: number
  questoesRealizadas?: number
  paginasLidas?: number
  tempoVideoRealizado?: number
  concluida?: boolean
  observacoes?: string
}) {
  try {
    const { userId } = await requireAuth()

    // Busca ou verifica que o usuário está atribuído ao plano
    const planoUsuario = await prisma.planoEstudoUsuario.findUnique({
      where: { planoId_userId: { planoId: data.planoId, userId } }
    })
    if (!planoUsuario) return { error: 'Plano não encontrado ou sem acesso' }

    const updateData: Record<string, unknown> = {}
    if (data.horasPlanejadas !== undefined) updateData.horasPlanejadas = data.horasPlanejadas
    if (data.questoesPlanejadas !== undefined) updateData.questoesPlanejadas = data.questoesPlanejadas
    if (data.tempoVideoPlanejado !== undefined) updateData.tempoVideoPlanejado = data.tempoVideoPlanejado
    if (data.totalPaginas !== undefined) updateData.totalPaginas = data.totalPaginas
    if (data.diasEstudo !== undefined) updateData.diasEstudo = data.diasEstudo
    if (data.horasRealizadas !== undefined) updateData.horasRealizadas = data.horasRealizadas
    if (data.questoesRealizadas !== undefined) updateData.questoesRealizadas = data.questoesRealizadas
    if (data.paginasLidas !== undefined) updateData.paginasLidas = data.paginasLidas
    if (data.tempoVideoRealizado !== undefined) updateData.tempoVideoRealizado = data.tempoVideoRealizado
    if (data.concluida !== undefined) updateData.concluida = data.concluida
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes

    const progresso = await prisma.progressoUsuarioDisciplina.upsert({
      where: {
        planoUsuarioId_disciplinaSemanaId: {
          planoUsuarioId: planoUsuario.id,
          disciplinaSemanaId: data.disciplinaSemanaId
        }
      },
      update: updateData,
      create: {
        planoUsuarioId: planoUsuario.id,
        disciplinaSemanaId: data.disciplinaSemanaId,
        horasPlanejadas: data.horasPlanejadas || 0,
        questoesPlanejadas: data.questoesPlanejadas || 0,
        tempoVideoPlanejado: data.tempoVideoPlanejado || 0,
        totalPaginas: data.totalPaginas || 0,
        diasEstudo: data.diasEstudo || null,
        horasRealizadas: data.horasRealizadas || 0,
        questoesRealizadas: data.questoesRealizadas || 0,
        paginasLidas: data.paginasLidas || 0,
        tempoVideoRealizado: data.tempoVideoRealizado || 0,
        concluida: data.concluida || false,
        observacoes: data.observacoes || null
      },
      include: { dias: true }
    })

    return { success: true, data: progresso }
  } catch (error) {
    console.error('Erro ao salvar progresso:', error)
    return { error: 'Erro ao salvar progresso' }
  }
}

// Adiciona uma disciplina do pool ao ciclo para um dia específico (upsert por dia)
export async function adicionarDisciplinaCicloUsuario(data: {
  planoId: string
  semanaId: string
  disciplinaId: string
  dia: string
}) {
  try {
    const { userId } = await requireAuth()

    const planoUsuario = await prisma.planoEstudoUsuario.findUnique({
      where: { planoId_userId: { planoId: data.planoId, userId } }
    })
    if (!planoUsuario) return { error: 'Plano não encontrado ou sem acesso' }

    // Valida que a disciplina está no pool do plano
    const noPool = await prisma.planoEstudoDisciplina.findUnique({
      where: { planoId_disciplinaId: { planoId: data.planoId, disciplinaId: data.disciplinaId } }
    })
    if (!noPool) return { error: 'Disciplina não está no pool deste plano' }

    const extra = await prisma.progressoUsuarioDisciplinaExtra.upsert({
      where: {
        planoUsuarioId_semanaId_disciplinaId_dia: {
          planoUsuarioId: planoUsuario.id,
          semanaId: data.semanaId,
          disciplinaId: data.disciplinaId,
          dia: data.dia
        }
      },
      update: {},
      create: {
        planoUsuarioId: planoUsuario.id,
        semanaId: data.semanaId,
        disciplinaId: data.disciplinaId,
        dia: data.dia
      },
      include: {
        disciplina: { select: { id: true, nome: true, cor: true } }
      }
    })
    return { success: true, data: extra }
  } catch (error: unknown) {
    console.error('Erro ao adicionar disciplina extra:', error)
    return { error: 'Erro ao adicionar disciplina' }
  }
}

// Atualiza horas/questões planejadas de uma disciplina extra
export async function atualizarMetasExtraCicloUsuario(data: {
  extraId: string
  horasPlanejadas: number
  questoesPlanejadas: number
}) {
  try {
    const { userId } = await requireAuth()

    const extra = await prisma.progressoUsuarioDisciplinaExtra.findFirst({
      where: { id: data.extraId, planoUsuario: { userId } }
    })
    if (!extra) return { error: 'Disciplina não encontrada ou sem acesso' }

    const updated = await prisma.progressoUsuarioDisciplinaExtra.update({
      where: { id: data.extraId },
      data: {
        horasPlanejadas: data.horasPlanejadas,
        questoesPlanejadas: data.questoesPlanejadas,
      },
      include: { disciplina: { select: { id: true, nome: true, cor: true } } }
    })
    return { success: true, data: updated }
  } catch (error) {
    console.error('Erro ao atualizar metas do extra:', error)
    return { error: 'Erro ao salvar' }
  }
}

// Remove o registro de disciplina extra de um dia específico (cada extra já é por dia)
export async function removerDiaExtraCicloUsuario(extraId: string) {
  try {
    const { userId } = await requireAuth()

    const extra = await prisma.progressoUsuarioDisciplinaExtra.findFirst({
      where: { id: extraId, planoUsuario: { userId } }
    })
    if (!extra) return { error: 'Disciplina não encontrada ou sem acesso' }

    await prisma.progressoUsuarioDisciplinaExtra.delete({ where: { id: extraId } })
    return { success: true, deleted: true }
  } catch (error) {
    console.error('Erro ao remover dia do extra:', error)
    return { error: 'Erro ao remover disciplina do dia' }
  }
}

// Marca como removida uma disciplina que o admin colocou no ciclo
export async function removerDisciplinaAdminCicloUsuario(data: {
  planoId: string
  disciplinaSemanaId: string
}) {
  try {
    const { userId } = await requireAuth()

    const planoUsuario = await prisma.planoEstudoUsuario.findUnique({
      where: { planoId_userId: { planoId: data.planoId, userId } }
    })
    if (!planoUsuario) return { error: 'Plano não encontrado ou sem acesso' }

    const progresso = await prisma.progressoUsuarioDisciplina.upsert({
      where: {
        planoUsuarioId_disciplinaSemanaId: {
          planoUsuarioId: planoUsuario.id,
          disciplinaSemanaId: data.disciplinaSemanaId
        }
      },
      update: { removida: true },
      create: {
        planoUsuarioId: planoUsuario.id,
        disciplinaSemanaId: data.disciplinaSemanaId,
        removida: true
      }
    })
    return { success: true, data: progresso }
  } catch (error) {
    console.error('Erro ao remover disciplina do ciclo:', error)
    return { error: 'Erro ao remover disciplina' }
  }
}

// Restaura uma disciplina do admin que havia sido marcada como removida
export async function restaurarDisciplinaAdminCicloUsuario(data: {
  planoId: string
  disciplinaSemanaId: string
}) {
  try {
    const { userId } = await requireAuth()

    const planoUsuario = await prisma.planoEstudoUsuario.findUnique({
      where: { planoId_userId: { planoId: data.planoId, userId } }
    })
    if (!planoUsuario) return { error: 'Plano não encontrado ou sem acesso' }

    const progresso = await prisma.progressoUsuarioDisciplina.update({
      where: {
        planoUsuarioId_disciplinaSemanaId: {
          planoUsuarioId: planoUsuario.id,
          disciplinaSemanaId: data.disciplinaSemanaId
        }
      },
      data: { removida: false }
    })
    return { success: true, data: progresso }
  } catch (error) {
    console.error('Erro ao restaurar disciplina:', error)
    return { error: 'Erro ao restaurar disciplina' }
  }
}

// Remove uma disciplina extra adicionada pelo usuário
export async function removerDisciplinaExtraCicloUsuario(extraId: string) {
  try {
    const { userId } = await requireAuth()

    // Verifica que a extra pertence ao usuário
    const extra = await prisma.progressoUsuarioDisciplinaExtra.findFirst({
      where: { id: extraId, planoUsuario: { userId } }
    })
    if (!extra) return { error: 'Disciplina não encontrada ou sem acesso' }

    await prisma.progressoUsuarioDisciplinaExtra.delete({ where: { id: extraId } })
    return { success: true }
  } catch (error) {
    console.error('Erro ao remover disciplina extra:', error)
    return { error: 'Erro ao remover disciplina' }
  }
}

// Cria ou atualiza o progresso diário de um usuário em uma disciplina
export async function upsertProgressoUsuarioDisciplinaDia(data: {
  progressoId: string
  dia: string
  horasRealizadas?: number
  questoesRealizadas?: number
  concluida?: boolean
  observacoes?: string
}) {
  try {
    const { userId } = await requireAuth()

    // Verifica que o progresso pertence ao usuário
    const progresso = await prisma.progressoUsuarioDisciplina.findUnique({
      where: { id: data.progressoId },
      include: { planoUsuario: true }
    })
    if (!progresso || progresso.planoUsuario.userId !== userId) {
      return { error: 'Progresso não encontrado ou sem acesso' }
    }

    const updateData: Record<string, unknown> = {}
    if (data.horasRealizadas !== undefined) updateData.horasRealizadas = data.horasRealizadas
    if (data.questoesRealizadas !== undefined) updateData.questoesRealizadas = data.questoesRealizadas
    if (data.concluida !== undefined) updateData.concluida = data.concluida
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes

    const dia = await prisma.progressoUsuarioDisciplinaDia.upsert({
      where: {
        progressoId_dia: { progressoId: data.progressoId, dia: data.dia }
      },
      update: updateData,
      create: {
        progressoId: data.progressoId,
        dia: data.dia,
        horasRealizadas: data.horasRealizadas || 0,
        questoesRealizadas: data.questoesRealizadas || 0,
        concluida: data.concluida || false,
        observacoes: data.observacoes || null
      }
    })

    return { success: true, data: dia }
  } catch (error) {
    console.error('Erro ao salvar progresso diário:', error)
    return { error: 'Erro ao salvar progresso diário' }
  }
}
