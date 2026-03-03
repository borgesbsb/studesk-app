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
  observacoes?: string
  assuntos?: string
  materiaisAdmin: { id: string; nome: string; tipo: string; paginasLidas: number; totalPaginas: number; tempoAssistido: number | null; duracaoSegundos: number | null }[]
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

export async function getMateriasDoDia(data?: Date | string): Promise<MateriaDoDia[]> {
  try {
    const { userId } = await requireAuth();
    // Se data for string no formato YYYY-MM-DD, parsear diretamente sem conversão de fuso
    // Isso evita o bug de timezone onde 23:00 UTC-3 vira 02:00 UTC do dia seguinte
    let diaConsultado: Date
    if (typeof data === 'string') {
      const [year, month, day] = data.split('-').map(Number)
      diaConsultado = new Date(year, month - 1, day, 0, 0, 0, 0)
    } else {
      diaConsultado = data ? startOfDay(data) : startOfDay(new Date())
    }
    const inicioDia = startOfDay(diaConsultado)
    const fimDia = endOfDay(diaConsultado)

    console.log('🔍 DEBUG getMateriasDoDia - Início:', {
      dataRecebida: typeof data === 'string' ? data : data?.toISOString(),
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
        ativo: true,
        OR: [
          { userId },
          { userId: null, usuarios: { some: { userId } } }
        ]
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
    // Inclui planos pessoais (userId match) e planos compartilhados atribuídos ao usuário
    const planoAtivo = await prisma.planoEstudo.findFirst({
      where: {
        ativo: true,
        OR: [
          { userId },
          { userId: null, usuarios: { some: { userId } } }
        ],
        AND: [
          {
            dataInicio: {
              lte: fimDia
            }
          },
          {
            dataFim: {
              gte: inicioDia
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
            dias: true,
            materiais: {
              include: { material: { select: { id: true, nome: true, tipo: true, paginasLidas: true, totalPaginas: true, tempoAssistido: true, duracaoSegundos: true, historicoLeitura: { where: { OR: [{ userId }, { userId: null }] }, orderBy: { dataLeitura: 'desc' }, take: 1, select: { paginaAtual: true } } } } },
              orderBy: { ordem: 'asc' }
            }
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

    // ── PLANO COMPARTILHADO ──────────────────────────────────────────────────
    if (planoAtivo.userId === null) {
      const planoUsuario = await prisma.planoEstudoUsuario.findUnique({
        where: { planoId_userId: { planoId: planoAtivo.id, userId } }
      })
      if (!planoUsuario) return []

      // Progressos do usuário para disciplinas deste ciclo
      const progressos = await prisma.progressoUsuarioDisciplina.findMany({
        where: {
          planoUsuarioId: planoUsuario.id,
          removida: false,
          disciplinaSemana: { semanaId: semanaAtual.id }
        },
        include: {
          disciplinaSemana: {
            include: {
              disciplina: true,
              materiais: {
                include: { material: { select: { id: true, nome: true, tipo: true, paginasLidas: true, totalPaginas: true, tempoAssistido: true, duracaoSegundos: true, historicoLeitura: { where: { OR: [{ userId }, { userId: null }] }, orderBy: { dataLeitura: 'desc' }, take: 1, select: { paginaAtual: true } } } } },
                orderBy: { ordem: 'asc' }
              }
            }
          },
          dias: { where: { dia: diaIdAtual } }
        }
      })

      const progressosDoDia = progressos.filter(p => {
        const dias = p.diasEstudo?.split(',').map(d => d.trim()).filter(Boolean) ?? []
        return dias.includes(diaIdAtual)
      })

      // Disciplinas extras do pool agendadas para hoje
      const extrasDoDia = await prisma.progressoUsuarioDisciplinaExtra.findMany({
        where: { planoUsuarioId: planoUsuario.id, semanaId: semanaAtual.id, dia: diaIdAtual },
        include: { disciplina: true }
      })

      const calcTempoSessoesPdf = async (disciplinaId: string) => {
        const mats = await prisma.disciplinaMaterial.findMany({
          where: { disciplinaId },
          include: {
            material: {
              include: {
                historicoLeitura: {
                  where: {
                    dataLeitura: { gte: semanaAtual.dataInicio, lte: semanaAtual.dataFim },
                    nomeSessao: { not: null },
                    assuntosEstudados: { not: null },
                    NOT: { assuntosEstudados: { contains: '[TEMPO TRANSFERIDO]' } }
                  }
                }
              }
            }
          }
        })
        const seg = mats.reduce((t, dm) =>
          t + dm.material.historicoLeitura.reduce((s, h) => s + h.tempoLeituraSegundos, 0), 0)
        return Math.round((seg / 3600) * 100) / 100
      }

      const materiasDeProgressos: MateriaDoDia[] = await Promise.all(
        progressosDoDia.map(async (prog) => {
          const diaRec = prog.dias[0]
          return {
            id: prog.disciplinaSemanaId,
            disciplinaId: prog.disciplinaSemana.disciplinaId,
            disciplinaNome: prog.disciplinaSemana.disciplina.nome,
            disciplinaCor: prog.disciplinaSemana.disciplina.cor || undefined,
            // Usa as metas do dia específico; fallback para o valor compartilhado do ciclo
            horasPlanejadas: diaRec?.horasPlanejadas ?? prog.horasPlanejadas,
            horasRealizadas: diaRec?.horasRealizadas ?? 0,
            tempoRealEstudo: diaRec?.horasRealizadas ?? 0,
            tempoSessoesPdf: await calcTempoSessoesPdf(prog.disciplinaSemana.disciplinaId),
            concluida: prog.concluida,
            materialNome: prog.disciplinaSemana.materialNome || undefined,
            questoesPlanejadas: diaRec?.questoesPlanejadas ?? prog.questoesPlanejadas,
            questoesRealizadas: diaRec?.questoesRealizadas ?? 0,
            prioridade: prog.disciplinaSemana.prioridade,
            observacoes: prog.observacoes || prog.disciplinaSemana.observacoes || undefined,
            assuntos: prog.disciplinaSemana.assuntos || undefined,
            materiaisAdmin: prog.disciplinaSemana.materiais.map(m => ({
              id: m.material.id,
              nome: m.material.nome,
              tipo: m.material.tipo,
              paginasLidas: m.material.historicoLeitura[0]?.paginaAtual ?? m.material.paginasLidas,
              totalPaginas: m.material.totalPaginas,
              tempoAssistido: m.material.tempoAssistido ?? null,
              duracaoSegundos: m.material.duracaoSegundos ?? null,
            }))
          }
        })
      )

      const materiasDeExtras: MateriaDoDia[] = await Promise.all(
        extrasDoDia.map(async (extra) => ({
          id: extra.id,
          disciplinaId: extra.disciplinaId,
          disciplinaNome: extra.disciplina.nome,
          disciplinaCor: extra.disciplina.cor || undefined,
          horasPlanejadas: extra.horasPlanejadas,
          // horasRealizadas armazenado em minutos (Int) → converter para horas
          horasRealizadas: Math.round((extra.horasRealizadas / 60) * 100) / 100,
          tempoRealEstudo: Math.round((extra.horasRealizadas / 60) * 100) / 100,
          tempoSessoesPdf: await calcTempoSessoesPdf(extra.disciplinaId),
          concluida: extra.concluida,
          materialNome: undefined,
          questoesPlanejadas: extra.questoesPlanejadas,
          questoesRealizadas: extra.questoesRealizadas,
          prioridade: 999,
          observacoes: extra.observacoes || undefined,
          materiaisAdmin: []
        }))
      )

      return [...materiasDeProgressos, ...materiasDeExtras].sort((a, b) => a.prioridade - b.prioridade)
    }
    // ── FIM PLANO COMPARTILHADO (plano pessoal continua abaixo) ──────────────

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

        // IMPORTANTE: Usar questoesRealizadas do DisciplinaDia
        const questoesRealizadasDia = disciplinaDia
          ? disciplinaDia.questoesRealizadas // DisciplinaDia tem o valor correto do dia
          : disciplinaSemana.questoesRealizadas // Fallback: usar da semana

        console.log(`\n📊 VALORES FINAIS RETORNADOS:`)
        console.log(`   Disciplina: ${disciplinaSemana.disciplina.nome}`)
        console.log(`   horasRealizadas (do DisciplinaDia): ${horasRealizadasDia}h`)
        console.log(`   tempoRealEstudo (será igual a horasRealizadas): ${horasRealizadasDia}h`)
        console.log(`   tempoSessoesPdf: ${tempoSessoesPdf}h`)
        console.log(`   questoesRealizadas (do DisciplinaDia): ${questoesRealizadasDia}`)

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
          questoesPlanejadas: questoesPorDia,
          questoesRealizadas: questoesRealizadasDia,
          prioridade: disciplinaSemana.prioridade,
          observacoes: disciplinaSemana.observacoes || undefined,
          assuntos: disciplinaSemana.assuntos || undefined,
          materiaisAdmin: disciplinaSemana.materiais.map(m => ({
            id: m.material.id,
            nome: m.material.nome,
            tipo: m.material.tipo,
          }))
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