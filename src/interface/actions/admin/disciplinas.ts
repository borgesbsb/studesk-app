'use server'

import { prisma } from '@/lib/prisma'
import { getAdminSession } from './auth'

export async function adminListarDisciplinas() {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const disciplinas = await prisma.disciplina.findMany({
      where: { userId: null },
      include: {
        _count: { select: { materiais: true, planosDisponiveis: true } }
      },
      orderBy: { nome: 'asc' }
    })
    return { success: true, data: disciplinas }
  } catch (error) {
    console.error('Erro ao listar disciplinas:', error)
    return { error: 'Erro ao listar disciplinas' }
  }
}

export async function adminCriarDisciplina(data: {
  nome: string
  cor?: string
  descricao?: string
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const disciplina = await prisma.disciplina.create({
      data: {
        nome: data.nome,
        cor: data.cor || '#3b82f6',
        descricao: data.descricao || null,
        cargaHoraria: 0,
        peso: 1,
        // userId: null — pertence ao admin
      },
      include: {
        _count: { select: { materiais: true, planosDisponiveis: true } }
      }
    })
    return { success: true, data: disciplina }
  } catch (error) {
    console.error('Erro ao criar disciplina:', error)
    return { error: 'Erro ao criar disciplina' }
  }
}

export async function adminAtualizarDisciplina(
  id: string,
  data: { nome?: string; cor?: string; descricao?: string }
) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const disciplina = await prisma.disciplina.update({
      where: { id },
      data,
      include: {
        _count: { select: { materiais: true, planosDisponiveis: true } }
      }
    })
    return { success: true, data: disciplina }
  } catch (error) {
    console.error('Erro ao atualizar disciplina:', error)
    return { error: 'Erro ao atualizar disciplina' }
  }
}

export async function adminDeletarDisciplina(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const emUso = await prisma.planoEstudoDisciplina.count({ where: { disciplinaId: id } })
    if (emUso > 0) {
      return { error: 'Disciplina está sendo usada em um ou mais planos. Remova-a dos planos antes de deletar.' }
    }

    await prisma.disciplinaMaterial.deleteMany({ where: { disciplinaId: id } })
    await prisma.disciplina.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    console.error('Erro ao deletar disciplina:', error)
    return { error: 'Erro ao deletar disciplina' }
  }
}
