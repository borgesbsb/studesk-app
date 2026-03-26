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

export async function adminCriarEditalComDisciplinas(data: {
  edital: { nome: string; orgao?: string; cargo?: string; ano?: number }
  disciplinas: { nome: string; conteudo?: string }[]
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const edital = await prisma.edital.create({
      data: { ...data.edital, userId: null },
      include: {
        disciplinas: { include: { disciplina: true } },
        _count: { select: { disciplinas: true } },
      },
    })

    for (const disc of data.disciplinas) {
      if (!disc.nome?.trim()) continue

      // Busca disciplina admin existente pelo nome (case-insensitive)
      let disciplina = await prisma.disciplina.findFirst({
        where: {
          userId: null,
          nome: { equals: disc.nome.trim(), mode: 'insensitive' },
        },
      })

      // Cria se não existir
      if (!disciplina) {
        disciplina = await prisma.disciplina.create({
          data: {
            nome: disc.nome.trim(),
            cor: '#3b82f6',
            cargaHoraria: 0,
            peso: 1,
          },
        })
      }

      await prisma.editalDisciplina.create({
        data: {
          editalId: edital.id,
          disciplinaId: disciplina.id,
          conteudoProgramatico: disc.conteudo?.trim() || null,
        },
      })
    }

    // Buscar edital atualizado com disciplinas
    const atualizado = await prisma.edital.findUnique({
      where: { id: edital.id },
      include: {
        disciplinas: { include: { disciplina: true } },
        _count: { select: { disciplinas: true } },
      },
    })

    return { success: true, data: atualizado }
  } catch (error) {
    console.error('Erro ao criar edital com disciplinas:', error)
    return { error: 'Erro ao criar edital' }
  }
}

export async function adminImportarDisciplinas(
  editalId: string,
  disciplinas: { nome: string; conteudo?: string }[]
) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const criadas: string[] = []

    for (const disc of disciplinas) {
      if (!disc.nome?.trim()) continue

      // Busca ou cria a disciplina admin pelo nome
      let disciplina = await prisma.disciplina.findFirst({
        where: { userId: null, nome: { equals: disc.nome.trim(), mode: 'insensitive' } },
      })

      if (!disciplina) {
        disciplina = await prisma.disciplina.create({
          data: { nome: disc.nome.trim(), cor: '#3b82f6', cargaHoraria: 0, peso: 1 },
        })
      }

      // Adiciona ao edital se ainda não estiver vinculada
      const jaExiste = await prisma.editalDisciplina.findUnique({
        where: { editalId_disciplinaId: { editalId, disciplinaId: disciplina.id } },
      })

      if (!jaExiste) {
        await prisma.editalDisciplina.create({
          data: {
            editalId,
            disciplinaId: disciplina.id,
            conteudoProgramatico: disc.conteudo?.trim() || null,
          },
        })
        criadas.push(disc.nome.trim())
      } else if (disc.conteudo?.trim()) {
        // Atualiza o conteúdo se já existia mas estava vazio
        await prisma.editalDisciplina.update({
          where: { editalId_disciplinaId: { editalId, disciplinaId: disciplina.id } },
          data: { conteudoProgramatico: disc.conteudo.trim() },
        })
      }
    }

    return { success: true, criadas: criadas.length }
  } catch (error) {
    console.error('Erro ao importar disciplinas:', error)
    return { error: 'Erro ao importar disciplinas' }
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
