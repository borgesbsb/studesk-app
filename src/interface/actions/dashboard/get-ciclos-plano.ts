"use server";

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export interface CicloInfo {
  id: string;
  numeroSemana: number;
  dataInicio: Date;
  dataFim: Date;
  isCurrent: boolean;
}

export async function getCiclosPlano(data?: string): Promise<CicloInfo[]> {
  try {
    const { userId } = await requireAuth();

    let baseDate: Date;
    if (typeof data === 'string') {
      const [y, m, d] = data.split('-').map(Number);
      baseDate = new Date(Date.UTC(y, m - 1, d));
    } else {
      const now = new Date();
      baseDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }
    const tomorrowUTC = new Date(baseDate.getTime() + 86400000);

    const planoAtivo = await prisma.planoEstudo.findFirst({
      where: {
        ativo: true,
        OR: [
          { userId },
          { userId: null, usuarios: { some: { userId } } }
        ],
        dataInicio: { lt: tomorrowUTC },
        dataFim: { gte: baseDate }
      }
    });

    if (!planoAtivo) return [];

    const semanas = await prisma.semanaEstudo.findMany({
      where: { planoId: planoAtivo.id },
      orderBy: { dataInicio: 'asc' },
      select: { id: true, numeroSemana: true, dataInicio: true, dataFim: true }
    });

    return semanas.map(s => ({
      id: s.id,
      numeroSemana: s.numeroSemana,
      dataInicio: s.dataInicio,
      dataFim: s.dataFim,
      isCurrent: s.dataInicio <= baseDate && s.dataFim >= baseDate,
    }));

  } catch (error) {
    console.error('Erro ao buscar ciclos do plano:', error);
    return [];
  }
}
