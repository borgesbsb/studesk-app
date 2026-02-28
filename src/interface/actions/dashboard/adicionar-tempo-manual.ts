"use server";

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';

interface AdicionarTempoManualParams {
  disciplinaId: string;
  horas: number;
  minutos: number;
  data?: Date;
}

export async function adicionarTempoManual(params: AdicionarTempoManualParams) {
  try {
    const { userId } = await requireAuth();
    const { disciplinaId, horas, minutos, data } = params;
    const diaConsultado = data || new Date();

    console.log('🕒 [DEBUG ADICIONAR TEMPO] Params recebidos:', {
      disciplinaId,
      horas,
      minutos,
      dataRecebida: data,
      diaConsultado: diaConsultado.toISOString(),
      userId
    });
    const totalMinutos = (horas * 60) + minutos;

    // Não é necessário ter material para adicionar tempo de estudo
    // O tempo será adicionado diretamente à disciplina na semana de estudo

    // Buscar TODOS os planos ativos para debug
    const todosPlanos = await prisma.planoEstudo.findMany({
      where: {
        ativo: true,
        OR: [
          { userId },
          { userId: null, usuarios: { some: { userId } } }
        ]
      }
    });

    console.log('📋 [DEBUG] Todos os planos ativos:', todosPlanos.map(p => ({
      id: p.id,
      nome: p.nome,
      dataInicio: p.dataInicio.toISOString(),
      dataFim: p.dataFim.toISOString(),
      diaConsultadoEstaDentro: p.dataInicio <= diaConsultado && p.dataFim >= diaConsultado
    })));

    // Buscar a semana de estudo ativa para a disciplina do usuário
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

    console.log('📋 [DEBUG] Plano ativo encontrado:', planoAtivo ? {
      id: planoAtivo.id,
      nome: planoAtivo.nome,
      dataInicio: planoAtivo.dataInicio.toISOString(),
      dataFim: planoAtivo.dataFim.toISOString()
    } : 'NENHUM');

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

    // Calcular qual é o diaId atual (dia1, dia2, etc)
    const inicioNormalizado = new Date(semanaEstudo.dataInicio);
    inicioNormalizado.setHours(0, 0, 0, 0);
    const consultadaNormalizada = new Date(diaConsultado);
    consultadaNormalizada.setHours(0, 0, 0, 0);
    const diffTime = consultadaNormalizada.getTime() - inicioNormalizado.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const diaIdAtual = `dia${diffDays + 1}`;

    // ── PLANO COMPARTILHADO ────────────────────────────────────────────────────
    if (planoAtivo.userId === null) {
      const planoUsuario = await prisma.planoEstudoUsuario.findUnique({
        where: { planoId_userId: { planoId: planoAtivo.id, userId } }
      });
      if (!planoUsuario) throw new Error('Usuário não atribuído ao plano');

      const discSemana = await prisma.disciplinaSemana.findFirst({
        where: { semanaId: semanaEstudo.id, disciplinaId }
      });

      if (discSemana) {
        // Disciplina do admin: registra em ProgressoUsuarioDisciplinaDia
        const progresso = await prisma.progressoUsuarioDisciplina.upsert({
          where: {
            planoUsuarioId_disciplinaSemanaId: {
              planoUsuarioId: planoUsuario.id,
              disciplinaSemanaId: discSemana.id
            }
          },
          update: {},
          create: { planoUsuarioId: planoUsuario.id, disciplinaSemanaId: discSemana.id }
        });

        const horasAdicionadas = totalMinutos / 60;
        const diaExistente = await prisma.progressoUsuarioDisciplinaDia.findUnique({
          where: { progressoId_dia: { progressoId: progresso.id, dia: diaIdAtual } }
        });

        if (diaExistente) {
          await prisma.progressoUsuarioDisciplinaDia.update({
            where: { id: diaExistente.id },
            data: { horasRealizadas: diaExistente.horasRealizadas + horasAdicionadas }
          });
        } else {
          await prisma.progressoUsuarioDisciplinaDia.create({
            data: { progressoId: progresso.id, dia: diaIdAtual, horasRealizadas: horasAdicionadas }
          });
        }
      } else {
        // Disciplina extra do pool: armazena em minutos (Int)
        const extra = await prisma.progressoUsuarioDisciplinaExtra.findUnique({
          where: {
            planoUsuarioId_semanaId_disciplinaId: {
              planoUsuarioId: planoUsuario.id,
              semanaId: semanaEstudo.id,
              disciplinaId
            }
          }
        });
        if (!extra) throw new Error('Disciplina não encontrada no plano');
        await prisma.progressoUsuarioDisciplinaExtra.update({
          where: { id: extra.id },
          data: { horasRealizadas: extra.horasRealizadas + totalMinutos }
        });
      }

      revalidatePath('/dashboard');
      revalidatePath('/hoje');
      return { success: true, message: `${totalMinutos} minutos adicionados com sucesso!`, tempoAdicionado: totalMinutos };
    }
    // ── PLANO PESSOAL ─────────────────────────────────────────────────────────

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

    // Converter minutos para horas (DisciplinaDia armazena em horas)
    const horasAdicionadas = totalMinutos / 60;
    const tempoAnteriorHoras = disciplinaDia.horasRealizadas;
    const novoTempoRealizadoHoras = tempoAnteriorHoras + horasAdicionadas;

    // Atualizar DisciplinaDia (armazena em horas)
    await prisma.disciplinaDia.update({
      where: {
        id: disciplinaDia.id
      },
      data: {
        horasRealizadas: novoTempoRealizadoHoras
      }
    });

    // Revalidar o cache das páginas do dashboard
    revalidatePath('/dashboard');
    revalidatePath('/hoje');

    return {
      success: true,
      message: `${totalMinutos} minutos adicionados ao Tempo Real de Estudo com sucesso!`,
      tempoAdicionado: totalMinutos
    };

  } catch (error) {
    console.error('❌ Erro ao adicionar tempo manual:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao adicionar tempo'
    };
  }
}