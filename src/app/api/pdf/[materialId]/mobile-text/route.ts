import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleCors } from '@/lib/cors'

/**
 * Limpa texto formatado, removendo code blocks malformados e corrigindo quebras de linha
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

  // CORREÇÃO DE QUEBRAS DE LINHA DENTRO DE PARÁGRAFOS
  cleaned = fixParagraphBreaks(cleaned)

  return cleaned
}

/**
 * Remove quebras de linha simples dentro de parágrafos, mantendo apenas quebras duplas
 */
function fixParagraphBreaks(text: string): string {
  // 1. Preservar marcadores de página adicionando marcador especial
  let fixed = text.replace(/\[PAGE_(\d+)\]/g, '<<<PAGE_MARKER_$1>>>')

  // 2. Preservar títulos markdown (linhas que começam com #)
  fixed = fixed.replace(/^(#{1,6}\s+.+)$/gm, '<<<HEADING>>>$1<<<HEADING_END>>>')

  // 3. Preservar listas (linhas que começam com - ou * ou número.)
  fixed = fixed.replace(/^(\s*[-*]\s+.+)$/gm, '<<<LIST_ITEM>>>$1<<<LIST_ITEM_END>>>')
  fixed = fixed.replace(/^(\s*\d+\.\s+.+)$/gm, '<<<LIST_ITEM>>>$1<<<LIST_ITEM_END>>>')

  // 4. Preservar blocos de citação (linhas que começam com >)
  fixed = fixed.replace(/^(>\s+.+)$/gm, '<<<QUOTE>>>$1<<<QUOTE_END>>>')

  // 5. Preservar quebras de parágrafo (substituir \n\n por marcador especial)
  fixed = fixed.replace(/\n\n+/g, '<<<PARAGRAPH_BREAK>>>')

  // 6. AGORA: Remover TODAS as quebras de linha simples restantes
  // Essas são as quebras DENTRO dos parágrafos que estão causando o problema
  fixed = fixed.replace(/\n/g, ' ')

  // 7. Limpar múltiplos espaços que podem ter sido criados
  fixed = fixed.replace(/\s{2,}/g, ' ')

  // 8. Restaurar quebras de parágrafo
  fixed = fixed.replace(/<<<PARAGRAPH_BREAK>>>/g, '\n\n')

  // 9. Restaurar marcadores de página (com quebras de parágrafo ao redor)
  fixed = fixed.replace(/<<<PAGE_MARKER_(\d+)>>>/g, '\n\n[PAGE_$1]\n\n')

  // 10. Restaurar títulos markdown (com quebras ao redor)
  fixed = fixed.replace(/<<<HEADING>>>(.+?)<<<HEADING_END>>>/g, '\n\n$1\n\n')

  // 11. Restaurar listas (com quebra antes)
  fixed = fixed.replace(/<<<LIST_ITEM>>>(.+?)<<<LIST_ITEM_END>>>/g, '\n$1')

  // 12. Restaurar blocos de citação (com quebra antes)
  fixed = fixed.replace(/<<<QUOTE>>>(.+?)<<<QUOTE_END>>>/g, '\n$1')

  // 13. Limpar quebras múltiplas que podem ter sido criadas
  fixed = fixed.replace(/\n{3,}/g, '\n\n')

  // 14. Trim
  fixed = fixed.trim()

  return fixed
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
