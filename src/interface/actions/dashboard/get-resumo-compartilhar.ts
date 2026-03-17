"use server"

import { getMateriasDoDia } from './materias-do-dia'

export interface ResumoCompartilhar {
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
  const hoje = new Date()
  const ontem = new Date(hoje)
  ontem.setDate(ontem.getDate() - 1)

  const [materiasHoje, materiasOntem] = await Promise.all([
    getMateriasDoDia(toLocalDateString(hoje)),
    getMateriasDoDia(toLocalDateString(ontem)),
  ])

  const horasEstudoOntem = materiasOntem.reduce((total, m) => total + m.horasRealizadas, 0)

  return {
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
