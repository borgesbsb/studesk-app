"use server";

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export interface DisciplinaCiclo {
  disciplinaId: string;
  nome: string;
  cor: string | null;
  horasPlanejadas: number;
  horasRealizadas: number;
  questoesPlanejadas: number;
  questoesRealizadas: number;
}

export async function getDisciplinasCiclo(data?: Date): Promise<DisciplinaCiclo[]> {
  try {
    const { userId } = await requireAuth();
    const diaConsultado = data || new Date();

    const planoAtivo = await prisma.planoEstudo.findFirst({
      where: {
        userId,
        ativo: true,
        dataInicio: { lte: diaConsultado },
        dataFim: { gte: diaConsultado }
      }
    });

    if (!planoAtivo) return [];

    const semanaAtual = await prisma.semanaEstudo.findFirst({
      where: {
        planoId: planoAtivo.id,
        dataInicio: { lte: diaConsultado },
        dataFim: { gte: diaConsultado }
      },
      include: {
        disciplinas: {
          include: {
            disciplina: true,
            dias: true
          }
        }
      }
    });

    if (!semanaAtual) return [];

    return semanaAtual.disciplinas.map(ds => {
      let horasPlanejadas = 0;
      let horasRealizadas = 0;
      let questoesPlanejadas = 0;
      let questoesRealizadas = 0;

      ds.dias.forEach(dia => {
        horasPlanejadas += dia.horasPlanejadas;
        horasRealizadas += dia.horasRealizadas;
        questoesPlanejadas += dia.questoesPlanejadas;
        questoesRealizadas += dia.questoesRealizadas;
      });

      return {
        disciplinaId: ds.disciplinaId,
        nome: ds.disciplina.nome.trim(),
        cor: ds.disciplina.cor,
        horasPlanejadas: Math.round(horasPlanejadas * 100) / 100,
        horasRealizadas: Math.round(horasRealizadas * 100) / 100,
        questoesPlanejadas,
        questoesRealizadas,
      };
    });
  } catch (error) {
    console.error('Erro ao buscar disciplinas do ciclo:', error);
    return [];
  }
}
