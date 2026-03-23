"use server";

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export interface DisciplinaDiaPlanejada {
  id: string;
  nome: string;
  cor: string | null;
  minutosPlanejados: number;
  questoesPlanejadas: number;
}

export interface DiaPlanejado {
  diaId: string;
  data: Date;
  disciplinas: DisciplinaDiaPlanejada[];
}

export interface CicloPlanejado {
  dias: DiaPlanejado[];
  nomeCiclo: string;
  dataInicio: Date;
  dataFim: Date;
}

export async function getCicloPlanejado(data?: Date | string, semanaId?: string): Promise<CicloPlanejado | null> {
  try {
    const { userId } = await requireAuth();

    let baseDate: Date;
    if (typeof data === 'string') {
      const [y, m, d] = data.split('-').map(Number);
      baseDate = new Date(Date.UTC(y, m - 1, d));
    } else if (data) {
      baseDate = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
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

    if (!planoAtivo) return null;

    const semanaAtual = await prisma.semanaEstudo.findFirst({
      where: semanaId
        ? { id: semanaId, planoId: planoAtivo.id }
        : { planoId: planoAtivo.id, dataInicio: { lt: tomorrowUTC }, dataFim: { gte: baseDate } },
      include: {
        disciplinas: {
          include: {
            dias: true,
            disciplina: { select: { id: true, nome: true, cor: true } }
          }
        }
      }
    });

    if (!semanaAtual) return null;

    // Build ordered list of days in the cycle
    const inicioNorm = new Date(Date.UTC(
      semanaAtual.dataInicio.getUTCFullYear(),
      semanaAtual.dataInicio.getUTCMonth(),
      semanaAtual.dataInicio.getUTCDate()
    ));
    const fimNorm = new Date(Date.UTC(
      semanaAtual.dataFim.getUTCFullYear(),
      semanaAtual.dataFim.getUTCMonth(),
      semanaAtual.dataFim.getUTCDate()
    ));

    const diasDoCiclo: DiaPlanejado[] = [];
    const current = new Date(inicioNorm);
    let i = 1;
    while (current <= fimNorm && i <= 7) {
      diasDoCiclo.push({
        diaId: `dia${i}`,
        data: new Date(current),
        disciplinas: []
      });
      current.setUTCDate(current.getUTCDate() + 1);
      i++;
    }

    if (planoAtivo.userId === null) {
      // Plano compartilhado
      const planoUsuario = await prisma.planoEstudoUsuario.findUnique({
        where: { planoId_userId: { planoId: planoAtivo.id, userId } }
      });
      if (!planoUsuario) return null;

      const [progressos, extras] = await Promise.all([
        prisma.progressoUsuarioDisciplina.findMany({
          where: {
            planoUsuarioId: planoUsuario.id,
            removida: false,
            disciplinaSemana: { semanaId: semanaAtual.id }
          },
          include: {
            disciplinaSemana: {
              include: { disciplina: { select: { id: true, nome: true, cor: true } } }
            },
            dias: true
          }
        }),
        prisma.progressoUsuarioDisciplinaExtra.findMany({
          where: { planoUsuarioId: planoUsuario.id, semanaId: semanaAtual.id },
          include: { disciplina: { select: { id: true, nome: true, cor: true } } }
        })
      ]);

      progressos.forEach(p => {
        if (!p.diasEstudo) return;
        const diasAtivos = p.diasEstudo.split(',').map((d: string) => d.trim()).filter(Boolean);

        diasAtivos.forEach(diaId => {
          const diaPlanejado = diasDoCiclo.find(d => d.diaId === diaId);
          if (!diaPlanejado) return;

          const diaRec = p.dias.find(d => d.dia === diaId);
          const minutos = diaRec?.minutosPlanejados ?? p.disciplinaSemana.minutosPlanejados;
          const questoes = diaRec?.questoesPlanejadas ?? p.disciplinaSemana.questoesPlanejadas;

          if (minutos > 0 || questoes > 0) {
            diaPlanejado.disciplinas.push({
              id: p.disciplinaSemana.disciplinaId,
              nome: p.disciplinaSemana.disciplina.nome,
              cor: p.disciplinaSemana.disciplina.cor,
              minutosPlanejados: Math.round(minutos),
              questoesPlanejadas: questoes
            });
          }
        });
      });

      extras.forEach(e => {
        const diaPlanejado = diasDoCiclo.find(d => d.diaId === e.dia);
        if (!diaPlanejado) return;
        if (e.minutosPlanejados > 0 || e.questoesPlanejadas > 0) {
          diaPlanejado.disciplinas.push({
            id: e.disciplinaId,
            nome: e.disciplina.nome,
            cor: e.disciplina.cor,
            minutosPlanejados: e.minutosPlanejados,
            questoesPlanejadas: e.questoesPlanejadas
          });
        }
      });

    } else {
      // Plano pessoal
      semanaAtual.disciplinas.forEach(ds => {
        ds.dias.forEach(dia => {
          if (dia.minutosPlanejados <= 0 && dia.questoesPlanejadas <= 0) return;
          const diaPlanejado = diasDoCiclo.find(d => d.diaId === dia.dia);
          if (!diaPlanejado) return;
          diaPlanejado.disciplinas.push({
            id: ds.disciplinaId,
            nome: ds.disciplina.nome,
            cor: ds.disciplina.cor,
            minutosPlanejados: Math.round(dia.minutosPlanejados),
            questoesPlanejadas: dia.questoesPlanejadas
          });
        });
      });
    }

    return {
      dias: diasDoCiclo,
      nomeCiclo: `Ciclo ${semanaAtual.numeroSemana || 1}`,
      dataInicio: semanaAtual.dataInicio,
      dataFim: semanaAtual.dataFim
    };

  } catch (error) {
    console.error('Erro ao buscar ciclo planejado:', error);
    return null;
  }
}
