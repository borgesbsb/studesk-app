"use server";

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export interface DiaEvolucao {
  dia: string; // "dia1", "dia2", etc.
  data: Date;
  minutosPlanejados: number;
  horasRealizadas: number;
  questoesPlanejadas: number;
  questoesRealizadas: number;
}

export interface DisciplinaCiclo {
  id: string;
  nome: string;
  cor?: string;
  minutosPlanejados: number;
  horasRealizadas: number;
  questoesPlanejadas: number;
  questoesRealizadas: number;
}

export interface EvolucaoCiclo {
  dias: DiaEvolucao[];
  disciplinas: DisciplinaCiclo[];
  nomeCiclo: string;
  dataInicio: Date;
  dataFim: Date;
}

export async function getEvolucaoCiclo(data?: Date | string, semanaId?: string): Promise<EvolucaoCiclo | null> {
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

    // Buscar a semana (ciclo) — por semanaId direto ou pelo ciclo que contém hoje
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
            disciplinaSemana: {
              include: {
                disciplina: { select: { id: true, nome: true, cor: true } }
              }
            },
            dias: true
          }
        }),
        prisma.progressoUsuarioDisciplinaExtra.findMany({
          where: { planoUsuarioId: planoUsuario.id, semanaId: semanaAtual.id },
          include: { disciplina: { select: { id: true, nome: true, cor: true } } }
        })
      ]);

      // Montar mapa de dias (usar UTC puro para evitar bug de timezone)
      const inicioNorm = new Date(Date.UTC(
        semanaAtual.dataInicio.getUTCFullYear(),
        semanaAtual.dataInicio.getUTCMonth(),
        semanaAtual.dataInicio.getUTCDate()
      ));
      const diasDecorridos = Math.floor((baseDate.getTime() - inicioNorm.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const diasMapShared = new Map<string, DiaEvolucao>();
      for (let i = 0; i < diasDecorridos; i++) {
        const diaId = `dia${i + 1}`;
        const dataDia = new Date(inicioNorm);
        dataDia.setDate(dataDia.getDate() + i);
        diasMapShared.set(diaId, {
          dia: diaId,
          data: dataDia,
          minutosPlanejados: 0,
          horasRealizadas: 0,
          questoesPlanejadas: 0,
          questoesRealizadas: 0
        });
      }

      // Apenas disciplinas que o usuário incluiu no ciclo (diasEstudo preenchido)
      progressos.forEach(p => {
        const diasDoUsuario = p.diasEstudo
          ? p.diasEstudo.split(',').map((d: string) => d.trim()).filter(Boolean)
          : []

        // Disciplina não está no ciclo do usuário: ignora planejadas, contabiliza só realizadas
        if (diasDoUsuario.length === 0) {
          p.dias.forEach(d => {
            const entry = diasMapShared.get(d.dia)
            if (entry) {
              entry.horasRealizadas += d.horasRealizadas
              entry.questoesRealizadas += d.questoesRealizadas
            }
          })
          return
        }

        // Disciplina está no ciclo: usa dados de ProgressoUsuarioDisciplinaDia
        // mas somente para dias que o usuário efetivamente marcou em diasEstudo
        p.dias.forEach(d => {
          if (!diasDoUsuario.includes(d.dia)) {
            // dia tem registro mas não está no ciclo configurado — ignora planejadas
            const entry = diasMapShared.get(d.dia)
            if (entry) {
              entry.horasRealizadas += d.horasRealizadas
              entry.questoesRealizadas += d.questoesRealizadas
            }
            return
          }
          const entry = diasMapShared.get(d.dia)
          if (entry) {
            entry.minutosPlanejados += d.minutosPlanejados
            entry.questoesPlanejadas += d.questoesPlanejadas
            entry.horasRealizadas += d.horasRealizadas
            entry.questoesRealizadas += d.questoesRealizadas
          }
        })
      });

      // Extras: cada registro tem dia e valores corretos por dia
      extras.forEach(e => {
        const entry = diasMapShared.get(e.dia);
        if (entry) {
          entry.minutosPlanejados += e.minutosPlanejados;
          entry.questoesPlanejadas += e.questoesPlanejadas;
          entry.horasRealizadas += e.horasRealizadas / 60;
          entry.questoesRealizadas += e.questoesRealizadas;
        }
      });

      const diasShared = Array.from(diasMapShared.values()).sort((a, b) => parseInt(a.dia.replace('dia', '')) - parseInt(b.dia.replace('dia', '')));

      const disciplinasDeProgressos: DisciplinaCiclo[] = progressos.map(p => ({
        id: p.disciplinaSemana.disciplina.id,
        nome: p.disciplinaSemana.disciplina.nome,
        cor: p.disciplinaSemana.disciplina.cor || undefined,
        minutosPlanejados: p.disciplinaSemana.minutosPlanejados,
        horasRealizadas: p.dias.reduce((acc, d) => acc + d.horasRealizadas, 0),
        questoesPlanejadas: p.disciplinaSemana.questoesPlanejadas,
        questoesRealizadas: p.dias.reduce((acc, d) => acc + d.questoesRealizadas, 0),
      }));

      const disciplinasDeExtras: DisciplinaCiclo[] = extras.map(e => ({
        id: e.disciplina.id,
        nome: e.disciplina.nome,
        cor: e.disciplina.cor || undefined,
        minutosPlanejados: e.minutosPlanejados,
        horasRealizadas: Math.round((e.horasRealizadas / 60) * 100) / 100,
        questoesPlanejadas: e.questoesPlanejadas,
        questoesRealizadas: e.questoesRealizadas,
      }));

      return {
        dias: diasShared,
        disciplinas: [...disciplinasDeProgressos, ...disciplinasDeExtras],
        nomeCiclo: `Ciclo ${semanaAtual.numeroSemana || 1}`,
        dataInicio: semanaAtual.dataInicio,
        dataFim: semanaAtual.dataFim
      };
    }
    // ── PLANO PESSOAL ─────────────────────────────────────────────────────────

    // Calcular quantos dias se passaram desde o início do ciclo (UTC puro)
    const inicioNormalizado = new Date(Date.UTC(
      semanaAtual.dataInicio.getUTCFullYear(),
      semanaAtual.dataInicio.getUTCMonth(),
      semanaAtual.dataInicio.getUTCDate()
    ));

    const diffTime = baseDate.getTime() - inicioNormalizado.getTime();
    const diasDecorridos = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o dia atual

    // Criar array de dias com dados agregados
    const diasMap = new Map<string, DiaEvolucao>();

    // Para cada dia decorrido
    for (let i = 0; i < diasDecorridos; i++) {
      const diaId = `dia${i + 1}`;
      const dataDia = new Date(inicioNormalizado);
      dataDia.setDate(dataDia.getDate() + i);

      diasMap.set(diaId, {
        dia: diaId,
        data: dataDia,
        minutosPlanejados: 0,
        horasRealizadas: 0,
        questoesPlanejadas: 0,
        questoesRealizadas: 0,
      });
    }

    // Agregar dados de todas as disciplinas por dia
    semanaAtual.disciplinas.forEach(disciplinaSemana => {
      disciplinaSemana.dias.forEach(disciplinaDia => {
        const diaData = diasMap.get(disciplinaDia.dia);
        if (diaData) {
          diaData.minutosPlanejados += disciplinaDia.minutosPlanejados;
          diaData.horasRealizadas += disciplinaDia.horasRealizadas;
          diaData.questoesPlanejadas += disciplinaDia.questoesPlanejadas;
          diaData.questoesRealizadas += disciplinaDia.questoesRealizadas;
        }
      });
    });

    // Converter map para array ordenado
    const dias = Array.from(diasMap.values()).sort((a, b) => {
      const numA = parseInt(a.dia.replace('dia', ''));
      const numB = parseInt(b.dia.replace('dia', ''));
      return numA - numB;
    });

    // Agregar disciplinas do ciclo
    const disciplinas: DisciplinaCiclo[] = semanaAtual.disciplinas.map(ds => ({
      id: ds.disciplina.id,
      nome: ds.disciplina.nome,
      cor: ds.disciplina.cor || undefined,
      minutosPlanejados: ds.minutosPlanejados,
      horasRealizadas: ds.horasRealizadas,
      questoesPlanejadas: ds.questoesPlanejadas,
      questoesRealizadas: ds.questoesRealizadas,
    }));

    return {
      dias,
      disciplinas,
      nomeCiclo: `Ciclo ${semanaAtual.numeroSemana || 1}`,
      dataInicio: semanaAtual.dataInicio,
      dataFim: semanaAtual.dataFim
    };

  } catch (error) {
    console.error('Erro ao buscar evolução do ciclo:', error);
    return null;
  }
}
