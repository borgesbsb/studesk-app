"use server";

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function adicionarQuestoes(disciplinaId: string, quantidade: number, data?: Date) {
  try {
    const diaConsultado = data || new Date();
    console.log('📝 Adicionando questões:', {
      disciplinaId,
      quantidade,
      data: diaConsultado.toISOString()
    });

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

    // Adicionar questões ao total já realizado
    const questoesAnteriores = disciplinaSemana.questoesRealizadas || 0;
    const novoTotalQuestoes = questoesAnteriores + quantidade;

    console.log('🔍 [DEBUG - QUESTÕES]:', {
      quantidade,
      questoesAnteriores,
      novoTotalQuestoes,
      diferencaCalculada: novoTotalQuestoes - questoesAnteriores
    });

    await prisma.disciplinaSemana.update({
      where: {
        id: disciplinaSemana.id
      },
      data: {
        questoesRealizadas: novoTotalQuestoes
      }
    });

    // Verificar o que foi realmente salvo no banco
    const disciplinaAtualizada = await prisma.disciplinaSemana.findUnique({
      where: { id: disciplinaSemana.id },
      select: { questoesRealizadas: true }
    });

    console.log('✅ Questões realizadas atualizadas:', {
      disciplinaSemanaId: disciplinaSemana.id,
      questoesAdicionadas: quantidade,
      questoesAnteriores,
      novoTotalCalculado: novoTotalQuestoes,
      questoesSalvasNoBanco: disciplinaAtualizada?.questoesRealizadas
    });

    // Revalidar o cache das páginas do dashboard
    revalidatePath('/dashboard');
    revalidatePath('/hoje');

    return {
      success: true,
      message: `${quantidade} questão${quantidade !== 1 ? 'ões' : ''} adicionada${quantidade !== 1 ? 's' : ''} com sucesso!`,
      questoesAdicionadas: quantidade
    };

  } catch (error) {
    console.error('❌ Erro ao adicionar questões:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao adicionar questões'
    };
  }
}
