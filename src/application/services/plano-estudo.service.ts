import { PrismaClient, Prisma } from "@prisma/client"
import { logError, formatPrismaError } from "@/lib/error-handler"

const prisma = new PrismaClient()

export interface CreatePlanoEstudoData {
  nome: string
  descricao?: string
  dataInicio: Date
  dataFim: Date
  semanas: CreateSemanaEstudoData[]
}

export interface CreateSemanaEstudoData {
  numeroSemana: number
  dataInicio: Date
  dataFim: Date
  observacoes?: string
  totalHoras: number
  disciplinas: CreateDisciplinaSemanaData[]
}

export interface CreateDisciplinaSemanaData {
  disciplinaId: string
  minutosPlanejados: number
  tipoVeiculo?: string
  materialNome?: string
  questoesPlanejadas?: number
  tempoVideoPlanejado?: number
  parametro?: string
  diasEstudo?: string
}

export interface UpdateProgressoData {
  disciplinaSemanaId: string
  horasRealizadas?: number
  concluida?: boolean
  observacoes?: string
  questoesRealizadas?: number
  minutosPlanejados?: number
  questoesPlanejadas?: number
  disciplinaId?: string
  diasEstudo?: string
}

export interface UpdateDisciplinaDiaData {
  disciplinaDiaId?: string
  disciplinaSemanaId: string
  dia: string
  minutosPlanejados?: number
  horasRealizadas?: number
  questoesPlanejadas?: number
  questoesRealizadas?: number
  observacoes?: string
  concluida?: boolean
}

