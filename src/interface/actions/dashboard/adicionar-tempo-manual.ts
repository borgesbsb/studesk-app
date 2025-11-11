"use server";

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function adicionarTempoManual(disciplinaId: string, minutos: number, data?: Date) {
  try {
    const diaConsultado = data || new Date();
    console.log('🕒 Adicionando tempo manual:', {
      disciplinaId,
      minutos,
      data: diaConsultado.toISOString()
    });

    // Não é necessário ter material para adicionar tempo de estudo
    // O tempo será adicionado diretamente à disciplina na semana de estudo

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

    // Trabalhar diretamente com minutos
    const minutosAdicionados = minutos;
    
    // horasRealizadas armazena minutos totais para ter precisão
    const tempoAnteriorMinutos = disciplinaSemana.horasRealizadas; // Minutos
    const novoTempoRealizadoMinutos = tempoAnteriorMinutos + minutosAdicionados;

    console.log('🔍 [DEBUG - APENAS MINUTOS]:', {
      minutos,
      minutosAdicionados,
      tempoAnteriorMinutos,
      novoTempoRealizadoMinutos,
      diferencaCalculada: novoTempoRealizadoMinutos - tempoAnteriorMinutos
    });

    await prisma.disciplinaSemana.update({
      where: {
        id: disciplinaSemana.id
      },
      data: {
        horasRealizadas: novoTempoRealizadoMinutos // Salva em minutos
      }
    });

    // Verificar o que foi realmente salvo no banco
    const disciplinaAtualizada = await prisma.disciplinaSemana.findUnique({
      where: { id: disciplinaSemana.id },
      select: { horasRealizadas: true }
    });

    console.log('✅ Tempo real de estudo atualizado (em minutos):', {
      disciplinaSemanaId: disciplinaSemana.id,
      minutosAdicionados,
      tempoAnteriorMinutos,
      novoTempoCalculadoMinutos: novoTempoRealizadoMinutos,
      tempoSalvoNoBanco: disciplinaAtualizada?.horasRealizadas
    });

    // Revalidar o cache das páginas do dashboard
    revalidatePath('/dashboard');
    revalidatePath('/hoje');

    return {
      success: true,
      message: `${minutos} minutos adicionados ao Tempo Real de Estudo com sucesso!`,
      tempoAdicionado: minutosAdicionados
    };

  } catch (error) {
    console.error('❌ Erro ao adicionar tempo manual:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao adicionar tempo'
    };
  }
}