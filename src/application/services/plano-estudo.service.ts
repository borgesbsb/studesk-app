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
  horasPlanejadas: number
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
  horasPlanejadas?: number
  questoesPlanejadas?: number
  disciplinaId?: string
  diasEstudo?: string
}

export interface UpdateDisciplinaDiaData {
  disciplinaDiaId?: string
  disciplinaSemanaId: string
  dia: string
  horasPlanejadas?: number
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
                  horasPlanejadas: disciplina.horasPlanejadas,
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
      // Verifica se o plano pertence ao usuário
      const plano = await prisma.planoEstudo.findUnique({
        where: { id: planoId, userId }
      })

      if (!plano) {
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
              horasPlanejadas: disciplina.horasPlanejadas,
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
        }
      }
    })

    if (!disciplinaSemanaExistente || disciplinaSemanaExistente.semana.plano.userId !== userId) {
      throw new Error('Disciplina não encontrada ou sem permissão')
    }

    const updateData: any = {}

    if (typeof data.horasRealizadas === 'number') updateData.horasRealizadas = data.horasRealizadas
    if (typeof data.concluida === 'boolean') updateData.concluida = data.concluida
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes
    if (typeof data.questoesRealizadas === 'number') updateData.questoesRealizadas = data.questoesRealizadas
    if (typeof data.horasPlanejadas === 'number') updateData.horasPlanejadas = data.horasPlanejadas
    if (typeof data.questoesPlanejadas === 'number') updateData.questoesPlanejadas = data.questoesPlanejadas
    if (data.disciplinaId) updateData.disciplinaId = data.disciplinaId
    if (data.diasEstudo !== undefined) updateData.diasEstudo = data.diasEstudo

    console.log('🔄 Atualizando no banco:', { disciplinaSemanaId: data.disciplinaSemanaId, updateData }) // Debug

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
        _sum: { horasPlanejadas: true }
      })
    ])

    await prisma.semanaEstudo.update({
      where: { id: disciplinaSemana.semanaId },
      data: {
        horasRealizadas: totalHorasRealizadas._sum.horasRealizadas || 0,
        totalHoras: totalHorasPlanejadas._sum.horasPlanejadas || 0
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

      if (!semana || semana.plano.userId !== userId) {
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
          horasPlanejadas: data.horasPlanejadas || 1,
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

      if (!disciplinaSemana || disciplinaSemana.semana.plano.userId !== userId) {
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

      if (!semana || semana.plano.userId !== userId) {
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

      if (!disciplinaSemana || disciplinaSemana.semana.plano.userId !== userId) {
        throw new Error('Disciplina não encontrada ou sem permissão')
      }

      const updateData: any = {}
      if (data.horasPlanejadas !== undefined) updateData.horasPlanejadas = data.horasPlanejadas
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
          horasPlanejadas: data.horasPlanejadas || 0,
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
              horasPlanejadas: 1, // Valor padrão inicial
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
}
