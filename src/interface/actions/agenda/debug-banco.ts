"use server"

import { prisma } from "@/lib/prisma"

export async function debugBanco() {
  console.log("=== DEBUG BANCO ===")
  
  try {
    // Contar disciplinas
    const totalDisciplinas = await prisma.disciplina.count()
    console.log(`Total de disciplinas: ${totalDisciplinas}`)
    
    // Contar planos de estudo
    const totalPlanos = await prisma.planoEstudo.count()
    console.log(`Total de planos de estudo: ${totalPlanos}`)
    
    // Contar planos ativos
    const planosAtivos = await prisma.planoEstudo.count({
      where: { ativo: true }
    })
    console.log(`Planos ativos: ${planosAtivos}`)
    
    // Contar semanas de estudo
    const totalSemanas = await prisma.semanaEstudo.count()
    console.log(`Total de semanas de estudo: ${totalSemanas}`)
    
    // Contar disciplinas de semana
    const totalDisciplinasSemana = await prisma.disciplinaSemana.count()
    console.log(`Total de disciplinas de semana: ${totalDisciplinasSemana}`)
    
    // Listar algumas disciplinas
    const disciplinas = await prisma.disciplina.findMany({
      take: 5,
      select: { id: true, nome: true }
    })
    console.log("Disciplinas (sample):", disciplinas)
    
    // Listar alguns planos
    const planos = await prisma.planoEstudo.findMany({
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
    
    // Listar algumas semanas
    const semanas = await prisma.semanaEstudo.findMany({
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
    
    // Verificar especificamente para setembro 2024
    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    
    console.log(`Verificando semanas para ${inicioMes.toISOString()} até ${fimMes.toISOString()}`)
    
    const semanasDoMesAtual = await prisma.semanaEstudo.findMany({
      where: {
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