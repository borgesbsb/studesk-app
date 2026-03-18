"use server"

import { getMateriasDoDia } from './materias-do-dia'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export interface ResumoCompartilhar {
  nomePlano: string
  ontem: {
    horasEstudo: number
  }
  hoje: {
    disciplinas: { nome: string; minutosPlanejados: number }[]
  }
}

function toLocalDateString(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function getResumoCompartilhar(): Promise<ResumoCompartilhar> {
  const { userId } = await requireAuth()
  const hoje = new Date()
  const ontem = new Date(hoje)
  ontem.setDate(ontem.getDate() - 1)

  const hojeStr = toLocalDateString(hoje)
  const [y, m, d] = hojeStr.split('-').map(Number)
  const hojeUTC = new Date(Date.UTC(y, m - 1, d))
  const amanhaUTC = new Date(hojeUTC.getTime() + 86400000)

  const [materiasHoje, materiasOntem, planoAtivo] = await Promise.all([
    getMateriasDoDia(hojeStr),
    getMateriasDoDia(toLocalDateString(ontem)),
    prisma.planoEstudo.findFirst({
      where: {
        ativo: true,
        OR: [
          { userId },
          { userId: null, usuarios: { some: { userId } } }
        ],
        dataInicio: { lt: amanhaUTC },
        dataFim: { gte: hojeUTC },
      },
      select: { nome: true },
    }),
  ])

  const horasEstudoOntem = materiasOntem.reduce((total, m) => total + m.horasRealizadas, 0)

  return {
    nomePlano: planoAtivo?.nome ?? '',
    ontem: {
      horasEstudo: Math.round(horasEstudoOntem * 100) / 100,
    },
    hoje: {
      disciplinas: materiasHoje.map(m => ({
        nome: m.disciplinaNome,
        minutosPlanejados: m.minutosPlanejados,
      })),
    },
  }
}
