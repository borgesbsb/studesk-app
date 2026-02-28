'use server'

import { prisma } from '@/lib/prisma'
import { getAdminSession } from './auth'

export async function adminListarMateriais() {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const materiais = await prisma.materialEstudo.findMany({
      where: { userId: null },
      include: {
        disciplinas: {
          include: { disciplina: { select: { id: true, nome: true, cor: true } } }
        }
      },
      orderBy: { nome: 'asc' }
    })
    return { success: true, data: materiais }
  } catch (error) {
    console.error('Erro ao listar materiais:', error)
    return { error: 'Erro ao listar materiais' }
  }
}

export async function adminCriarMaterial(data: {
  nome: string
  tipo: 'PDF' | 'VIDEO'
  arquivoPdfUrl?: string
  arquivoVideoUrl?: string
  totalPaginas?: number
  duracaoSegundos?: number
  disciplinaIds: string[]
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const { disciplinaIds, ...rest } = data
    const material = await prisma.materialEstudo.create({
      data: {
        nome: rest.nome,
        tipo: rest.tipo,
        totalPaginas: rest.totalPaginas ?? 0,
        duracaoSegundos: rest.duracaoSegundos ?? null,
        arquivoPdfUrl: rest.arquivoPdfUrl ?? null,
        arquivoVideoUrl: rest.arquivoVideoUrl ?? null,
        // userId: null — pertence ao admin
        disciplinas: {
          create: disciplinaIds.map(disciplinaId => ({ disciplinaId }))
        }
      },
      include: {
        disciplinas: {
          include: { disciplina: { select: { id: true, nome: true, cor: true } } }
        }
      }
    })
    return { success: true, data: material }
  } catch (error) {
    console.error('Erro ao criar material:', error)
    return { error: 'Erro ao criar material' }
  }
}

export async function adminAtualizarMaterial(
  id: string,
  data: {
    nome?: string
    totalPaginas?: number
    duracaoSegundos?: number
    disciplinaIds?: string[]
  }
) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const { disciplinaIds, ...updateData } = data

    if (disciplinaIds !== undefined) {
      await prisma.disciplinaMaterial.deleteMany({ where: { materialId: id } })
      if (disciplinaIds.length > 0) {
        await prisma.disciplinaMaterial.createMany({
          data: disciplinaIds.map(disciplinaId => ({ materialId: id, disciplinaId }))
        })
      }
    }

    const material = await prisma.materialEstudo.update({
      where: { id },
      data: updateData,
      include: {
        disciplinas: {
          include: { disciplina: { select: { id: true, nome: true, cor: true } } }
        }
      }
    })
    return { success: true, data: material }
  } catch (error) {
    console.error('Erro ao atualizar material:', error)
    return { error: 'Erro ao atualizar material' }
  }
}

export async function adminDeletarMaterial(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    await prisma.disciplinaMaterial.deleteMany({ where: { materialId: id } })
    await prisma.materialEstudo.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    console.error('Erro ao deletar material:', error)
    return { error: 'Erro ao deletar material' }
  }
}
