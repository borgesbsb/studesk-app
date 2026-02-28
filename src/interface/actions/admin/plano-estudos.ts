'use server'

import { prisma } from '@/lib/prisma'
import { getAdminSession } from './auth'
import { revalidatePath } from 'next/cache'

// ─── Planos ───────────────────────────────────────────────────────────────────

export async function adminListarPlanos() {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const planos = await prisma.planoEstudo.findMany({
      where: { userId: { equals: null } }, // apenas planos admin (sem dono)
      include: {
        _count: { select: { usuarios: true, semanas: true } },
        semanas: {
          include: {
            _count: { select: { disciplinas: true } }
          },
          orderBy: { numeroSemana: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: planos }
  } catch (error) {
    console.error('Erro ao listar planos admin:', error)
    return { error: 'Erro ao listar planos' }
  }
}

export async function adminBuscarPlano(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const plano = await prisma.planoEstudo.findUnique({
      where: { id },
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
        },
        usuarios: {
          include: {
            usuario: {
              select: { id: true, name: true, email: true, hash: true }
            }
          },
          orderBy: { dataAtribuicao: 'desc' }
        }
      }
    })
    if (!plano) return { error: 'Plano não encontrado' }
    return { success: true, data: plano }
  } catch (error) {
    console.error('Erro ao buscar plano admin:', error)
    return { error: 'Erro ao buscar plano' }
  }
}

export async function adminCriarPlano(data: {
  nome: string
  descricao?: string
  dataInicio: string
  dataFim: string
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const [ano1, mes1, dia1] = data.dataInicio.split('-').map(Number)
    const [ano2, mes2, dia2] = data.dataFim.split('-').map(Number)

    const plano = await prisma.planoEstudo.create({
      data: {
        userId: null, // plano admin sem dono
        nome: data.nome.trim(),
        descricao: data.descricao?.trim() || null,
        dataInicio: new Date(ano1, mes1 - 1, dia1, 12),
        dataFim: new Date(ano2, mes2 - 1, dia2, 12),
        ativo: true
      }
    })
    revalidatePath('/admin/plano-estudos')
    return { success: true, data: plano }
  } catch (error) {
    console.error('Erro ao criar plano admin:', error)
    return { error: 'Erro ao criar plano' }
  }
}

export async function adminAtualizarPlano(id: string, data: {
  nome?: string
  descricao?: string
  dataInicio?: string
  dataFim?: string
  ativo?: boolean
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const updateData: Record<string, unknown> = {}
    if (data.nome) updateData.nome = data.nome.trim()
    if (data.descricao !== undefined) updateData.descricao = data.descricao?.trim() || null
    if (data.ativo !== undefined) updateData.ativo = data.ativo
    if (data.dataInicio) {
      const [ano, mes, dia] = data.dataInicio.split('-').map(Number)
      updateData.dataInicio = new Date(ano, mes - 1, dia, 12)
    }
    if (data.dataFim) {
      const [ano, mes, dia] = data.dataFim.split('-').map(Number)
      updateData.dataFim = new Date(ano, mes - 1, dia, 12)
    }

    const plano = await prisma.planoEstudo.update({
      where: { id },
      data: updateData
    })
    revalidatePath('/admin/plano-estudos')
    revalidatePath(`/admin/plano-estudos/${id}`)
    return { success: true, data: plano }
  } catch (error) {
    console.error('Erro ao atualizar plano admin:', error)
    return { error: 'Erro ao atualizar plano' }
  }
}

export async function adminExcluirPlano(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    await prisma.planoEstudo.delete({ where: { id } })
    revalidatePath('/admin/plano-estudos')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir plano admin:', error)
    return { error: 'Erro ao excluir plano' }
  }
}

// ─── Ciclos (SemanaEstudo) ────────────────────────────────────────────────────

export async function adminAdicionarCiclo(data: {
  planoId: string
  numeroSemana: number
  dataInicio: string
  dataFim: string
  observacoes?: string
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    // Verificar número de semana disponível
    const existente = await prisma.semanaEstudo.findFirst({
      where: { planoId: data.planoId, numeroSemana: data.numeroSemana }
    })
    if (existente) {
      return { error: `Ciclo ${data.numeroSemana} já existe neste plano` }
    }

    const [ano1, mes1, dia1] = data.dataInicio.split('-').map(Number)
    const [ano2, mes2, dia2] = data.dataFim.split('-').map(Number)

    const ciclo = await prisma.semanaEstudo.create({
      data: {
        planoId: data.planoId,
        numeroSemana: data.numeroSemana,
        dataInicio: new Date(ano1, mes1 - 1, dia1, 12),
        dataFim: new Date(ano2, mes2 - 1, dia2, 12),
        observacoes: data.observacoes?.trim() || null,
        totalHoras: 0,
        horasRealizadas: 0
      },
      include: {
        disciplinas: { include: { disciplina: true } }
      }
    })
    revalidatePath(`/admin/plano-estudos/${data.planoId}`)
    return { success: true, data: ciclo }
  } catch (error) {
    console.error('Erro ao adicionar ciclo:', error)
    return { error: 'Erro ao adicionar ciclo' }
  }
}

