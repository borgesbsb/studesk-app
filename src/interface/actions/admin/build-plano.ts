'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAdminSession } from './auth'

// ─── Builds ────────────────────────────────────────────────────────────────

export async function listarBuilds() {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const builds = await prisma.buildPlano.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { disciplinas: true } },
      },
    })
    return { success: true, data: builds }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function criarBuild(data: {
  nome: string
  descricao?: string
  numeroCiclos: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const build = await prisma.buildPlano.create({ data })
    revalidatePath('/admin/build-plano')
    return { success: true, data: build }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function buscarBuild(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const build = await prisma.buildPlano.findUnique({
      where: { id },
      include: {
        disciplinas: {
          orderBy: [{ tipo: 'asc' }, { ordem: 'asc' }, { nome: 'asc' }],
          include: {
            disciplina: { select: { id: true, nome: true, cor: true } },
            assuntos: { orderBy: [{ ciclo: 'asc' }, { ordem: 'asc' }] },
          },
        },
      },
    })
    if (!build) return { error: 'Build não encontrado' }
    return { success: true, data: build }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function atualizarBuild(
  id: string,
  data: { nome?: string; descricao?: string; numeroCiclos?: number; status?: string }
) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const build = await prisma.buildPlano.update({ where: { id }, data })
    revalidatePath(`/admin/build-plano/${id}`)
    revalidatePath('/admin/build-plano')
    return { success: true, data: build }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function excluirBuild(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    await prisma.buildPlano.delete({ where: { id } })
    revalidatePath('/admin/build-plano')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── Disciplinas do Build ──────────────────────────────────────────────────

export async function adicionarDisciplina(data: {
  buildPlanoId: string
  nome: string
  tipo: 'P1' | 'P2'
  disciplinaId?: string
  cargaHoraria?: number
  cor?: string
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    // determina a próxima ordem
    const count = await prisma.buildPlanoDisciplina.count({
      where: { buildPlanoId: data.buildPlanoId },
    })

    const disc = await prisma.buildPlanoDisciplina.create({
      data: { ...data, ordem: count },
      include: {
        disciplina: { select: { id: true, nome: true, cor: true } },
        assuntos: true,
      },
    })
    revalidatePath(`/admin/build-plano/${data.buildPlanoId}`)
    return { success: true, data: disc }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function atualizarDisciplina(
  discId: string,
  buildPlanoId: string,
  data: {
    nome?: string
    tipo?: 'P1' | 'P2'
    conteudoEdital?: string
    cargaHoraria?: number
    cor?: string
    disciplinaId?: string | null
  }
) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const disc = await prisma.buildPlanoDisciplina.update({
      where: { id: discId },
      data,
      include: {
        disciplina: { select: { id: true, nome: true, cor: true } },
        assuntos: { orderBy: [{ ciclo: 'asc' }, { ordem: 'asc' }] },
      },
    })
    revalidatePath(`/admin/build-plano/${buildPlanoId}`)
    return { success: true, data: disc }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function excluirDisciplina(discId: string, buildPlanoId: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    await prisma.buildPlanoDisciplina.delete({ where: { id: discId } })
    revalidatePath(`/admin/build-plano/${buildPlanoId}`)
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── Assuntos ──────────────────────────────────────────────────────────────

export async function adicionarAssunto(data: {
  buildPlanoDisciplinaId: string
  buildPlanoId: string
  nome: string
  ciclo: number
  ordem?: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  const { buildPlanoId, ...createData } = data

  try {
    const count = await prisma.buildPlanoAssunto.count({
      where: { buildPlanoDisciplinaId: createData.buildPlanoDisciplinaId, ciclo: createData.ciclo },
    })
    const assunto = await prisma.buildPlanoAssunto.create({
      data: { ...createData, ordem: createData.ordem ?? count },
    })
    revalidatePath(`/admin/build-plano/${buildPlanoId}`)
    return { success: true, data: assunto }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function excluirAssunto(assuntoId: string, buildPlanoId: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    await prisma.buildPlanoAssunto.delete({ where: { id: assuntoId } })
    revalidatePath(`/admin/build-plano/${buildPlanoId}`)
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function salvarAssuntosEmLote(
  buildPlanoId: string,
  assuntos: { buildPlanoDisciplinaId: string; nome: string; ciclo: number; ordem: number }[]
) {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    // Busca IDs das disciplinas pertencentes a este build
    const disciplinas = await prisma.buildPlanoDisciplina.findMany({
      where: { buildPlanoId },
      select: { id: true },
    })
    const ids = new Set(disciplinas.map(d => d.id))

    // Remove assuntos existentes das disciplinas deste build
    await prisma.buildPlanoAssunto.deleteMany({
      where: { buildPlanoDisciplinaId: { in: Array.from(ids) } },
    })

    // Cria todos os assuntos novos
    const validos = assuntos.filter(a => ids.has(a.buildPlanoDisciplinaId))
    await prisma.buildPlanoAssunto.createMany({ data: validos })

    // Marca build como gerado
    await prisma.buildPlano.update({
      where: { id: buildPlanoId },
      data: { status: 'gerado' },
    })

    revalidatePath(`/admin/build-plano/${buildPlanoId}`)
    return { success: true, count: validos.length }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── Listar disciplinas disponíveis no BD ─────────────────────────────────

export async function listarDisciplinasDisponiveis() {
  const session = await getAdminSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const disciplinas = await prisma.disciplina.findMany({
      where: { userId: null },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, cor: true },
    })
    return { success: true, data: disciplinas }
  } catch (e: any) {
    return { error: e.message }
  }
}
