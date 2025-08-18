import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const materialId = resolvedParams.id;
    const resultado = await request.json();

    console.log('💾 Salvando resultado para material:', materialId);

    // Encontrar a sessão da primeira questão
    const primeiraQuestao = await prisma.questao.findUnique({
      where: { id: resultado.respostas[0]?.questaoId },
      include: { sessao: true }
    });

    if (!primeiraQuestao) {
      throw new Error('Questão não encontrada');
    }

    // Criar uma sessão realizada
    const sessaoRealizada = await prisma.sessaoRealizada.create({
      data: {
        sessaoQuestoesId: primeiraQuestao.sessaoId,
        totalQuestoes: resultado.totalQuestoes,
        questoesCorretas: resultado.questoesCorretas,
        questoesIncorretas: resultado.questoesIncorretas,
        questoesNaoRespondidas: 0,
        pontuacao: (resultado.questoesCorretas / resultado.totalQuestoes) * 100,
        percentualAcerto: resultado.percentualAcerto,
        tempoTotalSegundos: resultado.tempoTotalSegundos,
        iniciada: true,
        finalizada: true,
      },
    });

    // Salvar respostas detalhadas
    for (let i = 0; i < resultado.respostas.length; i++) {
      const resposta = resultado.respostas[i];
      await prisma.respostaDetalhada.create({
        data: {
          sessaoRealizadaId: sessaoRealizada.id,
          questaoId: resposta.questaoId,
          respostaSelecionada: resposta.resposta,
          correto: resposta.correto,
          tempoSegundos: resposta.tempoSegundos,
          ordem: i + 1,
        },
      });
    }

    // Criar histórico de pontuação
    await prisma.historicoPontuacao.create({
      data: {
        materialId: materialId,
        sessaoRealizadaId: sessaoRealizada.id,
        data: new Date(),
        pontuacao: sessaoRealizada.pontuacao,
        percentualAcerto: sessaoRealizada.percentualAcerto,
        totalQuestoes: resultado.totalQuestoes,
        questoesCorretas: resultado.questoesCorretas,
        tempoTotal: resultado.tempoTotalSegundos,
      },
    });

    console.log('✅ Resultado salvo com sucesso');

    return NextResponse.json({
      success: true,
      sessaoRealizadaId: sessaoRealizada.id,
      ...resultado,
    });
  } catch (error) {
    console.error('❌ Erro ao salvar resultado:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao salvar resultado',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const materialId = resolvedParams.id;

    const historico = await prisma.historicoPontuacao.findMany({
      where: {
        materialId: materialId,
      },
      include: {
        sessaoRealizada: {
          include: {
            respostasDetalhadas: {
              include: {
                questao: true,
              },
              orderBy: {
                ordem: 'asc',
              },
            },
          },
        },
      },
      orderBy: {
        data: 'desc',
      },
      take: 10, // Últimos 10 resultados
    });

    return NextResponse.json(historico);
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar histórico' },
      { status: 500 }
    );
  }
} 