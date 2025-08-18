import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const resolvedParams = await params;
    const materialId = resolvedParams.materialId;
    console.log('🔍 Buscando questões para material:', materialId);

    // Primeiro, vamos verificar se existem sessões para este material
    const sessoes = await prisma.sessaoQuestoes.findMany({
      where: {
        materialId: materialId,
      },
      include: {
        questoes: {
          orderBy: { ordem: 'asc' }
        }
      }
    });

    console.log('📊 Sessões encontradas:', sessoes.length);

    // Flatten todas as questões de todas as sessões
    const todasQuestoes = sessoes.flatMap(sessao => 
      sessao.questoes.map(questao => ({
        ...questao,
        sessao: {
          titulo: sessao.titulo,
          descricao: sessao.descricao
        }
      }))
    );

    console.log('📊 Total de questões encontradas:', todasQuestoes.length);
    return NextResponse.json(todasQuestoes);
  } catch (error) {
    console.error('❌ Erro ao buscar questões:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar questões', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
} 