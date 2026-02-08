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

    // Buscar o plano ativo
    const planoAtivo = await prisma.planoEstudo.findFirst({
      where: { userId, ativo: true },
      include: {
        semanas: {
          include: {
            disciplinas: {
              include: {
                dias: true,
              },
            },
          },
          orderBy: { dataInicio: "asc" },
        },
      },
    });

    if (!planoAtivo) return [];

    // Agregar horas realizadas por data real
    const mapaHoras = new Map<string, number>();

    // 1. Horas do plano de estudo
    for (const semana of planoAtivo.semanas) {
      const inicio = new Date(semana.dataInicio);
      inicio.setHours(0, 0, 0, 0);

      for (const disciplina of semana.disciplinas) {
        for (const dia of disciplina.dias) {
          // Extrair número do dia: "dia1" -> 0, "dia2" -> 1, etc.
          const numDia = parseInt(dia.dia.replace("dia", "")) - 1;
          const dataDia = new Date(inicio);
          dataDia.setDate(dataDia.getDate() + numDia);
          const chave = dataDia.toISOString().split("T")[0];

          const atual = mapaHoras.get(chave) || 0;
          mapaHoras.set(chave, atual + dia.horasRealizadas);
        }
      }
    }

    // 2. Adicionar tempo de leitura de PDFs (HistoricoLeitura)
    const historicoLeitura = await prisma.historicoLeitura.findMany({
      where: {
        material: { userId },
      },
      select: {
        dataLeitura: true,
        tempoLeituraSegundos: true,
      },
    });

    for (const leitura of historicoLeitura) {
      const chave = new Date(leitura.dataLeitura).toISOString().split("T")[0];
      const horasLeitura = leitura.tempoLeituraSegundos / 3600; // Converter segundos para horas
      const atual = mapaHoras.get(chave) || 0;
      mapaHoras.set(chave, atual + horasLeitura);
    }

    // Converter para array
    return Array.from(mapaHoras.entries())
      .map(([data, horas]) => ({ data, horas }))
      .sort((a, b) => a.data.localeCompare(b.data));
  } catch (error) {
    console.error("Erro ao buscar contribuições:", error);
    return [];
  }
}
