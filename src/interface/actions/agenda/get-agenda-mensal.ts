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

// Array de cores fixas para as disciplinas
const coresDisciplinas = [
  "bg-blue-500",
  "bg-green-500", 
  "bg-purple-500",
  "bg-orange-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-indigo-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-cyan-500"
]

export async function getAgendaMensal(ano: number, mes: number): Promise<AgendaMensal> {
  const { userId } = await requireAuth()
  const dataInicio = startOfMonth(new Date(ano, mes - 1, 1))
  const dataFim = endOfMonth(dataInicio)

  console.log(`[AGENDA DEBUG] Buscando agenda para ${ano}/${mes}`)
  console.log(`[AGENDA DEBUG] Período: ${dataInicio.toISOString()} até ${dataFim.toISOString()}`)

  try {
    // Buscar todas as semanas do usuário que intersectam com o mês
    const semanasDoMes = await prisma.semanaEstudo.findMany({
      where: {
        plano: {
          userId
        },
        AND: [
          { dataInicio: { lte: dataFim } },
          { dataFim: { gte: dataInicio } }
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

    console.log(`[AGENDA DEBUG] Encontradas ${semanasDoMes.length} semanas`)
    console.log(`[AGENDA DEBUG] Semanas:`, semanasDoMes.map(s => ({
      id: s.id,
      numeroSemana: s.numeroSemana,
      dataInicio: s.dataInicio,
      dataFim: s.dataFim,
      disciplinasCount: s.disciplinas.length
    })))

    // Buscar todas as disciplinas do usuário para criar mapeamento de cores
    const todasDisciplinas = await prisma.disciplina.findMany({
      where: {
        userId
      },
      select: {
        id: true,
        nome: true,
        cor: true
      }
    })

    // Criar mapeamento de cores por disciplina (usando a cor do banco)
    const mapeamentoCores: Record<string, string> = {}
    todasDisciplinas.forEach((disciplina, index) => {
      mapeamentoCores[disciplina.id] = disciplina.cor || coresDisciplinas[index % coresDisciplinas.length]
    })

    // Processar os dados para criar a agenda mensal
    const diasAgenda: Record<number, DisciplinaAgenda[]> = {}
    
    semanasDoMes.forEach(semana => {
      // Para cada disciplina da semana, adicionar nos dias correspondentes
      semana.disciplinas.forEach(disciplinaSemana => {
        const disciplina = disciplinaSemana.disciplina
        
        // Determinar os dias do ciclo que esta disciplina será estudada
        let diasDoCiclo: number[] = [] // Array de índices de dias (0, 1, 2, ...)

        if (disciplinaSemana.diasEstudo) {
          const diasString = disciplinaSemana.diasEstudo.split(',').filter(d => d.trim())

          // Novo formato: dia1, dia2, dia3...
          diasDoCiclo = diasString
            .map(dia => {
              const match = dia.match(/dia(\d+)/)
              return match ? parseInt(match[1]) - 1 : null // dia1 = índice 0, dia2 = índice 1, etc
            })
            .filter(d => d !== null) as number[]

          // Se não encontrou dias no formato novo, tentar formato antigo (seg, ter, qua)
          if (diasDoCiclo.length === 0) {
            const mapaDias: Record<string, number> = {
              'dom': 0, 'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sab': 6
            }
            diasDoCiclo = diasString
              .map(dia => mapaDias[dia.trim().toLowerCase()])
              .filter(d => d !== undefined)
          }
        }

        // Se não tem dias definidos, pular esta disciplina
        if (diasDoCiclo.length === 0) {
          return
        }

        // Mapear dias do ciclo para datas reais
        const inicioCiclo = new Date(semana.dataInicio)

        diasDoCiclo.forEach(indiceDia => {
          // Calcular a data real baseada no início do ciclo + índice do dia
          const dataReal = addDays(inicioCiclo, indiceDia)

          // Verificar se a data está dentro do período do mês atual
          if (dataReal >= dataInicio && dataReal <= dataFim) {
            const diaDoMes = dataReal.getDate()

            if (!diasAgenda[diaDoMes]) {
              diasAgenda[diaDoMes] = []
            }

            // Verificar se a disciplina já não está no dia (evitar duplicatas)
            const jaExiste = diasAgenda[diaDoMes].some(d => d.id === disciplina.id)
            if (!jaExiste) {
              diasAgenda[diaDoMes].push({
                id: disciplina.id,
                nome: disciplina.nome,
                cor: mapeamentoCores[disciplina.id]
              })
            }
          }
        })
      })
    })

    console.log(`[AGENDA DEBUG] Dias com disciplinas:`, Object.keys(diasAgenda).length)
    console.log(`[AGENDA DEBUG] Agenda final:`, diasAgenda)

    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    
    return {
      mes: meses[dataInicio.getMonth()],
      ano,
      dias: diasAgenda
    }
  } catch (error) {
    console.error("[AGENDA DEBUG] Erro ao buscar agenda mensal:", error)
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    
    return {
      mes: meses[dataInicio.getMonth()],
      ano,
      dias: {}
    }
  }
}