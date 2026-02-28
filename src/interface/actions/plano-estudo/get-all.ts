'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export async function getAllPlanosEstudo() {
  try {
    const { userId } = await requireAuth()

    // Planos próprios do usuário
    const planosProprios = await prisma.planoEstudo.findMany({
      where: { userId },
      include: {
        semanas: {
          include: {
            disciplinas: {
              include: { disciplina: true },
              orderBy: { prioridade: 'asc' }
            }
          },
          orderBy: { numeroSemana: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Planos compartilhados atribuídos pelo admin
    const planosAtribuidos = await prisma.planoEstudoUsuario.findMany({
      where: { userId },
      include: {
        plano: {
          include: {
            semanas: {
              include: {
                disciplinas: {
                  include: { disciplina: true },
                  orderBy: { prioridade: 'asc' }
                }
              },
              orderBy: { numeroSemana: 'asc' }
            }
          }
        }
      },
      orderBy: { dataAtribuicao: 'desc' }
    })

    // Mapeia planos atribuídos com flag isShared
    const planosCompartilhados = planosAtribuidos.map(pa => ({
      ...pa.plano,
      isShared: true,
      semanas: pa.plano.semanas.map(s => ({
        ...s,
        totalHoras: 0,
        horasRealizadas: 0
      }))
    }))

    const planosPropriosComFlag = planosProprios.map(p => ({
      ...p,
      isShared: false
    }))

    return {
      success: true,
      data: [...planosCompartilhados, ...planosPropriosComFlag]
    }
  } catch (error) {
    console.error('Erro ao buscar planos de estudo:', error)
    return {
      success: false,
      error: 'Erro ao buscar planos de estudo. Tente novamente.'
    }
  }
}
