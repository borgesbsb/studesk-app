"use server";

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export interface ProgressoCiclo {
  horasRealizadas: number;
  horasPlanejadas: number;
  questoesRealizadas: number;
  questoesPlanejadas: number;
  nomeCiclo: string;
  dataInicio: Date;
  dataFim: Date;
}

export async function getProgressoCiclo(data?: Date): Promise<ProgressoCiclo | null> {
  try {
    const { userId } = await requireAuth();
    const diaConsultado = data || new Date();

    // Buscar o plano ativo que contém o dia consultado
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
      return null;
    }

    // Buscar a semana (ciclo) que contém o dia consultado
    const semanaAtual = await prisma.semanaEstudo.findFirst({
      where: {
        planoId: planoAtivo.id,
        dataInicio: {
          lte: diaConsultado
        },
        dataFim: {
          gte: diaConsultado
        }
      },
      include: {
        disciplinas: {
          include: {
            dias: true // Incluir todos os dias do ciclo
          }
        }
      }
    });

    if (!semanaAtual) {
      return null;
    }

    // Calcular totais do ciclo somando todos os DisciplinaDia
    let horasRealizadasTotal = 0;
    let horasPlanejadasTotal = 0;
    let questoesRealizadasTotal = 0;
    let questoesPlanejadasTotal = 0;

    semanaAtual.disciplinas.forEach(disciplinaSemana => {
      // Somar horas e questões de todos os dias dessa disciplina
      disciplinaSemana.dias.forEach(disciplinaDia => {
        horasRealizadasTotal += disciplinaDia.horasRealizadas;
        horasPlanejadasTotal += disciplinaDia.horasPlanejadas;
        questoesRealizadasTotal += disciplinaDia.questoesRealizadas;
        questoesPlanejadasTotal += disciplinaDia.questoesPlanejadas;
      });
    });

    return {
      horasRealizadas: Math.round(horasRealizadasTotal * 100) / 100,
      horasPlanejadas: Math.round(horasPlanejadasTotal * 100) / 100,
      questoesRealizadas: questoesRealizadasTotal,
      questoesPlanejadas: questoesPlanejadasTotal,
      nomeCiclo: `Ciclo ${semanaAtual.numeroSemana || 1}`,
      dataInicio: semanaAtual.dataInicio,
      dataFim: semanaAtual.dataFim
    };

  } catch (error) {
    console.error('Erro ao buscar progresso do ciclo:', error);
    return null;
  }
}
