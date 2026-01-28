"use server";

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export interface MaterialComProgresso {
  id: string;
  nome: string;
  tipo: 'PDF' | 'VIDEO';
  temProgresso: boolean;
  ultimaPagina?: number;
  totalPaginas?: number;
  percentualProgresso: number;
  urlMaterial: string;
}

export async function getMateriaisDisciplina(disciplinaId: string): Promise<MaterialComProgresso[]> {
  try {
    const { userId } = await requireAuth();

    console.log('🔍 [GET MATERIAIS] Buscando materiais para disciplina:', { disciplinaId, userId });

    // Buscar materiais da disciplina via DisciplinaMaterial
    const disciplinaMateriais = await prisma.disciplinaMaterial.findMany({
      where: {
        disciplinaId,
        disciplina: {
          userId
        }
      },
      include: {
        material: {
          include: {
            historicoLeitura: {
              orderBy: {
                dataLeitura: 'desc'
              },
              take: 1
            }
          }
        }
      }
    });

    console.log('🔍 [GET MATERIAIS] Vínculos DisciplinaMaterial encontrados:', disciplinaMateriais.length);

    const materiais: MaterialComProgresso[] = [];

    // Se não houver vínculos em DisciplinaMaterial, buscar todos os materiais do usuário
    if (disciplinaMateriais.length === 0) {
      console.log('⚠️ [GET MATERIAIS] Nenhum vínculo encontrado, buscando todos os materiais do usuário');

      const todosMateriais = await prisma.materialEstudo.findMany({
        where: {
          userId
        },
        include: {
          historicoLeitura: {
            orderBy: {
              dataLeitura: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      console.log('🔍 [GET MATERIAIS] Total de materiais do usuário:', todosMateriais.length);

      for (const material of todosMateriais) {
        const historicoMaisRecente = material.historicoLeitura[0];

        // Determinar o tipo baseado na URL
        const tipo = material.arquivoVideoUrl || material.googleDriveFileId ? 'VIDEO' : 'PDF';

        let percentualProgresso = 0;
        let temProgresso = false;
        let ultimaPagina = undefined;
        let totalPaginas = undefined;

        if (tipo === 'PDF' && historicoMaisRecente) {
          temProgresso = true;
          ultimaPagina = historicoMaisRecente.paginaAtual;
          totalPaginas = material.totalPaginas || undefined;

          if (totalPaginas && totalPaginas > 0) {
            percentualProgresso = Math.round((ultimaPagina / totalPaginas) * 100);
          }
        } else if (tipo === 'VIDEO') {
          temProgresso = false;
          percentualProgresso = 0;
        }

        materiais.push({
          id: material.id,
          nome: material.nome,
          tipo,
          temProgresso,
          ultimaPagina,
          totalPaginas,
          percentualProgresso,
          urlMaterial: material.id
        });
      }

      // Ordenar: materiais com progresso primeiro, depois por nome
      materiais.sort((a, b) => {
        if (a.temProgresso && !b.temProgresso) return -1;
        if (!a.temProgresso && b.temProgresso) return 1;
        return a.nome.localeCompare(b.nome);
      });

      console.log('🔍 [GET MATERIAIS] Total de materiais processados:', materiais.length);
      console.log('🔍 [GET MATERIAIS] Materiais:', materiais.map(m => ({ nome: m.nome, tipo: m.tipo, temProgresso: m.temProgresso })));

      return materiais;
    }

    for (const dm of disciplinaMateriais) {
      const material = dm.material;
      if (!material) continue;

      const historicoMaisRecente = material.historicoLeitura[0];

      // Determinar o tipo baseado na URL
      const tipo = material.arquivoVideoUrl || material.googleDriveFileId ? 'VIDEO' : 'PDF';

      let percentualProgresso = 0;
      let temProgresso = false;
      let ultimaPagina = undefined;
      let totalPaginas = undefined;

      if (tipo === 'PDF' && historicoMaisRecente) {
        temProgresso = true;
        ultimaPagina = historicoMaisRecente.paginaAtual;
        totalPaginas = material.totalPaginas || undefined;

        if (totalPaginas && totalPaginas > 0) {
          percentualProgresso = Math.round((ultimaPagina / totalPaginas) * 100);
        }
      } else if (tipo === 'VIDEO') {
        // Para vídeos, podemos adicionar lógica de progresso futuramente
        temProgresso = false;
        percentualProgresso = 0;
      }

      materiais.push({
        id: material.id,
        nome: material.nome,
        tipo,
        temProgresso,
        ultimaPagina,
        totalPaginas,
        percentualProgresso,
        urlMaterial: material.id // Usaremos o ID para construir a URL
      });
    }

    console.log('🔍 [GET MATERIAIS] Total de materiais processados:', materiais.length);
    console.log('🔍 [GET MATERIAIS] Materiais:', materiais.map(m => ({ nome: m.nome, tipo: m.tipo, temProgresso: m.temProgresso })));

    // Ordenar: materiais com progresso primeiro, depois por nome
    materiais.sort((a, b) => {
      if (a.temProgresso && !b.temProgresso) return -1;
      if (!a.temProgresso && b.temProgresso) return 1;
      return a.nome.localeCompare(b.nome);
    });

    return materiais;
  } catch (error) {
    console.error('❌ [GET MATERIAIS] Erro ao buscar materiais da disciplina:');
    console.error('❌ [GET MATERIAIS] Error details:', JSON.stringify(error, null, 2));
    if (error instanceof Error) {
      console.error('❌ [GET MATERIAIS] Message:', error.message);
      console.error('❌ [GET MATERIAIS] Stack:', error.stack);
    }
    return [];
  }
}
