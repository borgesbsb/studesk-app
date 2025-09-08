"use server";

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function adicionarTempoManual(disciplinaId: string, horas: number, minutos: number, data?: Date) {
  try {
    const diaConsultado = data || new Date();
    const totalSegundos = (horas * 3600) + (minutos * 60);
    
    console.log('🕒 Adicionando tempo manual:', {
      disciplinaId,
      horas,
      minutos,
      totalSegundos,
      data: diaConsultado.toISOString()
    });

    // Buscar um material da disciplina para associar o tempo
    const materialDisciplina = await prisma.disciplinaMaterial.findFirst({
      where: {
        disciplinaId: disciplinaId
      },
      include: {
        material: true
      }
    });

    if (!materialDisciplina) {
      throw new Error('Nenhum material encontrado para esta disciplina');
    }

    // Buscar a semana de estudo ativa para a disciplina
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
    });

    if (!planoAtivo) {
      throw new Error('Nenhum plano de estudo ativo encontrado');
    }

    // Buscar a semana de estudo
    const semanaEstudo = await prisma.semanaEstudo.findFirst({
      where: {
        planoId: planoAtivo.id,
        dataInicio: {
          lte: diaConsultado
        },
        dataFim: {
          gte: diaConsultado
        }
      }
    });

    if (!semanaEstudo) {
      throw new Error('Semana de estudo não encontrada para o período');
    }

    // Buscar a disciplina na semana
    const disciplinaSemana = await prisma.disciplinaSemana.findFirst({
      where: {
        semanaId: semanaEstudo.id,
        disciplinaId: disciplinaId
      }
    });

    if (!disciplinaSemana) {
      throw new Error('Disciplina não encontrada na semana de estudo');
    }

    // Converter segundos para horas (com 2 decimais)
    const horasAdicionadas = Math.round((totalSegundos / 3600) * 100) / 100;

    // Adicionar diretamente ao tempo real de estudo (horasRealizadas)
    const novoTempoRealizado = disciplinaSemana.horasRealizadas + horasAdicionadas;

    await prisma.disciplinaSemana.update({
      where: {
        id: disciplinaSemana.id
      },
      data: {
        horasRealizadas: novoTempoRealizado
      }
    });

    console.log('✅ Tempo real de estudo atualizado:', {
      disciplinaSemanaId: disciplinaSemana.id,
      horasAdicionadas,
      novoTempoRealizado,
      totalSegundos
    });

    // Revalidar o cache da página do dashboard
    revalidatePath('/dashboard');

    return {
      success: true,
      message: `${horas}h ${minutos}min adicionados ao Tempo Real de Estudo com sucesso!`,
      tempoAdicionado: horasAdicionadas
    };

  } catch (error) {
    console.error('❌ Erro ao adicionar tempo manual:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao adicionar tempo'
    };
  }
}