"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function debugBanco() {
  console.log("=== DEBUG BANCO ===")

  try {
    const { userId } = await requireAuth()

    // Contar disciplinas do usuário
    const totalDisciplinas = await prisma.disciplina.count({
      where: { userId }
    })
    console.log(`Total de disciplinas: ${totalDisciplinas}`)

    // Contar planos de estudo do usuário
    const totalPlanos = await prisma.planoEstudo.count({
      where: { userId }
    })
    console.log(`Total de planos de estudo: ${totalPlanos}`)

    // Contar planos ativos do usuário
    const planosAtivos = await prisma.planoEstudo.count({
      where: { userId, ativo: true }
    })
    console.log(`Planos ativos: ${planosAtivos}`)

    // Contar semanas de estudo do usuário
    const totalSemanas = await prisma.semanaEstudo.count({
      where: {
        plano: { userId }
      }
    })
    console.log(`Total de semanas de estudo: ${totalSemanas}`)

    // Contar disciplinas de semana do usuário
    const totalDisciplinasSemana = await prisma.disciplinaSemana.count({
      where: {
        semana: {
          plano: { userId }
        }
      }
    })
    console.log(`Total de disciplinas de semana: ${totalDisciplinasSemana}`)

    // Listar algumas disciplinas do usuário
    const disciplinas = await prisma.disciplina.findMany({
      where: { userId },
      take: 5,
      select: { id: true, nome: true }
    })
    console.log("Disciplinas (sample):", disciplinas)

    // Listar alguns planos do usuário
    const planos = await prisma.planoEstudo.findMany({
      where: { userId },
      take: 5,
      select: {
        id: true,
        nome: true,
        ativo: true,
        dataInicio: true,
        dataFim: true
      }
    })
    console.log("Planos (sample):", planos)
    
    // Listar algumas semanas do usuário
    const semanas = await prisma.semanaEstudo.findMany({
      where: {
        plano: { userId }
      },
      take: 10,
      select: {
        id: true,
        numeroSemana: true,
        dataInicio: true,
        dataFim: true,
        _count: {
          select: { disciplinas: true }
        }
      },
      orderBy: { dataInicio: 'asc' }
    })
    console.log("Semanas (sample):", semanas)

    // Verificar especificamente para o mês atual
    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)

    console.log(`Verificando semanas para ${inicioMes.toISOString()} até ${fimMes.toISOString()}`)

    const semanasDoMesAtual = await prisma.semanaEstudo.findMany({
      where: {
        plano: { userId },
        AND: [
          { dataInicio: { lte: fimMes } },
          { dataFim: { gte: inicioMes } }
        ]
      },
      include: {
        disciplinas: {
          include: {
            disciplina: true
          }
        }
      }
    })
    
    console.log(`Semanas no mês atual: ${semanasDoMesAtual.length}`)
    console.log("Detalhes:", semanasDoMesAtual.map(s => ({
      numeroSemana: s.numeroSemana,
      dataInicio: s.dataInicio,
      dataFim: s.dataFim,
      disciplinas: s.disciplinas.map(d => d.disciplina.nome)
    })))
    
    return {
      disciplinas: totalDisciplinas,
      planos: totalPlanos,
      planosAtivos,
      semanas: totalSemanas,
      disciplinasSemana: totalDisciplinasSemana
    }
  } catch (error) {
    console.error("Erro ao debugar banco:", error)
    return null
  }
}