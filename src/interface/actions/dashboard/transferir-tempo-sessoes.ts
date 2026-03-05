"use server";

import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';

export async function transferirTempoSessoes(disciplinaId: string, data?: Date) {
  try {
    const { userId } = await requireAuth();
    const diaConsultado = data || new Date();
    const inicioDia = startOfDay(diaConsultado);
    const fimDia = endOfDay(diaConsultado);

    console.log('🔄 Transferindo tempo de sessões PDF para Tempo Real de Estudo:', {
      disciplinaId,
      data: diaConsultado.toISOString()
    });

    // Busca o plano de estudo ativo do usuário que contenha o dia consultado
    const planoAtivo = await prisma.planoEstudo.findFirst({
      where: {
        ativo: true,
        OR: [
          { userId },
          { userId: null, usuarios: { some: { userId } } }
        ],
        dataInicio: {
          lte: diaConsultado
        },
        dataFim: {
          gte: diaConsultado
        }
      }
    });

    if (!planoAtivo) {
      throw new Error('Nenhum plano de estudo ativo encontrado');
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
      }
    });

    if (!semanaAtual) {
      throw new Error('Nenhuma semana de estudo encontrada para o período');
    }

    // Busca a disciplina na semana
    const disciplinaSemana = await prisma.disciplinaSemana.findFirst({
      where: {
        semanaId: semanaAtual.id,
        disciplinaId: disciplinaId
      }
    });

    if (!disciplinaSemana) {
      throw new Error('Disciplina não encontrada na semana de estudo');
    }

    // Buscar materiais da disciplina para calcular tempo das sessões PDF
    const materiaisDisciplina = await prisma.disciplinaMaterial.findMany({
      where: {
        disciplinaId: disciplinaId
      },
      include: {
        material: {
          include: {
            historicoLeitura: {
              where: {
                dataLeitura: {
                  gte: semanaAtual.dataInicio,
                  lte: semanaAtual.dataFim
                },
                nomeSessao: { not: null },
                assuntosEstudados: { not: null }
              }
            }
          }
        }
      }
    });

    // Calcular tempo automático das sessões PDF em segundos
    const tempoSessoesPdfSegundos = materiaisDisciplina.reduce((total, disciplinaMaterial) => {
      const tempoMaterial = disciplinaMaterial.material.historicoLeitura.reduce((subtotal, historico) => {
        return subtotal + historico.tempoLeituraSegundos;
      }, 0);
      return total + tempoMaterial;
    }, 0);

    // Converter segundos para horas (com 2 decimais)
    const tempoSessoesPdfHoras = Math.round((tempoSessoesPdfSegundos / 3600) * 100) / 100;

    if (tempoSessoesPdfHoras === 0) {
      return {
        success: false,
        message: 'Não há tempo de sessões PDF para transferir'
      };
    }

    // Adicionar o tempo das sessões PDF ao tempo real de estudo (horasRealizadas)
    const novoTempoRealizado = disciplinaSemana.horasRealizadas + tempoSessoesPdfHoras;

    // Atualizar o tempo real de estudo
    await prisma.disciplinaSemana.update({
      where: {
        id: disciplinaSemana.id
      },
      data: {
        horasRealizadas: novoTempoRealizado
      }
    });

    // Buscar históricos para marcar como transferidos
    const historicosParaTransferir = await prisma.historicoLeitura.findMany({
      where: {
        material: {
          disciplinas: {
            some: {
              disciplinaId: disciplinaId
            }
          }
        },
        dataLeitura: {
          gte: semanaAtual.dataInicio,
          lte: semanaAtual.dataFim
        },
        nomeSessao: { not: null },
        assuntosEstudados: { 
          not: null
        },
        NOT: {
          assuntosEstudados: { contains: '[TEMPO TRANSFERIDO]' }
        }
      }
    });

    // Marcar históricos como transferidos
    for (const historico of historicosParaTransferir) {
      await prisma.historicoLeitura.update({
        where: { id: historico.id },
        data: {
          assuntosEstudados: `${historico.assuntosEstudados} [TEMPO TRANSFERIDO]`
        }
      });
    }


    console.log('✅ Tempo transferido com sucesso:', {
      tempoTransferido: tempoSessoesPdfHoras,
      novoTempoRealizado,
      historicosTransferidos: historicosParaTransferir.length
    });

    // Revalidar o cache da página do dashboard
    revalidatePath('/dashboard');

    return {
      success: true,
      message: `${tempoSessoesPdfHoras}h transferidas das sessões PDF para o Tempo Real de Estudo`,
      tempoTransferido: tempoSessoesPdfHoras
    };

  } catch (error) {
    console.error('❌ Erro ao transferir tempo das sessões:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao transferir tempo'
    };
  }
}