export async function adminExcluirCiclo(cicloId: string, planoId: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    await prisma.semanaEstudo.delete({ where: { id: cicloId } })
    revalidatePath(`/admin/plano-estudos/${planoId}`)
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir ciclo:', error)
    return { error: 'Erro ao excluir ciclo' }
  }
}

// ─── Disciplinas (DisciplinaSemana) ──────────────────────────────────────────

export async function adminAdicionarDisciplina(data: {
  semanaId: string
  planoId: string
  disciplinaId: string
  horasPlanejadas?: number
  questoesPlanejadas?: number
  tipoVeiculo?: string
  materialNome?: string
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const existente = await prisma.disciplinaSemana.findFirst({
      where: { semanaId: data.semanaId, disciplinaId: data.disciplinaId }
    })
    if (existente) return { error: 'Disciplina já adicionada neste ciclo' }

    const maxPrioridade = await prisma.disciplinaSemana.aggregate({
      where: { semanaId: data.semanaId },
      _max: { prioridade: true }
    })

    const disciplina = await prisma.disciplinaSemana.create({
      data: {
        semanaId: data.semanaId,
        disciplinaId: data.disciplinaId,
        horasPlanejadas: data.horasPlanejadas || 0,
        horasRealizadas: 0,
        prioridade: (maxPrioridade._max.prioridade || 0) + 1,
        questoesPlanejadas: data.questoesPlanejadas || 0,
        questoesRealizadas: 0,
        tipoVeiculo: data.tipoVeiculo || 'pdf',
        materialNome: data.materialNome || null,
        concluida: false
      },
      include: { disciplina: true }
    })
    revalidatePath(`/admin/plano-estudos/${data.planoId}`)
    return { success: true, data: disciplina }
  } catch (error) {
    console.error('Erro ao adicionar disciplina:', error)
    return { error: 'Erro ao adicionar disciplina' }
  }
}

export async function adminExcluirDisciplina(disciplinaSemanaId: string, planoId: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    await prisma.disciplinaSemana.delete({ where: { id: disciplinaSemanaId } })
    revalidatePath(`/admin/plano-estudos/${planoId}`)
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir disciplina:', error)
    return { error: 'Erro ao excluir disciplina' }
  }
}

// ─── Usuários atribuídos ──────────────────────────────────────────────────────

export async function adminListarUsuariosPlano(planoId: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const usuarios = await prisma.planoEstudoUsuario.findMany({
      where: { planoId },
      include: {
        usuario: {
          select: { id: true, name: true, email: true, hash: true }
        }
      },
      orderBy: { dataAtribuicao: 'desc' }
    })
    return { success: true, data: usuarios }
  } catch (error) {
    console.error('Erro ao listar usuários do plano:', error)
    return { error: 'Erro ao listar usuários' }
  }
}

export async function adminAdicionarUsuario(planoId: string, userId: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const atribuicao = await prisma.planoEstudoUsuario.create({
      data: { planoId, userId },
      include: {
        usuario: {
          select: { id: true, name: true, email: true, hash: true }
        }
      }
    })
    revalidatePath(`/admin/plano-estudos/${planoId}`)
    return { success: true, data: atribuicao }
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return { error: 'Usuário já atribuído a este plano' }
    }
    console.error('Erro ao adicionar usuário ao plano:', error)
    return { error: 'Erro ao adicionar usuário' }
  }
}

export async function adminRemoverUsuario(planoId: string, userId: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    await prisma.planoEstudoUsuario.delete({
      where: { planoId_userId: { planoId, userId } }
    })
    revalidatePath(`/admin/plano-estudos/${planoId}`)
    return { success: true }
  } catch (error) {
    console.error('Erro ao remover usuário do plano:', error)
    return { error: 'Erro ao remover usuário' }
  }
}

// ─── Pool de Disciplinas do Plano ────────────────────────────────────────────

export async function adminAdicionarDisciplinaAoPlano(planoId: string, disciplinaId: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const entry = await prisma.planoEstudoDisciplina.create({
      data: { planoId, disciplinaId },
      include: { disciplina: { select: { id: true, nome: true, cor: true } } }
    })
    revalidatePath(`/admin/plano-estudos/${planoId}`)
    return { success: true, data: entry }
  } catch (error: unknown) {
    if (
      typeof error === 'object' && error !== null && 'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return { error: 'Disciplina já está no pool deste plano' }
    }
    console.error('Erro ao adicionar disciplina ao plano:', error)
    return { error: 'Erro ao adicionar disciplina ao pool' }
  }
}

export async function adminRemoverDisciplinaDoPlano(planoId: string, disciplinaId: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    // Verifica se a disciplina está em uso em algum ciclo do plano
    const emUso = await prisma.disciplinaSemana.findFirst({
      where: {
        disciplinaId,
        semana: { planoId }
      }
    })
    if (emUso) {
      return { error: 'Não é possível remover: disciplina está em uso em um ou mais ciclos deste plano' }
    }

    await prisma.planoEstudoDisciplina.delete({
      where: { planoId_disciplinaId: { planoId, disciplinaId } }
    })
    revalidatePath(`/admin/plano-estudos/${planoId}`)
    return { success: true }
  } catch (error) {
    console.error('Erro ao remover disciplina do plano:', error)
    return { error: 'Erro ao remover disciplina do pool' }
  }
}
