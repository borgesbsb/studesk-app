"use server";

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';

interface AdicionarQuestoesParams {
  disciplinaId: string;
  quantidade: number;
  data?: Date;
}

export async function adicionarQuestoes(params: AdicionarQuestoesParams) {
  try {
    const { userId } = await requireAuth();
    const { disciplinaId, quantidade, data } = params;
    const diaConsultado = data || new Date();

    // Normalizar diaConsultado para UTC midnight (evita bug de timezone com setHours local)
    const todayUTC = new Date(Date.UTC(
      diaConsultado.getUTCFullYear(),
      diaConsultado.getUTCMonth(),
      diaConsultado.getUTCDate()
    ))
    const tomorrowUTC = new Date(Date.UTC(
      diaConsultado.getUTCFullYear(),
      diaConsultado.getUTCMonth(),
      diaConsultado.getUTCDate() + 1
    ))

    // Buscar a semana de estudo ativa para a disciplina do usuário
    const planoAtivo = await prisma.planoEstudo.findFirst({
      where: {
        ativo: true,
        OR: [
          { userId },
          { userId: null, usuarios: { some: { userId } } }
        ],
        dataInicio: { lt: tomorrowUTC },
        dataFim: { gte: todayUTC }
      }
    });

    if (!planoAtivo) {
      throw new Error('Nenhum plano de estudo ativo encontrado');
    }

    // Buscar a semana de estudo usando UTC para evitar bug de timezone
    const semanaEstudo = await prisma.semanaEstudo.findFirst({
      where: {
        planoId: planoAtivo.id,
        dataInicio: { lt: tomorrowUTC },
        dataFim: { gte: todayUTC }
      }
    });

    if (!semanaEstudo) {
      throw new Error('Semana de estudo não encontrada para o período');
    }

    // Calcular qual é o diaId atual (dia1, dia2, etc) usando UTC puro
    const inicioUTC = new Date(Date.UTC(
      semanaEstudo.dataInicio.getUTCFullYear(),
      semanaEstudo.dataInicio.getUTCMonth(),
      semanaEstudo.dataInicio.getUTCDate()
    ))
    const diffTime = todayUTC.getTime() - inicioUTC.getTime();
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

        const diaExistente = await prisma.progressoUsuarioDisciplinaDia.findUnique({
          where: { progressoId_dia: { progressoId: progresso.id, dia: diaIdAtual } }
        });

        if (diaExistente) {
          await prisma.progressoUsuarioDisciplinaDia.update({
            where: { id: diaExistente.id },
            data: { questoesRealizadas: diaExistente.questoesRealizadas + quantidade }
          });
        } else {
          await prisma.progressoUsuarioDisciplinaDia.create({
            data: { progressoId: progresso.id, dia: diaIdAtual, questoesRealizadas: quantidade }
          });
        }
      } else {
        // Disciplina extra do pool
        const extra = await prisma.progressoUsuarioDisciplinaExtra.findUnique({
          where: {
            planoUsuarioId_semanaId_disciplinaId_dia: {
              planoUsuarioId: planoUsuario.id,
              semanaId: semanaEstudo.id,
              disciplinaId,
              dia: diaIdAtual
            }
          }
        });
        if (!extra) throw new Error('Disciplina não encontrada no plano');
        await prisma.progressoUsuarioDisciplinaExtra.update({
          where: { id: extra.id },
          data: { questoesRealizadas: extra.questoesRealizadas + quantidade }
        });
      }

      revalidatePath('/dashboard');
      revalidatePath('/hoje');
      return {
        success: true,
        message: `${quantidade} ${quantidade !== 1 ? 'questões adicionadas' : 'questão adicionada'} com sucesso!`,
        questoesAdicionadas: quantidade
      };
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
          minutosPlanejados: 0,
          horasRealizadas: 0,
          questoesPlanejadas: 0,
          questoesRealizadas: 0
        }
      });
    }

    // Adicionar questões ao total já realizado
    const questoesAnteriores = disciplinaDia.questoesRealizadas || 0;
    const novoTotalQuestoes = questoesAnteriores + quantidade;

    // Atualizar DisciplinaDia
    await prisma.disciplinaDia.update({
      where: {
        id: disciplinaDia.id
      },
      data: {
        questoesRealizadas: novoTotalQuestoes
      }
    });

    // Revalidar o cache das páginas do dashboard
    revalidatePath('/dashboard');
    revalidatePath('/hoje');

    return {
      success: true,
      message: `${quantidade} ${quantidade !== 1 ? 'questões adicionadas' : 'questão adicionada'} com sucesso!`,
      questoesAdicionadas: quantidade
    };

  } catch (error) {
    console.error('❌ Erro ao adicionar questões:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao adicionar questões'
    };
  }
}
