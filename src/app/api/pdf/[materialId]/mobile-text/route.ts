import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleCors } from '@/lib/cors'

/**
 * Limpa texto formatado, removendo code blocks malformados
 */
function cleanFormattedText(text: string): string {
  let cleaned = text

  // Remove opening fences (```markdown or ```) that appear at end of lines with content
  cleaned = cleaned.replace(/([^\n])```(markdown|javascript|typescript|python|java|css|html|json|bash|sql|xml)?\n/g, '$1\n')

  // Remove closing fences that appear at start of lines followed by content
  cleaned = cleaned.replace(/\n```([^\n])/g, '\n$1')

  // Remove isolated ``` that appear on lines with other content
  cleaned = cleaned.replace(/^(.+)```$/gm, '$1')
  cleaned = cleaned.replace(/^```(.+)$/gm, '$1')

  // Remove completely empty code blocks
  cleaned = cleaned.replace(/```[\w]*\s*```/g, '')

  // Remove isolated ``` on their own lines (likely remnants of malformed blocks)
  cleaned = cleaned.replace(/^\s*```\s*$/gm, '')

  // Clean up multiple consecutive empty lines (max 2 newlines)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  return cleaned
}

interface RouteParams {
  params: {
    materialId: string
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: handleCors(request) })
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Autenticação DESABILITADA TEMPORARIAMENTE PARA POC
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    // }

    const { materialId } = await params

    if (!materialId) {
      return NextResponse.json(
        { error: 'materialId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar material (SEM verificação de userId para POC)
    const material = await prisma.materialEstudo.findFirst({
      where: {
        id: materialId,
        // userId: session.user.id,  // COMENTADO PARA POC
      },
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404 }
      )
    }

    // Buscar texto formatado separadamente (workaround para POC)
    const mobileText = await prisma.$queryRaw<any[]>`
      SELECT * FROM "PdfMobileText" WHERE "materialId" = ${materialId} LIMIT 1
    `

    // Se não existe texto formatado ainda
    if (!mobileText || mobileText.length === 0) {
      const headers = handleCors(request)
      return NextResponse.json(
        {
          error: 'Texto formatado não disponível',
          message:
            'O PDF ainda não foi processado. Use POST /api/pdf/format-for-reader para processar.',
        },
        { status: 404, headers }
      )
    }

    const textData = mobileText[0]

    // Limpar texto formatado antes de retornar
    const cleanedText = cleanFormattedText(textData.formattedText || '')

    // Retornar texto formatado com informações de processamento incremental
    const headers = handleCors(request)
    return NextResponse.json({
      success: true,
      data: {
        id: textData.id,
        materialId: textData.materialId,
        formattedText: cleanedText,
        tokensUsed: textData.tokensUsed,
        aiModel: textData.aiModel,
        processedAt: textData.processedAt,
        createdAt: textData.createdAt,
        updatedAt: textData.updatedAt,
        // Campos de processamento incremental
        totalPages: textData.totalPages || 0,
        processedPages: textData.processedPages || 0,
        lastProcessedPage: textData.lastProcessedPage || 0,
        processingStatus: textData.processingStatus || 'pending',
        processingError: textData.processingError || null,
      },
    }, { headers })
  } catch (error) {
    console.error('Erro ao buscar texto formatado:', error)
    const headers = handleCors(request)
    return NextResponse.json(
      {
        error: 'Erro ao buscar texto formatado',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500, headers }
    )
  }
}
