import { NextRequest, NextResponse } from 'next/server'
// import { getServerSession } from 'next-auth'  // COMENTADO PARA POC
// import { authOptions } from '@/lib/auth'  // COMENTADO PARA POC
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { materialId: string } }
) {
  try {
    // Autenticação DESABILITADA TEMPORARIAMENTE PARA POC
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json(
    //     { error: 'Não autorizado' },
    //     { status: 401 }
    //   )
    // }

    const { materialId } = await params

    if (!materialId) {
      return NextResponse.json(
        { error: 'materialId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar material e seu texto processado (SEM verificação de userId para POC)
    const material = await prisma.materialEstudo.findFirst({
      where: {
        id: materialId,
        // userId: session.user.id,  // COMENTADO PARA POC
      },
      include: {
        mobileText: true,
      },
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404 }
      )
    }

    // Se não tem texto processado ainda, retornar status inicial
    if (!material.mobileText) {
      return NextResponse.json({
        success: true,
        status: {
          totalPages: material.totalPaginas || 0,
          processedPages: 0,
          lastProcessedPage: 0,
          processingStatus: 'pending',
          progress: 0,
          hasStarted: false,
        },
      })
    }

    const mobileText = material.mobileText

    // Calcular progresso
    const progress = mobileText.totalPages > 0
      ? Math.round((mobileText.processedPages / mobileText.totalPages) * 100)
      : 0

    return NextResponse.json({
      success: true,
      status: {
        totalPages: mobileText.totalPages,
        processedPages: mobileText.processedPages,
        lastProcessedPage: mobileText.lastProcessedPage,
        processingStatus: mobileText.processingStatus,
        processingError: mobileText.processingError,
        progress,
        hasStarted: mobileText.processedPages > 0,
        isComplete: mobileText.processingStatus === 'complete',
        hasError: mobileText.processingStatus === 'error',
        processedAt: mobileText.processedAt,
        updatedAt: mobileText.updatedAt,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar status de processamento:', error)
    return NextResponse.json(
      {
        error: 'Erro ao buscar status de processamento',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
