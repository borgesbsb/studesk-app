"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export interface ContribuicaoDia {
  data: string; // "YYYY-MM-DD"
  horas: number;
}

export async function getContribuicoesEstudo(): Promise<ContribuicaoDia[]> {
  try {
    const { userId } = await requireAuth();

    const mapaHoras = new Map<string, number>();

    // Helper: converte dataInicio (UTC midnight) + diaId -> chave "YYYY-MM-DD" em UTC
    const diaChave = (dataInicio: Date, diaId: string): string => {
      const num = parseInt(diaId.replace("dia", "")) - 1;
      const inicioUTC = new Date(Date.UTC(
        dataInicio.getUTCFullYear(),
        dataInicio.getUTCMonth(),
        dataInicio.getUTCDate()
      ));
      inicioUTC.setUTCDate(inicioUTC.getUTCDate() + num);
      return inicioUTC.toISOString().split("T")[0];
    };

    // Buscar todos os planos do usuário (pessoais e compartilhados)
    const planos = await prisma.planoEstudo.findMany({
      where: {
        ativo: true,
        OR: [
          { userId },
          { userId: null, usuarios: { some: { userId } } }
        ]
      },
      select: { id: true, userId: true }
    });

    for (const plano of planos) {
      if (plano.userId !== null) {
        // ── PLANO PESSOAL: DisciplinaDia é exclusivo do usuário ─────────────
        const semanas = await prisma.semanaEstudo.findMany({
          where: { planoId: plano.id },
          include: { disciplinas: { include: { dias: true } } },
          orderBy: { dataInicio: "asc" }
        });

        for (const semana of semanas) {
          for (const disciplina of semana.disciplinas) {
            for (const dia of disciplina.dias) {
              if (dia.horasRealizadas === 0) continue;
              const chave = diaChave(semana.dataInicio, dia.dia);
              mapaHoras.set(chave, (mapaHoras.get(chave) || 0) + dia.horasRealizadas);
            }
          }
        }
      } else {
        // ── PLANO COMPARTILHADO: usar ProgressoUsuarioDisciplinaDia (por usuário) ─
        const planoUsuario = await prisma.planoEstudoUsuario.findUnique({
          where: { planoId_userId: { planoId: plano.id, userId } }
        });
        if (!planoUsuario) continue;

        const progressosDias = await prisma.progressoUsuarioDisciplinaDia.findMany({
          where: {
            progresso: {
              planoUsuarioId: planoUsuario.id,
              removida: false
            }
          },
          include: {
            progresso: {
              include: {
                disciplinaSemana: {
                  include: { semana: { select: { dataInicio: true } } }
                }
              }
            }
          }
        });

        for (const pd of progressosDias) {
          if (pd.horasRealizadas === 0) continue;
          const dataInicio = pd.progresso.disciplinaSemana.semana.dataInicio;
          const chave = diaChave(dataInicio, pd.dia);
          mapaHoras.set(chave, (mapaHoras.get(chave) || 0) + pd.horasRealizadas);
        }

        // Extras do pool
        const extras = await prisma.progressoUsuarioDisciplinaExtra.findMany({
          where: { planoUsuarioId: planoUsuario.id },
          include: { semana: { select: { dataInicio: true } } }
        });

        for (const e of extras) {
          if (e.horasRealizadas === 0) continue;
          const chave = diaChave(e.semana.dataInicio, e.dia);
          // extras armazenam em minutos
          mapaHoras.set(chave, (mapaHoras.get(chave) || 0) + e.horasRealizadas / 60);
        }
      }
    }

    // HistoricoLeitura do próprio usuário (PDF e vídeo)
    const historico = await prisma.historicoLeitura.findMany({
      where: { userId },
      select: { dataLeitura: true, tempoLeituraSegundos: true }
    });

    for (const h of historico) {
      const chave = new Date(h.dataLeitura).toISOString().split("T")[0];
      mapaHoras.set(chave, (mapaHoras.get(chave) || 0) + h.tempoLeituraSegundos / 3600);
    }

    return Array.from(mapaHoras.entries())
      .map(([data, horas]) => ({ data, horas }))
      .sort((a, b) => a.data.localeCompare(b.data));
  } catch (error) {
    console.error("Erro ao buscar contribuições:", error);
    return [];
  }
}
