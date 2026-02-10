import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { handleCors } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: handleCors(request) })
}

/**
 * Retorna as disciplinas planejadas para cada dia de um mês.
 * Query params: mes (1-12), ano (YYYY). Default: mês/ano atual.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const { searchParams } = new URL(request.url)

    const now = new Date()
    const mes = parseInt(searchParams.get('mes') || String(now.getMonth() + 1))
    const ano = parseInt(searchParams.get('ano') || String(now.getFullYear()))

    // Primeiro e último dia do mês
    const inicioMes = new Date(ano, mes - 1, 1)
    inicioMes.setHours(0, 0, 0, 0)
    const fimMes = new Date(ano, mes, 0)
    fimMes.setHours(23, 59, 59, 999)

    // Buscar semanas de estudo que intersectam com o mês
    const planos = await prisma.planoEstudo.findMany({
      where: {
        userId,
        ativo: true,
        dataInicio: { lte: fimMes },
        dataFim: { gte: inicioMes },
      },
      include: {
        semanas: {
          where: {
            dataInicio: { lte: fimMes },
            dataFim: { gte: inicioMes },
          },
          include: {
            disciplinas: {
              include: {
                disciplina: { select: { id: true, nome: true, cor: true } },
                dias: true,
              },
            },
          },
        },
      },
    })

    // Montar mapa: data (YYYY-MM-DD) → lista de disciplinas
    const diasMap: Record<string, Array<{
      disciplinaId: string
      nome: string
      cor: string | null
      horasPlanejadas: number
      horasRealizadas: number
      questoesPlanejadas: number
      questoesRealizadas: number
      concluida: boolean
    }>> = {}

    for (const plano of planos) {
      for (const semana of plano.semanas) {
        const inicioSemana = new Date(semana.dataInicio)
        inicioSemana.setHours(0, 0, 0, 0)

        for (const ds of semana.disciplinas) {
          for (const dd of ds.dias) {
            // Calcular a data real do dia
            const diaNum = parseInt(dd.dia.replace('dia', '')) - 1
            const dataDia = new Date(inicioSemana)
            dataDia.setDate(dataDia.getDate() + diaNum)

            // Só incluir se estiver dentro do mês solicitado
            if (dataDia < inicioMes || dataDia > fimMes) continue

            const key = dataDia.toISOString().split('T')[0]
            if (!diasMap[key]) diasMap[key] = []

            diasMap[key].push({
              disciplinaId: ds.disciplina.id,
              nome: ds.disciplina.nome,
              cor: ds.disciplina.cor,
              horasPlanejadas: dd.horasPlanejadas,
              horasRealizadas: dd.horasRealizadas,
              questoesPlanejadas: dd.questoesPlanejadas,
              questoesRealizadas: dd.questoesRealizadas,
              concluida: dd.concluida,
            })
          }
        }
      }
    }

    const headers = handleCors(request)
    return NextResponse.json({ success: true, data: { mes, ano, dias: diasMap } }, { headers })
  } catch (error) {
    console.error('Erro no endpoint agenda:', error)
    const headers = handleCors(request)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao buscar agenda' },
      { status: 500, headers }
    )
  }
}
