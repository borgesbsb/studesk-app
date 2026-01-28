"use server";

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';

interface AdicionarQuestoesParams {
  disciplinaId: string;
  quantidade: number;
  data?: Date;
}

export async function adicionarQuestoes(params: AdicionarQuestoesParams) {
  try {
    const { userId } = await requireAuth();
    const { disciplinaId, quantidade, data } = params;
    const diaConsultado = data || new Date();

    // Buscar a semana de estudo ativa para a disciplina do usuário
    const planoAtivo = await prisma.planoEstudo.findFirst({
      where: {
        userId,
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
    // Normalizar a data para comparação (apenas data, sem horas)
    const diaParaComparacao = new Date(diaConsultado);
    diaParaComparacao.setHours(0, 0, 0, 0);

    // Buscar todas as semanas do plano
    const todasSemanas = await prisma.semanaEstudo.findMany({
      where: {
        planoId: planoAtivo.id
      }
    });

    // Encontrar a semana que contém o dia consultado
    const semanaEstudo = todasSemanas.find(semana => {
      const inicio = new Date(semana.dataInicio);
      inicio.setHours(0, 0, 0, 0);
      const fim = new Date(semana.dataFim);
      fim.setHours(23, 59, 59, 999);

      return diaParaComparacao >= inicio && diaParaComparacao <= fim;
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

    // Calcular qual é o diaId atual (dia1, dia2, etc)
    const inicioNormalizado = new Date(semanaEstudo.dataInicio);
    inicioNormalizado.setHours(0, 0, 0, 0);
    const consultadaNormalizada = new Date(diaConsultado);
    consultadaNormalizada.setHours(0, 0, 0, 0);
    const diffTime = consultadaNormalizada.getTime() - inicioNormalizado.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const diaIdAtual = `dia${diffDays + 1}`;

    // Buscar ou criar DisciplinaDia para o dia específico
    let disciplinaDia = await prisma.disciplinaDia.findFirst({
      where: {
        disciplinaSemanaId: disciplinaSemana.id,
        dia: diaIdAtual
      }
    });

    if (!disciplinaDia) {
      // Criar DisciplinaDia se não existir
      disciplinaDia = await prisma.disciplinaDia.create({
        data: {
          disciplinaSemanaId: disciplinaSemana.id,
          dia: diaIdAtual,
          horasPlanejadas: 0,
          horasRealizadas: 0,
          questoesPlanejadas: 0,
          questoesRealizadas: 0
        }
      });
    }

    // Adicionar questões ao total já realizado
    const questoesAnteriores = disciplinaDia.questoesRealizadas || 0;
    const novoTotalQuestoes = questoesAnteriores + quantidade;

    // Atualizar DisciplinaDia
    await prisma.disciplinaDia.update({
      where: {
        id: disciplinaDia.id
      },
      data: {
        questoesRealizadas: novoTotalQuestoes
      }
    });

    // Revalidar o cache das páginas do dashboard
    revalidatePath('/dashboard');
    revalidatePath('/hoje');

    return {
      success: true,
      message: `${quantidade} ${quantidade !== 1 ? 'questões adicionadas' : 'questão adicionada'} com sucesso!`,
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
