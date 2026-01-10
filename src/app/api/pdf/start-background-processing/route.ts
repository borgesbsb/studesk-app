import { NextRequest, NextResponse } from 'next/server'
import { PdfBackgroundProcessorService } from '@/application/services/pdf-background-processor.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { materialId } = body

    if (!materialId) {
      return NextResponse.json(
        { error: 'materialId é obrigatório' },
        { status: 400 }
      )
    }

    console.log(`🚀 Iniciando processamento em background para material ${materialId}`)

    // Iniciar processamento em background (não aguarda conclusão)
    const processor = new PdfBackgroundProcessorService()

    // Executar em background usando Promise (não bloqueia a resposta)
    processor.processFullPdf(materialId).catch((error) => {
      console.error(`❌ Erro no processamento em background do material ${materialId}:`, error)
    })

    // Retornar imediatamente
    return NextResponse.json({
      success: true,
      message: 'Processamento iniciado em background',
      materialId,
    })
  } catch (error) {
    console.error('Erro ao iniciar processamento em background:', error)
    return NextResponse.json(
      {
        error: 'Erro ao iniciar processamento em background',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
