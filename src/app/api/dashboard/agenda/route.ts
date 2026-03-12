import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { handleCors } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: handleCors(request) })
}

type DiaAgenda = {
  disciplinaId: string
  nome: string
  cor: string | null
  minutosPlanejados: number
  horasRealizadas: number
  questoesPlanejadas: number
  questoesRealizadas: number
  concluida: boolean
}

/**
 * Retorna as disciplinas planejadas para cada dia de um mês.
 * Query params: mes (1-12), ano (YYYY). Default: mês/ano atual.
 * Suporta planos pessoais e planos compartilhados (admin).
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const { searchParams } = new URL(request.url)

    const now = new Date()
    const mes = parseInt(searchParams.get('mes') || String(now.getMonth() + 1))
    const ano = parseInt(searchParams.get('ano') || String(now.getFullYear()))

    const inicioMes = new Date(ano, mes - 1, 1)
    inicioMes.setUTCHours(0, 0, 0, 0)
    const fimMes = new Date(ano, mes, 0)
    fimMes.setUTCHours(23, 59, 59, 999)

    const diasMap: Record<string, DiaAgenda[]> = {}

    const addToDiasMap = (key: string, item: DiaAgenda) => {
      if (!diasMap[key]) diasMap[key] = []
      if (!diasMap[key].some(d => d.disciplinaId === item.disciplinaId)) {
        diasMap[key].push(item)
      }
    }

    // ─── Planos pessoais ───────────────────────────────────────────────────────
    const planosPersonais = await prisma.planoEstudo.findMany({
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

    for (const plano of planosPersonais) {
      for (const semana of plano.semanas) {
        const inicioSemana = new Date(semana.dataInicio)
        inicioSemana.setUTCHours(0, 0, 0, 0)

        for (const ds of semana.disciplinas) {
          for (const dd of ds.dias) {
            const diaNum = parseInt(dd.dia.replace('dia', '')) - 1
            const dataDia = new Date(inicioSemana)
            dataDia.setUTCDate(dataDia.getUTCDate() + diaNum)

            if (dataDia < inicioMes || dataDia > fimMes) continue

            const key = dataDia.toISOString().split('T')[0]
            addToDiasMap(key, {
              disciplinaId: ds.disciplina.id,
              nome: ds.disciplina.nome,
              cor: ds.disciplina.cor,
              minutosPlanejados: dd.minutosPlanejados,
              horasRealizadas: dd.horasRealizadas,
              questoesPlanejadas: dd.questoesPlanejadas,
              questoesRealizadas: dd.questoesRealizadas,
              concluida: dd.concluida,
            })
          }
        }
      }
    }

    // ─── Planos compartilhados (admin) ─────────────────────────────────────────
    // PlanoEstudoUsuario = vínculo do usuário com o plano admin
    const planoUsuarios = await prisma.planoEstudoUsuario.findMany({
      where: {
        userId,
        plano: {
          userId: null,
          ativo: true,
          dataInicio: { lte: fimMes },
          dataFim: { gte: inicioMes },
        },
      },
      include: {
        // Progressos do usuário por DisciplinaSemana
        progressos: {
          where: {
            removida: false,
            disciplinaSemana: {
              semana: {
                dataInicio: { lte: fimMes },
                dataFim: { gte: inicioMes },
              },
            },
          },
          include: {
            disciplinaSemana: {
              include: {
                disciplina: { select: { id: true, nome: true, cor: true } },
                semana: { select: { dataInicio: true } },
              },
            },
            dias: true, // ProgressoUsuarioDisciplinaDia
          },
        },
        // Disciplinas extras do usuário
        disciplinasExtras: {
          where: {
            semana: {
              dataInicio: { lte: fimMes },
              dataFim: { gte: inicioMes },
            },
          },
          include: {
            disciplina: { select: { id: true, nome: true, cor: true } },
            semana: { select: { dataInicio: true } },
          },
        },
      },
    })

    for (const planoUsuario of planoUsuarios) {
      // Disciplinas atribuídas pelo admin
      for (const prog of planoUsuario.progressos) {
        if (!prog.diasEstudo) continue

        const inicioSemana = new Date(prog.disciplinaSemana.semana.dataInicio)
        inicioSemana.setUTCHours(0, 0, 0, 0)

        const dias = prog.diasEstudo.split(',').map(d => d.trim()).filter(Boolean)
        const numDias = dias.length
        const minutosDia = numDias > 0 ? Math.round(prog.minutosPlanejados / numDias) : 0

        for (const diaId of dias) {
          const diaNum = parseInt(diaId.replace('dia', '')) - 1
          const dataDia = new Date(inicioSemana)
          dataDia.setUTCDate(dataDia.getUTCDate() + diaNum)

          if (dataDia < inicioMes || dataDia > fimMes) continue

          const key = dataDia.toISOString().split('T')[0]

          // Progresso real do dia se existir
          const progDia = prog.dias.find(d => d.dia === diaId)

          addToDiasMap(key, {
            disciplinaId: prog.disciplinaSemana.disciplina.id,
            nome: prog.disciplinaSemana.disciplina.nome,
            cor: prog.disciplinaSemana.disciplina.cor,
            minutosPlanejados: minutosDia,
            horasRealizadas: progDia?.horasRealizadas ?? 0,
            questoesPlanejadas: progDia?.questoesPlanejadas ?? 0,
            questoesRealizadas: progDia?.questoesRealizadas ?? 0,
            concluida: progDia?.concluida ?? false,
          })
        }
      }

      // Disciplinas extras adicionadas pelo usuário (um registro já é por dia)
      for (const extra of planoUsuario.disciplinasExtras) {
        const inicioSemana = new Date(extra.semana.dataInicio)
        inicioSemana.setUTCHours(0, 0, 0, 0)

        const diaNum = parseInt(extra.dia.replace('dia', '')) - 1
        const dataDia = new Date(inicioSemana)
        dataDia.setUTCDate(dataDia.getUTCDate() + diaNum)

        if (dataDia < inicioMes || dataDia > fimMes) continue

        const key = dataDia.toISOString().split('T')[0]
        addToDiasMap(key, {
          disciplinaId: extra.disciplina.id,
          nome: extra.disciplina.nome,
          cor: extra.disciplina.cor,
          minutosPlanejados: extra.minutosPlanejados,
          horasRealizadas: extra.horasRealizadas / 60, // extras armazenam em minutos
          questoesPlanejadas: extra.questoesPlanejadas,
          questoesRealizadas: extra.questoesRealizadas,
          concluida: extra.concluida,
        })
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