export class PlanoEstudoService {
  static async listarPlanos(userId: string) {
    try {
      return await prisma.planoEstudo.findMany({
        where: { userId },
        include: {
          semanas: {
            include: {
              disciplinas: {
                include: {
                  disciplina: true
                },
                orderBy: {
                  prioridade: 'asc'
                }
              }
            },
            orderBy: {
              numeroSemana: 'asc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'listarPlanos')
      throw new Error(formatPrismaError(error))
    }
  }

  static async buscarPorId(userId: string, id: string) {
    return await prisma.planoEstudo.findUnique({
      where: { id, userId },
      include: {
        semanas: {
          include: {
            disciplinas: {
              include: {
                disciplina: true,
                dias: {
                  orderBy: {
                    dia: 'asc'
                  }
                }
              },
              orderBy: {
                prioridade: 'asc'
              }
            }
          },
          orderBy: {
            numeroSemana: 'asc'
          }
        }
      }
    })
  }

  static async criar(userId: string, data: CreatePlanoEstudoData) {
    try {
      return await prisma.planoEstudo.create({
        data: {
          userId,
          nome: data.nome,
          descricao: data.descricao,
          dataInicio: data.dataInicio,
          dataFim: data.dataFim,
          semanas: {
            create: (data.semanas || [])
              .filter(semana => Array.isArray(semana.disciplinas) && semana.disciplinas.length > 0)
              .map(semana => ({
              numeroSemana: semana.numeroSemana,
              dataInicio: semana.dataInicio,
              dataFim: semana.dataFim,
              observacoes: semana.observacoes,
              totalHoras: semana.totalHoras,
              disciplinas: {
                create: semana.disciplinas.map(disciplina => ({
                  disciplinaId: disciplina.disciplinaId,
                  minutosPlanejados: disciplina.minutosPlanejados,
                  prioridade: 2, // Valor padrão
                  tipoVeiculo: disciplina.tipoVeiculo,
                  materialNome: disciplina.materialNome,
                  questoesPlanejadas: disciplina.questoesPlanejadas || 0,
                  tempoVideoPlanejado: disciplina.tempoVideoPlanejado || 0,
                  observacoes: disciplina.parametro, // Campo parametro vai para observacoes
                  diasEstudo: disciplina.diasEstudo // Campo diasEstudo
                }))
              }
            }))
          }
        },
        include: {
          semanas: {
            include: {
              disciplinas: {
                include: {
                  disciplina: true
                }
              }
            },
            orderBy: {
              numeroSemana: 'asc'
            }
          }
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'criarPlanoEstudo')
      throw new Error(formatPrismaError(error))
    }
  }

  static async criarSimples(userId: string, data: { nome: string }) {
    try {
      // Cria um plano básico sem semanas nem disciplinas
      // Usa datas padrão (hoje e hoje + 30 dias)
      const dataInicio = new Date()
      const dataFim = new Date()
      dataFim.setDate(dataFim.getDate() + 30)

      return await prisma.planoEstudo.create({
        data: {
          userId,
          nome: data.nome,
          dataInicio,
          dataFim,
          ativo: true
        },
        include: {
          semanas: {
            include: {
              disciplinas: {
                include: {
                  disciplina: true
                }
              }
            },
            orderBy: {
              numeroSemana: 'asc'
            }
          }
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'criarPlanoEstudoSimples')
      throw new Error(formatPrismaError(error))
    }
  }

  static async atualizar(userId: string, id: string, data: Partial<CreatePlanoEstudoData>) {
    // Verifica se pertence ao usuário
    const plano = await prisma.planoEstudo.findUnique({
      where: { id, userId }
    })

    if (!plano) {
      throw new Error('Plano não encontrado ou sem permissão')
    }

    return await prisma.planoEstudo.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim
      },
      include: {
        semanas: {
          include: {
            disciplinas: {
              include: {
                disciplina: true
              }
            }
          }
        }
      }
    })
  }

  static async excluir(userId: string, id: string) {
    // Verifica se pertence ao usuário
    const plano = await prisma.planoEstudo.findUnique({
      where: { id, userId }
    })

    if (!plano) {
      throw new Error('Plano não encontrado ou sem permissão')
    }

    return await prisma.planoEstudo.delete({
      where: { id }
    })
  }

  static async adicionarSemana(userId: string, planoId: string, semanaData: CreateSemanaEstudoData) {
    try {
      // Verifica se o plano pertence ao usuário ou é um plano compartilhado atribuído
      const plano = await prisma.planoEstudo.findUnique({
        where: { id: planoId }
      })

      if (!plano || (plano.userId !== null && plano.userId !== userId)) {
        throw new Error('Plano não encontrado ou sem permissão')
      }

      return await prisma.semanaEstudo.create({
        data: {
          planoId: planoId,
          numeroSemana: semanaData.numeroSemana,
          dataInicio: semanaData.dataInicio,
          dataFim: semanaData.dataFim,
          observacoes: semanaData.observacoes,
          totalHoras: semanaData.totalHoras,
          disciplinas: {
            create: semanaData.disciplinas.map(disciplina => ({
              disciplinaId: disciplina.disciplinaId,
              minutosPlanejados: disciplina.minutosPlanejados,
              prioridade: 2, // Valor padrão
              tipoVeiculo: disciplina.tipoVeiculo,
              materialNome: disciplina.materialNome,
              questoesPlanejadas: disciplina.questoesPlanejadas || 0,
              tempoVideoPlanejado: disciplina.tempoVideoPlanejado || 0,
              observacoes: disciplina.parametro,
              diasEstudo: disciplina.diasEstudo
            }))
          }
        },
        include: {
          disciplinas: {
            include: {
              disciplina: true
            }
          }
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'adicionarSemana')
      throw new Error(formatPrismaError(error))
    }
  }

  static async atualizarProgresso(userId: string, data: UpdateProgressoData) {
    // Primeiro, verifica se a disciplinaSemana pertence a um plano do usuário
    const disciplinaSemanaExistente = await prisma.disciplinaSemana.findUnique({
      where: { id: data.disciplinaSemanaId },
      include: {
        semana: {
          include: {
            plano: true
          }
        },
        dias: true // Incluir dias atuais para comparação
      }
    })

    const planoUserId = disciplinaSemanaExistente?.semana.plano.userId
    if (!disciplinaSemanaExistente || (planoUserId !== null && planoUserId !== userId)) {
      throw new Error('Disciplina não encontrada ou sem permissão')
    }

    const updateData: any = {}

    if (typeof data.horasRealizadas === 'number') updateData.horasRealizadas = data.horasRealizadas
    if (typeof data.concluida === 'boolean') updateData.concluida = data.concluida
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes
    if (typeof data.questoesRealizadas === 'number') updateData.questoesRealizadas = data.questoesRealizadas
    if (typeof data.minutosPlanejados === 'number') updateData.minutosPlanejados = data.minutosPlanejados
    if (typeof data.questoesPlanejadas === 'number') updateData.questoesPlanejadas = data.questoesPlanejadas
    if (data.disciplinaId) updateData.disciplinaId = data.disciplinaId
    if (data.diasEstudo !== undefined) updateData.diasEstudo = data.diasEstudo

    console.log('🔄 Atualizando no banco:', { disciplinaSemanaId: data.disciplinaSemanaId, updateData }) // Debug

    // ====== SINCRONIZAR DisciplinaDia quando diasEstudo mudar ======
    if (data.diasEstudo !== undefined) {
      const diasNovos = data.diasEstudo.split(',').map(d => d.trim()).filter(d => d)
      const diasAtuais = disciplinaSemanaExistente.dias.map(d => d.dia)

      console.log('📅 Sincronizando DisciplinaDia:')
      console.log('   Dias atuais:', diasAtuais)
      console.log('   Dias novos:', diasNovos)

      // Dias para adicionar (estão nos novos mas não nos atuais)
      const diasParaAdicionar = diasNovos.filter(d => !diasAtuais.includes(d))
      // Dias para remover (estão nos atuais mas não nos novos)
      const diasParaRemover = diasAtuais.filter(d => !diasNovos.includes(d))

      console.log('   ➕ Adicionar:', diasParaAdicionar)
      console.log('   ➖ Remover:', diasParaRemover)

      // Criar novos registros DisciplinaDia
      if (diasParaAdicionar.length > 0) {
        await prisma.disciplinaDia.createMany({
          data: diasParaAdicionar.map(dia => ({
            disciplinaSemanaId: data.disciplinaSemanaId,
            dia,
            minutosPlanejados: 1, // Valor padrão
            horasRealizadas: 0,
            questoesPlanejadas: 0,
            questoesRealizadas: 0
          })),
          skipDuplicates: true
        })
        console.log(`   ✅ Criados ${diasParaAdicionar.length} novos registros DisciplinaDia`)
      }

      // Remover registros DisciplinaDia que não estão mais nos dias
      if (diasParaRemover.length > 0) {
        await prisma.disciplinaDia.deleteMany({
          where: {
            disciplinaSemanaId: data.disciplinaSemanaId,
            dia: { in: diasParaRemover }
          }
        })
        console.log(`   ✅ Removidos ${diasParaRemover.length} registros DisciplinaDia`)
      }
    }
    // ================================================================

    const disciplinaSemana = await prisma.disciplinaSemana.update({
      where: { id: data.disciplinaSemanaId },
      data: updateData,
      include: {
        disciplina: true,
        semana: true
      }
    })

    console.log('✅ Resultado do banco:', disciplinaSemana) // Debug

    // Atualizar totais da semana
    const [totalHorasRealizadas, totalHorasPlanejadas] = await Promise.all([
      prisma.disciplinaSemana.aggregate({
        where: { semanaId: disciplinaSemana.semanaId },
        _sum: { horasRealizadas: true }
      }),
      prisma.disciplinaSemana.aggregate({
        where: { semanaId: disciplinaSemana.semanaId },
        _sum: { minutosPlanejados: true }
      })
    ])

    await prisma.semanaEstudo.update({
      where: { id: disciplinaSemana.semanaId },
      data: {
        horasRealizadas: totalHorasRealizadas._sum.horasRealizadas || 0,
        totalHoras: totalHorasPlanejadas._sum.minutosPlanejados || 0
      }
    })

    return disciplinaSemana
  }

  static async obterEstatisticas(planoId: string) {
    const plano = await this.buscarPorId(planoId)
    if (!plano) return null

    const totalSemanas = plano.semanas.length
    const semanasConcluidas = plano.semanas.filter(semana => 
      semana.horasRealizadas >= semana.totalHoras
    ).length

    const totalHorasPlanejadas = plano.semanas.reduce((acc, semana) => 
      acc + semana.totalHoras, 0
    )
    
    const totalHorasRealizadas = plano.semanas.reduce((acc, semana) => 
      acc + semana.horasRealizadas, 0
    )

    const disciplinasTotal = plano.semanas.reduce((acc, semana) => 
      acc + semana.disciplinas.length, 0
    )
    
    const disciplinasConcluidas = plano.semanas.reduce((acc, semana) => 
      acc + semana.disciplinas.filter(d => d.concluida).length, 0
    )

    return {
      totalSemanas,
      semanasConcluidas,
      totalHorasPlanejadas,
      totalHorasRealizadas,
      percentualConclusao: totalHorasPlanejadas > 0 
        ? Math.round((totalHorasRealizadas / totalHorasPlanejadas) * 100) 
        : 0,
      disciplinasTotal,
      disciplinasConcluidas,
      percentualDisciplinas: disciplinasTotal > 0 
        ? Math.round((disciplinasConcluidas / disciplinasTotal) * 100) 
        : 0
    }
  }

  static async adicionarDisciplinaSemana(userId: string, data: CreateDisciplinaSemanaData & { semanaId: string }) {
    try {
      // Verifica se a semana pertence a um plano do usuário
      const semana = await prisma.semanaEstudo.findUnique({
        where: { id: data.semanaId },
        include: { plano: true }
      })

      if (!semana || (semana.plano.userId !== null && semana.plano.userId !== userId)) {
        throw new Error('Semana não encontrada ou sem permissão')
      }

      // Verificar se já existe uma disciplina com o mesmo disciplinaId na mesma semana
      const existente = await prisma.disciplinaSemana.findFirst({
        where: {
          semanaId: data.semanaId,
          disciplinaId: data.disciplinaId
        }
      })

      if (existente) {
        throw new Error('Esta disciplina já existe neste ciclo de estudo')
      }

      // Buscar a prioridade máxima atual para esta semana
      const maxPrioridade = await prisma.disciplinaSemana.aggregate({
        where: {
          semanaId: data.semanaId
        },
        _max: {
          prioridade: true
        }
      })

      const novaPrioridade = (maxPrioridade._max.prioridade || 0) + 1

      return await prisma.disciplinaSemana.create({
        data: {
          semanaId: data.semanaId,
          disciplinaId: data.disciplinaId,
          minutosPlanejados: data.minutosPlanejados || 1,
          horasRealizadas: 0,
          prioridade: novaPrioridade,
          concluida: false,
          observacoes: data.parametro || '',
          questoesPlanejadas: data.questoesPlanejadas || 0,
          questoesRealizadas: 0,
          tempoVideoPlanejado: data.tempoVideoPlanejado || 0,
          tempoVideoRealizado: 0,
          paginasLidas: 0,
          totalPaginas: 0,
          tipoVeiculo: data.tipoVeiculo || 'pdf',
          materialNome: data.materialNome,
          materialUrl: null,
          diasEstudo: data.diasEstudo || '[]'
        },
        include: {
          disciplina: true
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'adicionarDisciplinaSemana')
      throw new Error(formatPrismaError(error))
    }
  }

  static async excluirDisciplinaSemana(userId: string, disciplinaSemanaId: string) {
    try {
      // Verifica se a disciplinaSemana pertence a um plano do usuário
      const disciplinaSemana = await prisma.disciplinaSemana.findUnique({
        where: { id: disciplinaSemanaId },
        include: {
          semana: {
            include: {
              plano: true
            }
          }
        }
      })

      if (!disciplinaSemana || (disciplinaSemana.semana.plano.userId !== null && disciplinaSemana.semana.plano.userId !== userId)) {
        throw new Error('Disciplina não encontrada ou sem permissão')
      }

      return await prisma.disciplinaSemana.delete({
        where: { id: disciplinaSemanaId }
      })
    } catch (error) {
      const errorLog = logError(error, 'excluirDisciplinaSemana')
      throw new Error(formatPrismaError(error))
    }
  }

  static async atualizarSemana(userId: string, data: { semanaId: string, dataInicio?: string, dataFim?: string }) {
    try {
      // Verifica se a semana pertence a um plano do usuário
      const semana = await prisma.semanaEstudo.findUnique({
        where: { id: data.semanaId },
        include: { plano: true }
      })

      if (!semana || (semana.plano.userId !== null && semana.plano.userId !== userId)) {
        throw new Error('Semana não encontrada ou sem permissão')
      }

      const updateData: any = {}
      // Criar datas locais sem conversão de fuso horário
      if (data.dataInicio) {
        const [ano, mes, dia] = data.dataInicio.split('-').map(Number)
        updateData.dataInicio = new Date(ano, mes - 1, dia, 12, 0, 0)
      }
      if (data.dataFim) {
        const [ano, mes, dia] = data.dataFim.split('-').map(Number)
        updateData.dataFim = new Date(ano, mes - 1, dia, 12, 0, 0)
      }

      return await prisma.semanaEstudo.update({
        where: { id: data.semanaId },
        data: updateData,
        include: {
          disciplinas: {
            include: {
              disciplina: true
            }
          }
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'atualizarSemana')
      throw new Error(formatPrismaError(error))
    }
  }

  // ========== Funções para DisciplinaDia ==========

  /**
   * Atualiza ou cria uma entrada de DisciplinaDia
   */
  static async atualizarDisciplinaDia(userId: string, data: UpdateDisciplinaDiaData) {
    try {
      // Verifica se a disciplinaSemana pertence ao usuário
      const disciplinaSemana = await prisma.disciplinaSemana.findUnique({
        where: { id: data.disciplinaSemanaId },
        include: {
          semana: {
            include: {
              plano: true
            }
          }
        }
      })

      if (!disciplinaSemana || (disciplinaSemana.semana.plano.userId !== null && disciplinaSemana.semana.plano.userId !== userId)) {
        throw new Error('Disciplina não encontrada ou sem permissão')
      }

      const updateData: any = {}
      if (data.minutosPlanejados !== undefined) updateData.minutosPlanejados = data.minutosPlanejados
      if (data.horasRealizadas !== undefined) updateData.horasRealizadas = data.horasRealizadas
      if (data.questoesPlanejadas !== undefined) updateData.questoesPlanejadas = data.questoesPlanejadas
      if (data.questoesRealizadas !== undefined) updateData.questoesRealizadas = data.questoesRealizadas
      if (data.observacoes !== undefined) updateData.observacoes = data.observacoes
      if (data.concluida !== undefined) updateData.concluida = data.concluida

      // Upsert: criar se não existe, atualizar se existe
      const disciplinaDia = await prisma.disciplinaDia.upsert({
        where: {
          disciplinaSemanaId_dia: {
            disciplinaSemanaId: data.disciplinaSemanaId,
            dia: data.dia
          }
        },
        update: updateData,
        create: {
          disciplinaSemanaId: data.disciplinaSemanaId,
          dia: data.dia,
          minutosPlanejados: data.minutosPlanejados || 0,
          horasRealizadas: data.horasRealizadas || 0,
          questoesPlanejadas: data.questoesPlanejadas || 0,
          questoesRealizadas: data.questoesRealizadas || 0,
          observacoes: data.observacoes || null,
          concluida: data.concluida || false
        },
        include: {
          disciplinaSemana: {
            include: {
              disciplina: true
            }
          }
        }
      })

      console.log('✅ DisciplinaDia atualizada:', disciplinaDia)
      return disciplinaDia
    } catch (error) {
      console.error('❌ Erro ao atualizar DisciplinaDia:', error)
      throw new Error(formatPrismaError(error))
    }
  }

  /**
   * Busca todas as entradas DisciplinaDia de uma disciplinaSemana
   */
  static async listarDisciplinasDia(disciplinaSemanaId: string) {
    try {
      return await prisma.disciplinaDia.findMany({
        where: { disciplinaSemanaId },
        orderBy: { dia: 'asc' }
      })
    } catch (error) {
      throw new Error(formatPrismaError(error))
    }
  }

  /**
   * Cria entradas DisciplinaDia ao adicionar uma disciplina na semana
   */
  static async criarDisciplinasDiaPadrao(disciplinaSemanaId: string, diasEstudo: string) {
    try {
      const dias = diasEstudo.split(',').filter(d => d.trim())

      const criadas = await Promise.all(
        dias.map(dia =>
          prisma.disciplinaDia.create({
            data: {
              disciplinaSemanaId,
              dia: dia.trim(),
              minutosPlanejados: 1, // Valor padrão inicial
              questoesPlanejadas: 0
            }
          })
        )
      )

      console.log(`✅ Criadas ${criadas.length} entradas DisciplinaDia`)
      return criadas
    } catch (error) {
      console.error('❌ Erro ao criar DisciplinasDia:', error)
      throw new Error(formatPrismaError(error))
    }
  }

  /**
   * Copia todas as disciplinas de um dia para outro dia, criando registros totalmente independentes
   */
  static async copiarDisciplinasDia(
    userId: string,
    data: { semanaId: string; diaOrigem: string; diaDestino: string }
  ) {
    try {
      console.log('🔄 SERVICE: Iniciando cópia de disciplinas entre dias')
      console.log('📊 Parâmetros:', { userId, ...data })

      // 1. Verificar se a semana pertence ao usuário
      const semana = await prisma.semanaEstudo.findUnique({
        where: { id: data.semanaId },
        include: {
          plano: true,
          disciplinas: {
            include: {
              disciplina: true,
              dias: {
                where: { dia: data.diaOrigem }
              }
            }
          }
        }
      })

      console.log('🔍 Semana encontrada:', !!semana)
      console.log('📚 Total de disciplinas na semana:', semana?.disciplinas?.length || 0)
      console.log('🔑 User match:', semana?.plano.userId === userId)

      if (!semana || (semana.plano.userId !== null && semana.plano.userId !== userId)) {
        throw new Error('Semana não encontrada ou sem permissão')
      }

      // 2. Filtrar disciplinas que têm dados no dia origem
      const disciplinasComDiaOrigem = semana.disciplinas.filter(
        disc => disc.dias && disc.dias.length > 0
      )

      console.log(`📊 Encontradas ${disciplinasComDiaOrigem.length} disciplinas no dia origem`)
      console.log('📋 Detalhes das disciplinas:', disciplinasComDiaOrigem.map(d => ({
        id: d.id,
        disciplinaId: d.disciplinaId,
        nome: d.disciplina.nome,
        diasCount: d.dias?.length || 0,
        dias: d.dias
      })))

      if (disciplinasComDiaOrigem.length === 0) {
        console.log('⚠️ Nenhuma disciplina encontrada no dia origem, retornando 0')
        return {
          disciplinasCriadas: 0,
          mensagem: 'Nenhuma disciplina encontrada no dia origem'
        }
      }

      // 3. Para cada disciplina do dia origem, adicionar o dia destino
      const disciplinasAtualizadas = []

      for (const discOrigem of disciplinasComDiaOrigem) {
        const diaOrigemData = discOrigem.dias[0] // Já filtrado pelo where acima

        console.log(`\n📖 Processando disciplina: ${discOrigem.disciplina.nome}`)
        console.log(`  - ID: ${discOrigem.id}`)
        console.log(`  - diasEstudo atual: "${discOrigem.diasEstudo}"`)
        console.log(`  - Horas planejadas no dia origem: ${diaOrigemData.minutosPlanejados}`)
        console.log(`  - Questões planejadas no dia origem: ${diaOrigemData.questoesPlanejadas}`)

        // Verificar se o dia destino já está no diasEstudo
        const diasAtuais = discOrigem.diasEstudo?.split(',').map(d => d.trim()).filter(d => d) || []

        if (diasAtuais.includes(data.diaDestino)) {
          console.log('  ⚠️ Dia destino já existe no diasEstudo, pulando...')
          continue
        }

        // Adicionar o dia destino ao diasEstudo
        const novosDias = [...diasAtuais, data.diaDestino].sort()
        console.log(`  📝 Adicionando dia destino aos dias de estudo`)
        console.log(`     Dias atuais: [${diasAtuais.join(', ')}]`)
        console.log(`     Novos dias: [${novosDias.join(', ')}]`)

        // Atualizar o campo diasEstudo
        await prisma.disciplinaSemana.update({
          where: { id: discOrigem.id },
          data: {
            diasEstudo: novosDias.join(',')
          }
        })

        // Verificar se já existe DisciplinaDia para o dia destino (pode ter sido criado antes)
        const disciplinaDiaExistente = await prisma.disciplinaDia.findUnique({
          where: {
            disciplinaSemanaId_dia: {
              disciplinaSemanaId: discOrigem.id,
              dia: data.diaDestino
            }
          }
        })

        if (disciplinaDiaExistente) {
          console.log(`  ℹ️ DisciplinaDia já existe, atualizando...`)
          // Atualizar com os valores do dia origem
          await prisma.disciplinaDia.update({
            where: { id: disciplinaDiaExistente.id },
            data: {
              minutosPlanejados: diaOrigemData.minutosPlanejados,
              questoesPlanejadas: diaOrigemData.questoesPlanejadas,
              observacoes: diaOrigemData.observacoes
            }
          })
          console.log(`  ✅ DisciplinaDia atualizado: ${disciplinaDiaExistente.id}`)
        } else {
          // Criar novo DisciplinaDia para o dia destino com os dados do dia origem
          const novoDisciplinaDia = await prisma.disciplinaDia.create({
            data: {
              disciplinaSemanaId: discOrigem.id,
              dia: data.diaDestino,
              minutosPlanejados: diaOrigemData.minutosPlanejados,
              horasRealizadas: 0,
              questoesPlanejadas: diaOrigemData.questoesPlanejadas,
              questoesRealizadas: 0,
              observacoes: diaOrigemData.observacoes,
              concluida: false
            }
          })
          console.log(`  ✅ Novo DisciplinaDia criado: ${novoDisciplinaDia.id}`)
        }

        console.log(`  ✅ DisciplinaSemana atualizada: ${discOrigem.id}`)

        disciplinasAtualizadas.push(discOrigem)
      }

      console.log(`✅ SERVICE: ${disciplinasAtualizadas.length} disciplinas copiadas com sucesso`)

      return {
        disciplinasCriadas: disciplinasAtualizadas.length,
        disciplinas: disciplinasAtualizadas
      }
    } catch (error) {
      console.error('❌ SERVICE: Erro ao copiar disciplinas entre dias:', error)
      throw new Error(formatPrismaError(error))
    }
  }
}
