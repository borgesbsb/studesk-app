"use server"

import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, addDays } from "date-fns"
import { requireAuth } from "@/lib/auth-helpers"

export interface DisciplinaAgenda {
  id: string
  nome: string
  cor?: string
}

export interface DiaAgenda {
  dia: number
  disciplinas: DisciplinaAgenda[]
}

export interface AgendaMensal {
  mes: string
  ano: number
  dias: Record<number, DisciplinaAgenda[]>
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function diaIdParaData(diaId: string, inicioCiclo: Date): Date | null {
  const match = diaId.match(/dia(\d+)/)
  if (!match) return null
  return addDays(new Date(inicioCiclo), parseInt(match[1]) - 1)
}

export async function getAgendaMensal(ano: number, mes: number): Promise<AgendaMensal> {
  const { userId } = await requireAuth()
  const dataInicio = startOfMonth(new Date(ano, mes - 1, 1))
  const dataFim = endOfMonth(dataInicio)

  const diasAgenda: Record<number, DisciplinaAgenda[]> = {}

  const adicionarDisciplina = (diaDoMes: number, disc: { id: string; nome: string; cor: string | null }) => {
    if (!diasAgenda[diaDoMes]) diasAgenda[diaDoMes] = []
    if (!diasAgenda[diaDoMes].some(d => d.id === disc.id)) {
      diasAgenda[diaDoMes].push({ id: disc.id, nome: disc.nome, cor: disc.cor ?? undefined })
    }
  }

  try {
    // ── PLANOS PESSOAIS (userId = userId) ─────────────────────────────────────
    const semanasDoMes = await prisma.semanaEstudo.findMany({
      where: {
        plano: { userId, ativo: true },
        dataInicio: { lte: dataFim },
        dataFim: { gte: dataInicio },
      },
      include: {
        disciplinas: {
          include: { disciplina: { select: { id: true, nome: true, cor: true } } }
        }
      }
    })

    for (const semana of semanasDoMes) {
      const inicioCiclo = new Date(semana.dataInicio)
      for (const ds of semana.disciplinas) {
        if (!ds.diasEstudo) continue
        for (const diaId of ds.diasEstudo.split(',').map(d => d.trim()).filter(Boolean)) {
          const data = diaIdParaData(diaId, inicioCiclo)
          if (data && data >= dataInicio && data <= dataFim) {
            adicionarDisciplina(data.getDate(), ds.disciplina)
          }
        }
      }
    }

    // ── PLANOS COMPARTILHADOS (userId = null, via PlanoEstudoUsuario) ─────────
    const planoUsuarios = await prisma.planoEstudoUsuario.findMany({
      where: {
        userId,
        plano: {
          ativo: true,
          userId: null,
          dataInicio: { lte: dataFim },
          dataFim: { gte: dataInicio },
        }
      },
      include: {
        progressos: {
          where: { removida: false },
          include: {
            disciplinaSemana: {
              include: { disciplina: { select: { id: true, nome: true, cor: true } } }
            }
          }
        },
        disciplinasExtras: {
          include: { disciplina: { select: { id: true, nome: true, cor: true } } }
        },
        plano: {
          include: {
            semanas: {
              where: {
                dataInicio: { lte: dataFim },
                dataFim: { gte: dataInicio },
              }
            }
          }
        }
      }
    })

    for (const peu of planoUsuarios) {
      const semanaMap = new Map(peu.plano.semanas.map(s => [s.id, s]))

      // Disciplinas do admin que o usuário agendou (diasEstudo em ProgressoUsuarioDisciplina)
      for (const prog of peu.progressos) {
        if (!prog.diasEstudo) continue
        const semana = semanaMap.get(prog.disciplinaSemana.semanaId)
        if (!semana) continue
        const inicioCiclo = new Date(semana.dataInicio)
        for (const diaId of prog.diasEstudo.split(',').map(d => d.trim()).filter(Boolean)) {
          const data = diaIdParaData(diaId, inicioCiclo)
          if (data && data >= dataInicio && data <= dataFim) {
            adicionarDisciplina(data.getDate(), prog.disciplinaSemana.disciplina)
          }
        }
      }

      // Disciplinas extras do pool adicionadas pelo usuário (dia direto em ProgressoUsuarioDisciplinaExtra)
      for (const extra of peu.disciplinasExtras) {
        const semana = semanaMap.get(extra.semanaId)
        if (!semana) continue
        const data = diaIdParaData(extra.dia, new Date(semana.dataInicio))
        if (data && data >= dataInicio && data <= dataFim) {
          adicionarDisciplina(data.getDate(), extra.disciplina)
        }
      }
    }

    return { mes: MESES[dataInicio.getMonth()], ano, dias: diasAgenda }
  } catch (error) {
    console.error("[AGENDA] Erro ao buscar agenda mensal:", error)
    return { mes: MESES[dataInicio.getMonth()], ano, dias: {} }
  }
}
