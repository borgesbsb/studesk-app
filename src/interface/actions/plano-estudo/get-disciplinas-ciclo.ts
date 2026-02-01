"use server"

import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

export async function getDisciplinasDoCiclo(idReferencia: string) {
  try {
    const { userId } = await requireAuth()

    console.log('[getDisciplinasDoCiclo] Buscando disciplinas com ID:', idReferencia)
    console.log('[getDisciplinasDoCiclo] User ID:', userId)

    // Primeiro, tentar buscar como semana
    const semana = await prisma.semanaEstudo.findFirst({
      where: {
        id: idReferencia,
        plano: {
          userId
        }
      },
      include: {
        disciplinas: {
          include: {
            disciplina: {
              select: {
                id: true,
                nome: true,
                cor: true
              }
            }
          }
        }
      }
    })

    if (semana) {
      console.log('[getDisciplinasDoCiclo] Encontrada semana com', semana.disciplinas.length, 'disciplinas')
      const disciplinas = semana.disciplinas.map(d => d.disciplina)
      return {
        success: true,
        data: disciplinas
      }
    }

    // Se não for semana, buscar como ciclo (plano)
    const ciclo = await prisma.planoEstudo.findFirst({
      where: {
        id: idReferencia,
        userId
      },
      include: {
        semanas: {
          include: {
            disciplinas: {
              include: {
                disciplina: {
                  select: {
                    id: true,
                    nome: true,
                    cor: true
                  }
                }
              }
            }
          }
        }
      }
    })

    console.log('[getDisciplinasDoCiclo] Ciclo encontrado:', !!ciclo)
    console.log('[getDisciplinasDoCiclo] Semanas:', ciclo?.semanas.length)

    if (!ciclo) {
      return {
        success: false,
        error: "Ciclo ou semana não encontrada"
      }
    }

    // Extrair disciplinas únicas do ciclo
    const disciplinasMap = new Map()

    ciclo.semanas.forEach(semana => {
      console.log('[getDisciplinasDoCiclo] Semana com', semana.disciplinas.length, 'disciplinas')
      semana.disciplinas.forEach(discSemana => {
        if (!disciplinasMap.has(discSemana.disciplina.id)) {
          disciplinasMap.set(discSemana.disciplina.id, discSemana.disciplina)
          console.log('[getDisciplinasDoCiclo] Adicionada:', discSemana.disciplina.nome)
        }
      })
    })

    const disciplinas = Array.from(disciplinasMap.values())
    console.log('[getDisciplinasDoCiclo] Total de disciplinas únicas:', disciplinas.length)
    console.log('[getDisciplinasDoCiclo] Disciplinas:', disciplinas.map(d => d.nome))

    return {
      success: true,
      data: disciplinas
    }
  } catch (error) {
    console.error("Erro ao buscar disciplinas:", error)
    return {
      success: false,
      error: "Erro ao buscar disciplinas"
    }
  }
}
