"use server";

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export interface MaterialAcessadoRecente {
  id: string;
  nome: string;
  tipo: 'PDF' | 'VIDEO';
  ultimoAcesso: Date;
  ultimaPagina?: number;
  totalPaginas?: number;
  percentualProgresso: number;
  tempoTotalSegundos: number;
}

export async function getUltimosMaterialAcessados(disciplinaId?: string, limit: number = 10): Promise<MaterialAcessadoRecente[]> {
  try {
    const { userId } = await requireAuth();

    console.log('🔍 [ULTIMOS ACESSOS] Buscando últimos materiais acessados para userId:', userId, 'disciplinaId:', disciplinaId);

    // Buscar os últimos registros de leitura, agrupados por material
    const ultimosAcessos = await prisma.historicoLeitura.findMany({
      where: {
        material: {
          userId,
          // Se disciplinaId foi fornecido, filtrar apenas materiais desta disciplina
          ...(disciplinaId && {
            disciplinas: {
              some: {
                disciplinaId
              }
            }
          })
        }
      },
      include: {
        material: true
      },
      orderBy: {
        dataLeitura: 'desc'
      },
      take: 100 // Pegar mais para depois agrupar
    });

    console.log('🔍 [ULTIMOS ACESSOS] Total de registros encontrados:', ultimosAcessos.length);

    // Agrupar por material e pegar apenas o mais recente de cada
    const materiaisMap = new Map<string, typeof ultimosAcessos[0]>();

    for (const acesso of ultimosAcessos) {
      if (!materiaisMap.has(acesso.materialId)) {
        materiaisMap.set(acesso.materialId, acesso);
      }
    }

    // Pegar apenas os N mais recentes
    const materiaisUnicos = Array.from(materiaisMap.values())
      .sort((a, b) => b.dataLeitura.getTime() - a.dataLeitura.getTime())
      .slice(0, limit);

    console.log('🔍 [ULTIMOS ACESSOS] Materiais únicos após agrupamento:', materiaisUnicos.length);

    // Para cada material, calcular o tempo total estudado
    const materiaisComTempo = await Promise.all(
      materiaisUnicos.map(async (acesso) => {
        const material = acesso.material;

        // Calcular tempo total de todas as sessões
        const historicoCompleto = await prisma.historicoLeitura.findMany({
          where: {
            materialId: material.id
          },
          select: {
            tempoLeituraSegundos: true
          }
        });

        const tempoTotalSegundos = historicoCompleto.reduce(
          (sum, h) => sum + h.tempoLeituraSegundos,
          0
        );

        const tipo = material.arquivoVideoUrl || material.googleDriveFileId ? 'VIDEO' : 'PDF';

        let percentualProgresso = 0;
        if (tipo === 'PDF' && material.totalPaginas > 0) {
          percentualProgresso = Math.round((acesso.paginaAtual / material.totalPaginas) * 100);
        } else if (tipo === 'VIDEO' && material.duracaoSegundos && material.duracaoSegundos > 0) {
          percentualProgresso = Math.round(((material.tempoAssistido || 0) / material.duracaoSegundos) * 100);
        }

        return {
          id: material.id,
          nome: material.nome,
          tipo,
          ultimoAcesso: acesso.dataLeitura,
          ultimaPagina: tipo === 'PDF' ? acesso.paginaAtual : undefined,
          totalPaginas: tipo === 'PDF' ? material.totalPaginas : undefined,
          percentualProgresso,
          tempoTotalSegundos
        };
      })
    );

    console.log('🔍 [ULTIMOS ACESSOS] Materiais processados:', materiaisComTempo.length);
    console.log('🔍 [ULTIMOS ACESSOS] Materiais:', materiaisComTempo.map(m => ({
      nome: m.nome,
      tipo: m.tipo,
      ultimoAcesso: m.ultimoAcesso.toISOString()
    })));

    return materiaisComTempo;
  } catch (error) {
    console.error('❌ [ULTIMOS ACESSOS] Erro ao buscar últimos materiais acessados:');
    console.error('❌ [ULTIMOS ACESSOS] Error details:', JSON.stringify(error, null, 2));
    if (error instanceof Error) {
      console.error('❌ [ULTIMOS ACESSOS] Message:', error.message);
      console.error('❌ [ULTIMOS ACESSOS] Stack:', error.stack);
    }
    return [];
  }
}
