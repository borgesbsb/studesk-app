"use server";

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export interface ProgressoCiclo {
  horasRealizadas: number;
  minutosPlanejados: number;
  questoesRealizadas: number;
  questoesPlanejadas: number;
  nomeCiclo: string;
  dataInicio: Date;
  dataFim: Date;
}

export async function getProgressoCiclo(data?: Date | string): Promise<ProgressoCiclo | null> {
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

    // Buscar o plano ativo que contém o dia consultado
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

    if (!planoAtivo) {
      return null;
    }

    // Buscar a semana (ciclo) que contém o dia consultado
    const semanaAtual = await prisma.semanaEstudo.findFirst({
      where: {
        planoId: planoAtivo.id,
        dataInicio: { lt: tomorrowUTC },
        dataFim: { gte: baseDate }
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

    // ── PLANO COMPARTILHADO ────────────────────────────────────────────────────
    if (planoAtivo.userId === null) {
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
            disciplinaSemana: true,
            dias: true
          }
        }),
        prisma.progressoUsuarioDisciplinaExtra.findMany({
          where: { planoUsuarioId: planoUsuario.id, semanaId: semanaAtual.id }
        })
      ]);

      let horasRealizadasTotal = 0;
      let minutosPlanejadosTotal = 0;
      let questoesRealizadasTotal = 0;
      let questoesPlanejadasTotal = 0;

      progressos.forEach(p => {
        const diasDoUsuario = p.diasEstudo
          ? p.diasEstudo.split(',').map((d: string) => d.trim()).filter(Boolean)
          : [];
        p.dias.forEach(d => {
          horasRealizadasTotal += d.horasRealizadas;
          questoesRealizadasTotal += d.questoesRealizadas;
          // planejadas só contam se o dia está no ciclo configurado pelo usuário
          if (diasDoUsuario.includes(d.dia)) {
            minutosPlanejadosTotal += d.minutosPlanejados;
            questoesPlanejadasTotal += d.questoesPlanejadas;
          }
        });
      });

      extras.forEach(e => {
        minutosPlanejadosTotal += e.minutosPlanejados;
        horasRealizadasTotal += e.horasRealizadas / 60;
        questoesPlanejadasTotal += e.questoesPlanejadas;
        questoesRealizadasTotal += e.questoesRealizadas;
      });

      return {
        horasRealizadas: Math.round(horasRealizadasTotal * 100) / 100,
        minutosPlanejados: Math.round(minutosPlanejadosTotal * 100) / 100,
        questoesRealizadas: questoesRealizadasTotal,
        questoesPlanejadas: questoesPlanejadasTotal,
        nomeCiclo: `Ciclo ${semanaAtual.numeroSemana || 1}`,
        dataInicio: semanaAtual.dataInicio,
        dataFim: semanaAtual.dataFim
      };
    }
    // ── PLANO PESSOAL ─────────────────────────────────────────────────────────

    // Calcular totais do ciclo somando todos os DisciplinaDia
    let horasRealizadasTotal = 0;
    let minutosPlanejadosTotal = 0;
    let questoesRealizadasTotal = 0;
    let questoesPlanejadasTotal = 0;

    semanaAtual.disciplinas.forEach(disciplinaSemana => {
      // Somar horas e questões de todos os dias dessa disciplina
      disciplinaSemana.dias.forEach(disciplinaDia => {
        horasRealizadasTotal += disciplinaDia.horasRealizadas;
        minutosPlanejadosTotal += disciplinaDia.minutosPlanejados;
        questoesRealizadasTotal += disciplinaDia.questoesRealizadas;
        questoesPlanejadasTotal += disciplinaDia.questoesPlanejadas;
      });
    });

    return {
      horasRealizadas: Math.round(horasRealizadasTotal * 100) / 100,
      minutosPlanejados: Math.round(minutosPlanejadosTotal * 100) / 100,
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
