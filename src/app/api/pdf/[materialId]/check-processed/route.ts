import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    materialId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { materialId } = await params

    if (!materialId) {
      return NextResponse.json(
        { error: 'materialId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar material
    const material = await prisma.materialEstudo.findFirst({
      where: { id: materialId },
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404 }
      )
    }

    // Buscar informações de processamento
    const mobileText = await prisma.pdfMobileText.findUnique({
      where: { materialId },
    })

    // DEBUG: Log do estado atual
    console.log(`🔍 [CHECK] Material ${materialId} (${material.nome}):`)
    if (!mobileText) {
      console.log(`   ⚠️  Nenhum registro PdfMobileText encontrado - processamento não iniciado`)
    } else {
      console.log(`   📊 Status: ${mobileText.processingStatus}`)
      console.log(`   📄 Progresso: ${mobileText.processedPages}/${mobileText.totalPages} páginas`)
      console.log(`   📈 Percentual: ${mobileText.totalPages > 0 ? Math.round((mobileText.processedPages / mobileText.totalPages) * 100) : 0}%`)
      if (mobileText.processingError) {
        console.log(`   ❌ Erro: ${mobileText.processingError}`)
      }
    }

    // Se não existe registro de processamento
    if (!mobileText) {
      return NextResponse.json({
        hasProcessedPages: false,
        processedPages: 0,
        totalPages: 0,
        progress: 0,
        status: 'pending',
        message: 'Processamento ainda não foi iniciado',
      })
    }

    // Retornar status do processamento
    return NextResponse.json({
      hasProcessedPages: mobileText.processedPages > 0,
      processedPages: mobileText.processedPages,
      totalPages: mobileText.totalPages,
      progress: mobileText.totalPages > 0
        ? Math.round((mobileText.processedPages / mobileText.totalPages) * 100)
        : 0,
      status: mobileText.processingStatus,
      lastProcessedPage: mobileText.lastProcessedPage,
      processingError: mobileText.processingError,
    })
  } catch (error) {
    console.error('❌ [CHECK] Erro ao verificar páginas processadas:', error)
    return NextResponse.json(
      {
        error: 'Erro ao verificar páginas processadas',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
