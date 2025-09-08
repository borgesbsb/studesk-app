"use server"

import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

export interface MateriaDoDia {
  id: string
  disciplinaId: string
  disciplinaNome: string
  horasPlanejadas: number
  horasRealizadas: number
  tempoRealEstudo: number // Tempo controlado pelo usuário (em horas)
  tempoSessoesPdf: number // Tempo automático das sessões PDF (em horas)
  concluida: boolean
  materialNome?: string
  questoesPlanejadas: number
  questoesRealizadas: number
  prioridade: number
}

// Função para obter o dia da semana em formato abreviado
function getDiaDaSemana(data: Date): string {
  const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
  return diasSemana[data.getDay()]
}

// Função para verificar se o dia atual está nos dias de estudo
function isDiaDeEstudo(diasEstudo: string | null, diaAtual: string): boolean {
  if (!diasEstudo) return false
  
  try {
    // Se for JSON
    if (diasEstudo.trim().startsWith('[')) {
      const diasArray = JSON.parse(diasEstudo)
      return diasArray.includes(diaAtual)
    }
    
    // Se for CSV
    const diasArray = diasEstudo.split(',').map(d => d.trim()).filter(d => d)
    return diasArray.includes(diaAtual)
  } catch (error) {
    console.warn('Erro ao processar diasEstudo:', diasEstudo, error)
    return false
  }
}

export async function getMateriasDoDia(data?: Date): Promise<MateriaDoDia[]> {
  try {
    const diaConsultado = data || new Date()
    const inicioDia = startOfDay(diaConsultado)
    const fimDia = endOfDay(diaConsultado)
    const diaDaSemana = getDiaDaSemana(diaConsultado)

    console.log('🔍 DEBUG getMateriasDoDia - Início:', {
      diaConsultado: diaConsultado.toISOString(),
      inicioDia: inicioDia.toISOString(),
      fimDia: fimDia.toISOString(),
      diaDaSemana
    })

    // Busca o plano de estudo ativo que contenha o dia consultado
    const planoAtivo = await prisma.planoEstudo.findFirst({
      where: {
        ativo: true,
        dataInicio: {
          lte: diaConsultado
        },
        dataFim: {
          gte: diaConsultado
        }
      }
    })

    console.log('🔍 DEBUG - Plano ativo encontrado:', planoAtivo?.id)

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
            disciplina: true
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

    // Filtra disciplinas programadas para o dia consultado
    const disciplinasDoDia = semanaAtual.disciplinas.filter((disciplinaSemana) => {
      const isDiaPrograma = isDiaDeEstudo(disciplinaSemana.diasEstudo, diaDaSemana)
      console.log(`🎯 Disciplina ${disciplinaSemana.disciplina.nome}: dias="${disciplinaSemana.diasEstudo}", diaConsultado="${diaDaSemana}", programada=${isDiaPrograma}`)
      return isDiaPrograma
    })

    console.log('🎯 Disciplinas programadas para o dia:', {
      total: disciplinasDoDia.length,
      nomes: disciplinasDoDia.map(d => d.disciplina.nome),
      diaDaSemana
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
                      not: null,
                      not: { contains: '[TEMPO TRANSFERIDO]' }
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
        
        // Tempo Real de Estudo vem do campo horasRealizadas (controlado pelo usuário)
        const tempoRealEstudo = disciplinaSemana.horasRealizadas

        console.log('🔍 DEBUG - Cálculo final:', {
          disciplinaNome: disciplinaSemana.disciplina.nome,
          tempoSessoesPdfSegundos,
          tempoSessoesPdf,
          tempoRealEstudo
        })

        return {
          id: disciplinaSemana.id,
          disciplinaId: disciplinaSemana.disciplina.id,
          disciplinaNome: disciplinaSemana.disciplina.nome,
          horasPlanejadas: disciplinaSemana.horasPlanejadas,
          horasRealizadas: disciplinaSemana.horasRealizadas,
          tempoRealEstudo,
          tempoSessoesPdf,
          concluida: disciplinaSemana.concluida,
          materialNome: disciplinaSemana.materialNome || undefined,
          questoesPlanejadas: disciplinaSemana.questoesPlanejadas,
          questoesRealizadas: disciplinaSemana.questoesRealizadas,
          prioridade: disciplinaSemana.prioridade
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