import { PrismaClient, Prisma } from "@prisma/client"
import { logError, formatPrismaError } from "@/lib/error-handler"

const prisma = new PrismaClient()

export interface CreatePlanoEstudoData {
  nome: string
  descricao?: string
  concursoId?: string
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
  horasRealizadas: number
  concluida: boolean
  observacoes?: string
}

export class PlanoEstudoService {
  static async listarPlanos() {
    try {
      return await prisma.planoEstudo.findMany({
        include: {
          concurso: true,
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

  static async buscarPorId(id: string) {
    return await prisma.planoEstudo.findUnique({
      where: { id },
      include: {
        concurso: true,
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
  }

  static async criar(data: CreatePlanoEstudoData) {
    try {
      return await prisma.planoEstudo.create({
        data: {
          nome: data.nome,
          descricao: data.descricao,
          concursoId: data.concursoId,
          dataInicio: data.dataInicio,
          dataFim: data.dataFim,
          semanas: {
            create: data.semanas.map(semana => ({
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
          concurso: true,
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

  static async criarSimples(data: { nome: string; concursoId?: string }) {
    try {
      // Cria um plano básico sem semanas nem disciplinas
      // Usa datas padrão (hoje e hoje + 30 dias)
      const dataInicio = new Date()
      const dataFim = new Date()
      dataFim.setDate(dataFim.getDate() + 30)

      return await prisma.planoEstudo.create({
        data: {
          nome: data.nome,
          concursoId: data.concursoId,
          dataInicio,
          dataFim,
          ativo: true
        },
        include: {
          concurso: true,
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

  static async atualizar(id: string, data: Partial<CreatePlanoEstudoData>) {
    return await prisma.planoEstudo.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao,
        concursoId: data.concursoId,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim
      },
      include: {
        concurso: true,
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

  static async excluir(id: string) {
    return await prisma.planoEstudo.delete({
      where: { id }
    })
  }

  static async adicionarSemana(planoId: string, semanaData: CreateSemanaEstudoData) {
    try {
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

  static async atualizarProgresso(data: UpdateProgressoData) {
    const disciplinaSemana = await prisma.disciplinaSemana.update({
      where: { id: data.disciplinaSemanaId },
      data: {
        horasRealizadas: data.horasRealizadas,
        concluida: data.concluida,
        observacoes: data.observacoes
      },
      include: {
        disciplina: true,
        semana: true
      }
    })

    // Atualizar total de horas realizadas da semana
    const totalHorasRealizadas = await prisma.disciplinaSemana.aggregate({
      where: { semanaId: disciplinaSemana.semanaId },
      _sum: { horasRealizadas: true }
    })

    await prisma.semanaEstudo.update({
      where: { id: disciplinaSemana.semanaId },
      data: {
        horasRealizadas: totalHorasRealizadas._sum.horasRealizadas || 0
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
}
