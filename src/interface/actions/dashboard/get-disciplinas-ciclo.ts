"use server";

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export interface DisciplinaCiclo {
  disciplinaId: string;
  nome: string;
  cor: string | null;
  minutosPlanejados: number;
  horasRealizadas: number;
  questoesPlanejadas: number;
  questoesRealizadas: number;
}

export async function getDisciplinasCiclo(data?: Date | string): Promise<DisciplinaCiclo[]> {
  try {
    const { userId } = await requireAuth();

    // Normalizar para UTC midnight (evita bug de timezone com setHours local)
    let baseDate: Date
    if (typeof data === 'string') {
      const [y, m, d] = data.split('-').map(Number)
      baseDate = new Date(Date.UTC(y, m - 1, d))
    } else if (data) {
      baseDate = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()))
    } else {
      const now = new Date()
      baseDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    }
    const tomorrowUTC = new Date(baseDate.getTime() + 86400000)

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

    const semanaAtual = await prisma.semanaEstudo.findFirst({
      where: {
        planoId: planoAtivo.id,
        dataInicio: { lt: tomorrowUTC },
        dataFim: { gte: baseDate }
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

    // ── PLANO COMPARTILHADO ────────────────────────────────────────────────────
    if (planoAtivo.userId === null) {
      const planoUsuario = await prisma.planoEstudoUsuario.findUnique({
        where: { planoId_userId: { planoId: planoAtivo.id, userId } }
      });
      if (!planoUsuario) return [];

      const [progressos, extras] = await Promise.all([
        prisma.progressoUsuarioDisciplina.findMany({
          where: {
            planoUsuarioId: planoUsuario.id,
            removida: false,
            disciplinaSemana: { semanaId: semanaAtual.id }
          },
          include: {
            disciplinaSemana: {
              include: { disciplina: true }
            },
            dias: true
          }
        }),
        prisma.progressoUsuarioDisciplinaExtra.findMany({
          where: { planoUsuarioId: planoUsuario.id, semanaId: semanaAtual.id },
          include: { disciplina: true }
        })
      ]);

      const disciplinasDeProgressos: DisciplinaCiclo[] = progressos.map(p => {
        const ds = p.disciplinaSemana;
        const diasDoUsuario = p.diasEstudo
          ? p.diasEstudo.split(',').map((d: string) => d.trim()).filter(Boolean)
          : [];
        const minutosPlanejados = p.dias.reduce((acc, d) => acc + (diasDoUsuario.includes(d.dia) ? d.minutosPlanejados : 0), 0);
        const questoesPlanejadas = p.dias.reduce((acc, d) => acc + (diasDoUsuario.includes(d.dia) ? d.questoesPlanejadas : 0), 0);
        const horasRealizadas = p.dias.reduce((acc, d) => acc + d.horasRealizadas, 0);
        const questoesRealizadas = p.dias.reduce((acc, d) => acc + d.questoesRealizadas, 0);
        return {
          disciplinaId: ds.disciplinaId,
          nome: ds.disciplina.nome.trim(),
          cor: ds.disciplina.cor,
          minutosPlanejados: Math.round(minutosPlanejados * 100) / 100,
          horasRealizadas: Math.round(horasRealizadas * 100) / 100,
          questoesPlanejadas,
          questoesRealizadas,
        };
      });

      // Agrupar extras por disciplinaId (cada disciplina pode ter um registro por dia)
      const extrasMap = new Map<string, DisciplinaCiclo>()
      for (const e of extras) {
        const existing = extrasMap.get(e.disciplinaId)
        if (existing) {
          existing.minutosPlanejados += e.minutosPlanejados
          existing.horasRealizadas += e.horasRealizadas / 60
          existing.questoesPlanejadas += e.questoesPlanejadas
          existing.questoesRealizadas += e.questoesRealizadas
        } else {
          extrasMap.set(e.disciplinaId, {
            disciplinaId: e.disciplinaId,
            nome: e.disciplina.nome.trim(),
            cor: e.disciplina.cor,
            minutosPlanejados: e.minutosPlanejados,
            horasRealizadas: e.horasRealizadas / 60,
            questoesPlanejadas: e.questoesPlanejadas,
            questoesRealizadas: e.questoesRealizadas,
          })
        }
      }
      const disciplinasDeExtras: DisciplinaCiclo[] = Array.from(extrasMap.values()).map(e => ({
        ...e,
        minutosPlanejados: Math.round(e.minutosPlanejados * 100) / 100,
        horasRealizadas: Math.round(e.horasRealizadas * 100) / 100,
      }))

      return [...disciplinasDeProgressos, ...disciplinasDeExtras];
    }
    // ── PLANO PESSOAL ─────────────────────────────────────────────────────────

    return semanaAtual.disciplinas.map(ds => {
      let minutosPlanejados = 0;
      let horasRealizadas = 0;
      let questoesPlanejadas = 0;
      let questoesRealizadas = 0;

      ds.dias.forEach(dia => {
        minutosPlanejados += dia.minutosPlanejados;
        horasRealizadas += dia.horasRealizadas;
        questoesPlanejadas += dia.questoesPlanejadas;
        questoesRealizadas += dia.questoesRealizadas;
      });

      return {
        disciplinaId: ds.disciplinaId,
        nome: ds.disciplina.nome.trim(),
        cor: ds.disciplina.cor,
        minutosPlanejados: Math.round(minutosPlanejados * 100) / 100,
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
