"use server"

import { getMateriasDoDia } from './materias-do-dia'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export interface ResumoCompartilhar {
  nomeUsuario: string
  nomePlano: string
  diaCiclo: number | null
  ontem: {
    horasEstudo: number
    questoesRealizadas: number
  }
  hoje: {
    disciplinas: { nome: string; cor: string | null; minutosPlanejados: number }[]
    totalMinutosPlanejados: number
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

  const [materiasHoje, materiasOntem, planoAtivo, usuario] = await Promise.all([
    getMateriasDoDia(hojeStr),
    getMateriasDoDia(toLocalDateString(ontem)),
    prisma.planoEstudo.findFirst({
      where: {
        ativo: true,
        OR: [{ userId }, { userId: null, usuarios: { some: { userId } } }],
        dataInicio: { lt: amanhaUTC },
        dataFim: { gte: hojeUTC },
      },
      include: {
        semanas: {
          where: { dataInicio: { lt: amanhaUTC }, dataFim: { gte: hojeUTC } },
          select: { numeroSemana: true, dataInicio: true },
          take: 1,
        }
      }
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ])

  const horasEstudoOntem = materiasOntem.reduce((total, m) => total + m.horasRealizadas, 0)
  const questoesOntem = materiasOntem.reduce((total, m) => total + m.questoesRealizadas, 0)
  const totalMinutosHoje = materiasHoje.reduce((total, m) => total + m.minutosPlanejados, 0)

  // Calcular dia do ciclo
  let diaCiclo: number | null = null
  const semana = planoAtivo?.semanas?.[0]
  if (semana) {
    const inicioUTC = new Date(Date.UTC(
      new Date(semana.dataInicio).getUTCFullYear(),
      new Date(semana.dataInicio).getUTCMonth(),
      new Date(semana.dataInicio).getUTCDate()
    ))
    const diff = Math.round((hojeUTC.getTime() - inicioUTC.getTime()) / 86400000)
    diaCiclo = diff + 1
  }

  return {
    nomeUsuario: usuario?.name ?? '',
    nomePlano: planoAtivo?.nome ?? '',
    diaCiclo,
    ontem: {
      horasEstudo: Math.round(horasEstudoOntem * 100) / 100,
      questoesRealizadas: questoesOntem,
    },
    hoje: {
      disciplinas: materiasHoje.map(m => ({
        nome: m.disciplinaNome,
        cor: m.disciplinaCor ?? null,
        minutosPlanejados: m.minutosPlanejados,
      })),
      totalMinutosPlanejados: Math.round(totalMinutosHoje),
    },
  }
}
