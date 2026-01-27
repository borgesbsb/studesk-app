"use server"

import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'
import { requireAuth } from '@/lib/auth-helpers'

export interface MateriaDoDia {
  id: string
  disciplinaId: string
  disciplinaNome: string
  disciplinaCor?: string
  horasPlanejadas: number
  horasRealizadas: number
  tempoRealEstudo: number // Tempo controlado pelo usuário (em horas)
  tempoSessoesPdf: number // Tempo automático das sessões PDF (em horas)
  concluida: boolean
  materialNome?: string
  questoesPlanejadas: number
  questoesRealizadas: number
  prioridade: number
  observacoes?: string // Assuntos a estudar
}

// Função para verificar se o dia atual está nos dias de estudo do ciclo
function isDiaDeEstudo(diasEstudo: string | null, dataConsultada: Date, dataInicioCiclo: Date): boolean {
  if (!diasEstudo) return false

  try {
    const diasString = diasEstudo.split(',').filter(d => d.trim())

    // Novo formato: dia1, dia2, dia3...
    // Normalizar as datas para comparação (remover horas)
    const inicioNormalizado = new Date(dataInicioCiclo)
    inicioNormalizado.setHours(0, 0, 0, 0)

    const consultadaNormalizada = new Date(dataConsultada)
    consultadaNormalizada.setHours(0, 0, 0, 0)

    // Calcular quantos dias se passaram desde o início
    // Usando a mesma lógica de calcularDiasCiclo do plano de estudos
    const diffTime = consultadaNormalizada.getTime() - inicioNormalizado.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    // Se diffDays for 0, é o dia1 (primeiro dia)
    // Se diffDays for 1, é o dia2 (segundo dia), etc
    const diaId = `dia${diffDays + 1}`

    // Verificar se este diaId está na lista de dias de estudo
    const resultado = diasString.includes(diaId)

    console.log(`🔍 isDiaDeEstudo: dataConsultada=${consultadaNormalizada.toISOString()}, dataInicioCiclo=${inicioNormalizado.toISOString()}, diffTime=${diffTime}ms, diffDays=${diffDays}, diaId=${diaId}, diasEstudo="${diasEstudo}", resultado=${resultado}`)

    return resultado

  } catch (error) {
    console.warn('Erro ao processar diasEstudo:', diasEstudo, error)
    return false
  }
}

