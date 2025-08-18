import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ questaoId: string }> }
) {
  try {
    const resolvedParams = await params;
    const questaoId = resolvedParams.questaoId;

    const questao = await prisma.questao.findUnique({
      where: { id: questaoId },
      include: {
        sessao: {
          select: {
            titulo: true,
            descricao: true,
          },
        },
        _count: {
          select: {
            respostas: true,
            respostasDetalhadas: true,
          },
        },
      },
    });

    if (!questao) {
      return NextResponse.json(
        { error: 'Questão não encontrada' },
        { status: 404 }
      );
    }

    console.log('📊 Questão encontrada:', {
      id: questao.id,
      _count: questao._count
    });
    
    return NextResponse.json(questao);
  } catch (error) {
    console.error('❌ Erro ao buscar questão:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar questão' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ questaoId: string }> }
) {
  try {
    const resolvedParams = await params;
    const questaoId = resolvedParams.questaoId;
    console.log('🗑️ Excluindo questão:', questaoId);

    // Verificar se a questão existe
    const questaoExistente = await prisma.questao.findUnique({
      where: { id: questaoId },
      include: {
        sessao: true,
        respostas: true,
        respostasDetalhadas: true,
      },
    });

    if (!questaoExistente) {
      return NextResponse.json(
        { error: 'Questão não encontrada' },
        { status: 404 }
      );
    }

    // Excluir respostas relacionadas primeiro se existirem
    if (questaoExistente.respostas.length > 0) {
      console.log(`🗑️ Excluindo ${questaoExistente.respostas.length} resposta(s) de usuário`);
      await prisma.respostaUsuario.deleteMany({
        where: { questaoId: questaoId },
      });
    }

    if (questaoExistente.respostasDetalhadas.length > 0) {
      console.log(`🗑️ Excluindo ${questaoExistente.respostasDetalhadas.length} resposta(s) detalhada(s)`);
      await prisma.respostaDetalhada.deleteMany({
        where: { questaoId: questaoId },
      });
    }

    // Excluir a questão
    await prisma.questao.delete({
      where: { id: questaoId },
    });

    // Atualizar o contador de questões da sessão
    await prisma.sessaoQuestoes.update({
      where: { id: questaoExistente.sessaoId },
      data: {
        totalQuestoes: {
          decrement: 1,
        },
      },
    });

    console.log('✅ Questão excluída com sucesso');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao excluir questão:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao excluir questão',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 