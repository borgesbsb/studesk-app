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

export async function getEvolucaoCiclo(data?: Date): Promise<EvolucaoCiclo | null> {
  try {
    const { userId } = await requireAuth();
    const diaConsultado = data || new Date();

    // Buscar o plano ativo que contém o dia consultado
    const planoAtivo = await prisma.planoEstudo.findFirst({
      where: {
        ativo: true,
        OR: [
          { userId },
          { userId: null, usuarios: { some: { userId } } }
        ],
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
    // Normalizar a data para comparação (apenas data, sem horas)
    const diaParaComparacao = new Date(diaConsultado);
    diaParaComparacao.setHours(0, 0, 0, 0);

    // Buscar todas as semanas do plano
    const todasSemanas = await prisma.semanaEstudo.findMany({
      where: {
        planoId: planoAtivo.id
      },
      include: {
        disciplinas: {
          include: {
            dias: true,
            disciplina: { select: { id: true, nome: true, cor: true } }
          }
        }
      }
    });

    // Encontrar a semana que contém o dia consultado
    const semanaAtual = todasSemanas.find(semana => {
      const inicio = new Date(semana.dataInicio);
      inicio.setHours(0, 0, 0, 0);
      const fim = new Date(semana.dataFim);
      fim.setHours(23, 59, 59, 999);

      return diaParaComparacao >= inicio && diaParaComparacao <= fim;
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

      // Montar mapa de dias
      const inicioNorm = new Date(semanaAtual.dataInicio);
      inicioNorm.setHours(0, 0, 0, 0);
      const diaConsNorm = new Date(diaConsultado);
      diaConsNorm.setHours(0, 0, 0, 0);
      const diasDecorridos = Math.floor((diaConsNorm.getTime() - inicioNorm.getTime()) / (1000 * 60 * 60 * 24)) + 1;

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

      // Admin progressos: distribui planejadas pelos dias de estudo; realizadas por ProgressoUsuarioDisciplinaDia
      progressos.forEach(p => {
        // Usa os valores por dia de ProgressoUsuarioDisciplinaDia quando disponíveis;
        // distribui proporcionalmente como fallback
        const diasComMetas = p.dias.filter(d => d.minutosPlanejados > 0 || d.questoesPlanejadas > 0)
        if (diasComMetas.length > 0) {
          p.dias.forEach(d => {
            const entry = diasMapShared.get(d.dia)
            if (entry) {
              entry.minutosPlanejados += d.minutosPlanejados
              entry.questoesPlanejadas += d.questoesPlanejadas
              entry.horasRealizadas += d.horasRealizadas
              entry.questoesRealizadas += d.questoesRealizadas
            }
          })
        } else {
          // Fallback: distribui pelo diasEstudo
          const diasEstudo = p.diasEstudo
            ? p.diasEstudo.split(',').map(d => d.trim()).filter(Boolean)
            : []
          const numDias = diasEstudo.length || 1
          diasEstudo.forEach(diaId => {
            const entry = diasMapShared.get(diaId)
            if (entry) {
              entry.minutosPlanejados += p.disciplinaSemana.minutosPlanejados / numDias
              entry.questoesPlanejadas += p.disciplinaSemana.questoesPlanejadas / numDias
            }
          })
          p.dias.forEach(d => {
            const entry = diasMapShared.get(d.dia)
            if (entry) {
              entry.horasRealizadas += d.horasRealizadas
              entry.questoesRealizadas += d.questoesRealizadas
            }
          })
        }
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

    // Calcular quantos dias se passaram desde o início do ciclo até a data consultada
    const inicioNormalizado = new Date(semanaAtual.dataInicio);
    inicioNormalizado.setHours(0, 0, 0, 0);
    const diaConsultadoNormalizado = new Date(diaConsultado);
    diaConsultadoNormalizado.setHours(0, 0, 0, 0);

    const diffTime = diaConsultadoNormalizado.getTime() - inicioNormalizado.getTime();
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
