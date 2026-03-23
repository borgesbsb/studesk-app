'use server'

import { prisma } from '@/lib/prisma'
import { getAdminSession } from './auth'

export async function adminListarEditais() {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const editais = await prisma.edital.findMany({
      where: { userId: null },
      include: {
        disciplinas: {
          include: { disciplina: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { disciplinas: true } },
      },
      orderBy: { nome: 'asc' },
    })
    return { success: true, data: editais }
  } catch (error) {
    console.error('Erro ao listar editais:', error)
    return { error: 'Erro ao listar editais' }
  }
}

export async function adminCriarEdital(data: {
  nome: string
  descricao?: string
  orgao?: string
  cargo?: string
  ano?: number
  link?: string
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const edital = await prisma.edital.create({
      data: { ...data, userId: null },
      include: {
        disciplinas: { include: { disciplina: true } },
        _count: { select: { disciplinas: true } },
      },
    })
    return { success: true, data: edital }
  } catch (error) {
    console.error('Erro ao criar edital:', error)
    return { error: 'Erro ao criar edital' }
  }
}

export async function adminAtualizarEdital(
  id: string,
  data: {
    nome?: string
    descricao?: string
    orgao?: string
    cargo?: string
    ano?: number
    link?: string
  }
) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const edital = await prisma.edital.update({
      where: { id },
      data,
      include: {
        disciplinas: { include: { disciplina: true } },
        _count: { select: { disciplinas: true } },
      },
    })
    return { success: true, data: edital }
  } catch (error) {
    console.error('Erro ao atualizar edital:', error)
    return { error: 'Erro ao atualizar edital' }
  }
}

export async function adminBuscarEdital(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const edital = await prisma.edital.findUnique({
      where: { id },
      include: {
        disciplinas: {
          include: { disciplina: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!edital) return { error: 'Edital não encontrado' }
    return { success: true, data: edital }
  } catch (error) {
    console.error('Erro ao buscar edital:', error)
    return { error: 'Erro ao buscar edital' }
  }
}

export async function adminDeletarEdital(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    await prisma.editalDisciplina.deleteMany({ where: { editalId: id } })
    await prisma.edital.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    console.error('Erro ao deletar edital:', error)
    return { error: 'Erro ao deletar edital' }
  }
}

export async function adminSalvarConteudosEmLote(
  itens: { editalDisciplinaId: string; conteudo: string }[]
) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    await prisma.$transaction(
      itens.map(item =>
        prisma.editalDisciplina.update({
          where: { id: item.editalDisciplinaId },
          data: { conteudoProgramatico: item.conteudo || null },
        })
      )
    )
    return { success: true }
  } catch (error) {
    console.error('Erro ao salvar conteúdos em lote:', error)
    return { error: 'Erro ao salvar conteúdos' }
  }
}

export async function adminAtualizarConteudoProgramatico(
  editalDisciplinaId: string,
  conteudoProgramatico: string
) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const resultado = await prisma.editalDisciplina.update({
      where: { id: editalDisciplinaId },
      data: { conteudoProgramatico: conteudoProgramatico || null },
    })
    return { success: true, data: resultado }
  } catch (error) {
    console.error('Erro ao atualizar conteúdo programático:', error)
    return { error: 'Erro ao salvar conteúdo programático' }
  }
}

export async function adminAdicionarDisciplina(editalId: string, disciplinaId: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const resultado = await prisma.editalDisciplina.create({
      data: { editalId, disciplinaId },
      include: { disciplina: true },
    })
    return { success: true, data: resultado }
  } catch (error) {
    console.error('Erro ao adicionar disciplina:', error)
    return { error: 'Erro ao adicionar disciplina' }
  }
}

export async function adminRemoverDisciplina(editalId: string, disciplinaId: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    await prisma.editalDisciplina.delete({
      where: { editalId_disciplinaId: { editalId, disciplinaId } },
    })
    return { success: true }
  } catch (error) {
    console.error('Erro ao remover disciplina:', error)
    return { error: 'Erro ao remover disciplina' }
  }
}
