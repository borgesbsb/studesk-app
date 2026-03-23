"use server";

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export interface ResultadoSimuladoDisciplina {
  disciplinaId: string;
  nome: string;
  cor: string | null;
  totalQuestoes: number;
  acertos: number;
  percentual: number;
}

export interface ResultadoSimulado {
  simuladoId: string;
  nomeSimulado: string;
  totalQuestoes: number;
  totalAcertos: number;
  percentualGeral: number;
  disciplinas: ResultadoSimuladoDisciplina[];
}

export async function getResultadoSimuladoCicloAtual(data?: string, semanaId?: string): Promise<ResultadoSimulado | null> {
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

    // Buscar plano ativo do usuário
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

    if (!planoAtivo) return null;

    // Buscar ciclo (por semanaId direto ou pelo ciclo atual com simulado)
    const semanaAtual = await prisma.semanaEstudo.findFirst({
      where: semanaId
        ? { id: semanaId, planoId: planoAtivo.id, simuladoId: { not: null } }
        : { planoId: planoAtivo.id, dataInicio: { lt: tomorrowUTC }, dataFim: { gte: baseDate }, simuladoId: { not: null } },
      include: {
        simulado: {
          include: {
            config: {
              include: {
                disciplinas: {
                  include: { disciplina: { select: { id: true, nome: true, cor: true } } },
                  orderBy: { disciplina: { nome: 'asc' } }
                }
              }
            },
            resultados: {
              where: { userId },
              include: {
                disciplinas: {
                  include: { disciplina: { select: { id: true, nome: true, cor: true } } }
                }
              }
            }
          }
        }
      }
    });

    if (!semanaAtual?.simulado) return null;

    const simulado = semanaAtual.simulado;
    const meuResultado = simulado.resultados[0] ?? null;

    if (!meuResultado) {
      // Simulado existe mas sem resultado registrado — retorna estrutura vazia
      return {
        simuladoId: simulado.id,
        nomeSimulado: simulado.nome,
        totalQuestoes: simulado.config?.totalQuestoes ?? 0,
        totalAcertos: 0,
        percentualGeral: 0,
        disciplinas: (simulado.config?.disciplinas ?? []).map(d => ({
          disciplinaId: d.disciplinaId,
          nome: d.disciplina.nome,
          cor: d.disciplina.cor,
          totalQuestoes: d.totalQuestoes,
          acertos: 0,
          percentual: 0
        }))
      };
    }

    return {
      simuladoId: simulado.id,
      nomeSimulado: simulado.nome,
      totalQuestoes: meuResultado.totalQuestoes,
      totalAcertos: meuResultado.totalAcertos,
      percentualGeral: meuResultado.percentualGeral,
      disciplinas: meuResultado.disciplinas.map(d => ({
        disciplinaId: d.disciplinaId,
        nome: d.disciplina.nome,
        cor: d.disciplina.cor,
        totalQuestoes: d.totalQuestoes,
        acertos: d.acertos,
        percentual: d.percentual
      }))
    };

  } catch (error) {
    console.error('Erro ao buscar resultado do simulado:', error);
    return null;
  }
}