export async function getMateriasDoDia(data?: Date): Promise<MateriaDoDia[]> {
  try {
    const { userId } = await requireAuth();
    // Normalizar a data recebida para o início do dia
    const diaConsultado = data ? startOfDay(data) : startOfDay(new Date())
    const inicioDia = startOfDay(diaConsultado)
    const fimDia = endOfDay(diaConsultado)

    console.log('🔍 DEBUG getMateriasDoDia - Início:', {
      dataRecebida: data?.toISOString(),
      diaConsultado: diaConsultado.toISOString(),
      inicioDia: inicioDia.toISOString(),
      fimDia: fimDia.toISOString(),
      timestamp: {
        diaConsultado: diaConsultado.getTime(),
        inicioDia: inicioDia.getTime(),
        fimDia: fimDia.getTime()
      }
    })

    // Primeiro, buscar TODOS os planos ativos do usuário para debug
    const todosPlanos = await prisma.planoEstudo.findMany({
      where: {
        userId,
        ativo: true
      },
      select: {
        id: true,
        nome: true,
        dataInicio: true,
        dataFim: true,
        ativo: true
      }
    })

    console.log('🔍 DEBUG - Todos os planos ativos:', {
      quantidade: todosPlanos.length,
      planos: todosPlanos.map(p => ({
        id: p.id,
        nome: p.nome,
        dataInicio: p.dataInicio.toISOString(),
        dataFim: p.dataFim.toISOString(),
        diaConsultadoDentro: p.dataInicio <= diaConsultado && p.dataFim >= diaConsultado
      }))
    })

    // Busca o plano de estudo ativo do usuário que contenha o dia consultado
    // Importante: comparar apenas as DATAS, ignorando horários
    const planoAtivo = await prisma.planoEstudo.findFirst({
      where: {
        userId,
        ativo: true,
        // Comparar se diaConsultado está entre dataInicio e dataFim (ignorando horários)
        AND: [
          {
            dataInicio: {
              lte: fimDia  // Se início do plano <= fim do dia consultado
            }
          },
          {
            dataFim: {
              gte: inicioDia  // Se fim do plano >= início do dia consultado
            }
          }
        ]
      }
    })

    console.log('🔍 DEBUG - Plano ativo encontrado:', {
      planoId: planoAtivo?.id,
      planoNome: planoAtivo?.nome,
      diaConsultado: diaConsultado.toISOString()
    })

    if (!planoAtivo) {
      return []
    }

    // Busca a semana do plano que contenha o dia consultado
    const semanaAtual = await prisma.semanaEstudo.findFirst({
      where: {
        planoId: planoAtivo.id,
        dataInicio: {
          lte: fimDia
        },
        dataFim: {
          gte: inicioDia
        }
      },
      include: {
        disciplinas: {
          include: {
            disciplina: true,
            dias: true // Incluir DisciplinaDia para obter valores específicos de cada dia
          },
          orderBy: {
            prioridade: 'asc'
          }
        }
      }
    })

    console.log('🔍 DEBUG - Semana do ciclo ativo:', {
      semanaId: semanaAtual?.id,
      dataInicio: semanaAtual?.dataInicio.toISOString(),
      dataFim: semanaAtual?.dataFim.toISOString(),
      diaConsultado: diaConsultado.toISOString(),
      disciplinasCount: semanaAtual?.disciplinas?.length,
      dentroDoIntervalo: semanaAtual ? `${semanaAtual.dataInicio <= diaConsultado && semanaAtual.dataFim >= diaConsultado}` : 'false'
    })

    if (!semanaAtual) {
      return []
    }

    // Calcular qual é o diaId atual (dia1, dia2, etc)
    const inicioNormalizado = new Date(semanaAtual.dataInicio)
    inicioNormalizado.setHours(0, 0, 0, 0)
    const consultadaNormalizada = new Date(diaConsultado)
    consultadaNormalizada.setHours(0, 0, 0, 0)
    const diffTime = consultadaNormalizada.getTime() - inicioNormalizado.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
    const diaIdAtual = `dia${diffDays + 1}`

    console.log('🔍 DEBUG - Dia atual calculado:', {
      diaConsultado: diaConsultado.toISOString(),
      semanaInicio: semanaAtual.dataInicio.toISOString(),
      diffDays,
      diaIdAtual
    })

    // Filtra disciplinas programadas para o dia consultado
    const disciplinasDoDia = semanaAtual.disciplinas.filter((disciplinaSemana) => {
      const isDiaPrograma = isDiaDeEstudo(disciplinaSemana.diasEstudo, diaConsultado, semanaAtual.dataInicio)
      console.log(`🎯 Disciplina ${disciplinaSemana.disciplina.nome}: dias="${disciplinaSemana.diasEstudo}", programada=${isDiaPrograma}`)
      return isDiaPrograma
    })

    console.log('🎯 Disciplinas programadas para o dia:', {
      total: disciplinasDoDia.length,
      nomes: disciplinasDoDia.map(d => d.disciplina.nome)
    })

    // Buscar horas reais de estudo para cada disciplina
    const materiasDoDia: MateriaDoDia[] = await Promise.all(
      disciplinasDoDia.map(async (disciplinaSemana) => {
        console.log('🔍 DEBUG - Processando disciplina:', disciplinaSemana.disciplina.nome)
        
        // Buscar materiais da disciplina
        const materiaisDisciplina = await prisma.disciplinaMaterial.findMany({
          where: {
            disciplinaId: disciplinaSemana.disciplina.id
          },
          include: {
            material: {
              include: {
                historicoLeitura: {
                  where: {
                    // Filtrar APENAS pelas datas da semana do ciclo ativo atual
                    dataLeitura: {
                      gte: semanaAtual.dataInicio,
                      lte: semanaAtual.dataFim
                    },
                    // Apenas sessões de estudo reais (com nomeSessao e assuntosEstudados) e não transferidas
                    nomeSessao: { not: null },
                    assuntosEstudados: { 
                      not: null
                    },
                    NOT: {
                      assuntosEstudados: { contains: '[TEMPO TRANSFERIDO]' }
                    }
                  }
                }
              }
            }
          }
        })

        console.log('🔍 DEBUG - Materiais encontrados:', {
          disciplinaNome: disciplinaSemana.disciplina.nome,
          materiaisCount: materiaisDisciplina.length,
          materiais: materiaisDisciplina.map(m => ({
            id: m.material.id,
            nome: m.material.nome,
            historicoCount: m.material.historicoLeitura.length,
            historico: m.material.historicoLeitura.map(h => ({
              id: h.id,
              dataLeitura: h.dataLeitura.toISOString(),
              tempoSegundos: h.tempoLeituraSegundos,
              nomeSessao: h.nomeSessao,
              assuntos: h.assuntosEstudados
            }))
          }))
        })

        // Calcular tempo automático das sessões PDF
        const tempoSessoesPdfSegundos = materiaisDisciplina.reduce((total, disciplinaMaterial) => {
          const tempoMaterial = disciplinaMaterial.material.historicoLeitura.reduce((subtotal, historico) => {
            return subtotal + historico.tempoLeituraSegundos
          }, 0)
          return total + tempoMaterial
        }, 0)

        // Converter segundos para horas (com 2 decimais)
        const tempoSessoesPdf = Math.round((tempoSessoesPdfSegundos / 3600) * 100) / 100
        
        // Tempo Real de Estudo: horasRealizadas está em minutos, converter para horas
        const tempoRealEstudo = Math.round((disciplinaSemana.horasRealizadas / 60) * 100) / 100

        // Buscar DisciplinaDia específico para o dia atual
        const disciplinaDia = disciplinaSemana.dias?.find(d => d.dia === diaIdAtual)

        console.log(`\n🔍 DEBUG - DISCIPLINA DIA ENCONTRADO:`)
        console.log(`   Disciplina: ${disciplinaSemana.disciplina.nome}`)
        console.log(`   Dia procurado: ${diaIdAtual}`)
        console.log(`   DisciplinaDia encontrado:`, disciplinaDia ? 'SIM' : 'NÃO')
        if (disciplinaDia) {
          console.log(`   ID: ${disciplinaDia.id}`)
          console.log(`   Horas planejadas: ${disciplinaDia.horasPlanejadas}`)
          console.log(`   Horas realizadas: ${disciplinaDia.horasRealizadas}`)
          console.log(`   Questões planejadas: ${disciplinaDia.questoesPlanejadas}`)
          console.log(`   Questões realizadas: ${disciplinaDia.questoesRealizadas}`)
        }

        // Calcular horas planejadas por dia
        let horasPorDia: number
        let questoesPorDia: number

        if (disciplinaDia) {
          // Se existe DisciplinaDia, usar seus valores
          horasPorDia = disciplinaDia.horasPlanejadas
          questoesPorDia = disciplinaDia.questoesPlanejadas
          console.log(`✅ Usando DisciplinaDia para ${disciplinaSemana.disciplina.nome} no ${diaIdAtual}:`, {
            horasPorDia,
            questoesPorDia
          })
        } else {
          // Se não existe, calcular proporcionalmente
          const diasEstudo = disciplinaSemana.diasEstudo?.split(',').filter(d => d.trim()) || []
          const diasNovos = diasEstudo.filter(dia => {
            const match = dia.match(/dia(\d+)/)
            return match !== null
          })
          const numDias = diasNovos.length || 1
          horasPorDia = Math.round((disciplinaSemana.horasPlanejadas / numDias) * 100) / 100
          questoesPorDia = disciplinaSemana.questoesPlanejadas
          console.log(`⚠️ DisciplinaDia não encontrado, calculando proporcionalmente para ${disciplinaSemana.disciplina.nome}:`, {
            horasPlanejadas: disciplinaSemana.horasPlanejadas,
            numDias,
            horasPorDia,
            questoesPorDia
          })
        }

        console.log('🔍 DEBUG - Cálculo final:', {
          disciplinaNome: disciplinaSemana.disciplina.nome,
          diaIdAtual,
          temDisciplinaDia: !!disciplinaDia,
          horasPlanejadas: disciplinaSemana.horasPlanejadas, // Em horas (total)
          diasEstudo: disciplinaSemana.diasEstudo,
          horasPorDia, // Horas do dia específico
          questoesPorDia, // Questões do dia específico
          horasRealizadasMinutos: disciplinaSemana.horasRealizadas, // Em minutos
          tempoRealEstudo, // Em horas (convertido)
          tempoSessoesPdf, // Em horas
          proporcao: `${Math.round((disciplinaSemana.horasRealizadas / 60) * 100) / 100}h / ${horasPorDia}h`
        })

        // IMPORTANTE: Usar horasRealizadas do DisciplinaDia (já em horas) como tempoRealEstudo
        const horasRealizadasDia = disciplinaDia
          ? Math.round(disciplinaDia.horasRealizadas * 100) / 100 // DisciplinaDia já está em horas
          : Math.round((disciplinaSemana.horasRealizadas / 60) * 100) / 100 // Fallback: converter minutos para horas

        console.log(`\n📊 VALORES FINAIS RETORNADOS:`)
        console.log(`   Disciplina: ${disciplinaSemana.disciplina.nome}`)
        console.log(`   horasRealizadas (do DisciplinaDia): ${horasRealizadasDia}h`)
        console.log(`   tempoRealEstudo (será igual a horasRealizadas): ${horasRealizadasDia}h`)
        console.log(`   tempoSessoesPdf: ${tempoSessoesPdf}h`)

        return {
          id: disciplinaSemana.id,
          disciplinaId: disciplinaSemana.disciplina.id,
          disciplinaNome: disciplinaSemana.disciplina.nome,
          disciplinaCor: disciplinaSemana.disciplina.cor || undefined,
          horasPlanejadas: horasPorDia, // Horas planejadas para o dia específico
          horasRealizadas: horasRealizadasDia,
          tempoRealEstudo: horasRealizadasDia, // USAR O MESMO VALOR DE horasRealizadas
          tempoSessoesPdf,
          concluida: disciplinaSemana.concluida,
          materialNome: disciplinaSemana.materialNome || undefined,
          questoesPlanejadas: questoesPorDia, // Questões planejadas para o dia específico
          questoesRealizadas: disciplinaSemana.questoesRealizadas,
          prioridade: disciplinaSemana.prioridade,
          observacoes: disciplinaSemana.observacoes || undefined
        }
      })
    )

    console.log('🎯 RESULTADO FINAL - getMateriasDoDia:', {
      totalMaterias: materiasDoDia.length,
      materias: materiasDoDia.map(m => ({
        disciplina: m.disciplinaNome,
        tempoRealEstudo: m.tempoRealEstudo,
        tempoSessoesPdf: m.tempoSessoesPdf
      }))
    })

    return materiasDoDia
  } catch (error) {
    console.error('Erro ao buscar matérias do dia:', error)
    return []
  }
}