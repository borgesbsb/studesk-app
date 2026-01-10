import { NextRequest, NextResponse } from 'next/server'
// import { getServerSession } from 'next-auth'  // COMENTADO PARA POC
// import { authOptions } from '@/lib/auth'  // COMENTADO PARA POC
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'
import { sanitizeUnicode } from '@/utils/unicode-sanitizer'
import {
  HeaderFooterDetectorService,
  HeaderFooterPattern,
} from '@/application/services/header-footer-detector.service'
import { OpenAIFormatService } from '@/application/services/openai-format.service'

// Função para extrair texto de páginas específicas usando pdf-parse
async function extractPagesText(
  buffer: Buffer,
  startPage: number,
  endPage: number,
  patterns?: HeaderFooterPattern[]
): Promise<{ text: string; actualEndPage: number; pagesArray: string[] }> {
  try {
    console.log(`Extraindo texto das páginas ${startPage} a ${endPage}...`)

    const pdfParse = (await import('pdf-parse')).default
    const detector = patterns ? new HeaderFooterDetectorService() : null

    // Usar custom page render para extrair páginas específicas
    let currentPageNum = 0
    const pagesArray: string[] = []

    const data = await pdfParse(buffer, {
      pagerender: function(pageData: any) {
        currentPageNum++

        // Só processar páginas no intervalo solicitado
        if (currentPageNum < startPage || currentPageNum > endPage) {
          return Promise.resolve('')
        }

        return pageData.getTextContent().then(function(textContent: any) {
          console.log(`Processando página ${currentPageNum}/${endPage}`)

          // Organizar items por posição Y para preservar estrutura de linhas e parágrafos
          const items = textContent.items
          let lastY = -1
          let pageText = ''

          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (!item.str) continue

            // Detectar mudanças de linha e parágrafos baseado na posição Y
            if (item.transform && item.transform[5]) {
              const currentY = item.transform[5]
              const deltaY = Math.abs(currentY - lastY)

              if (lastY !== -1) {
                // Diferença grande em Y = novo parágrafo (duas quebras)
                if (deltaY > 15) {
                  pageText += '\n\n'
                }
                // Diferença média em Y = nova linha (uma quebra)
                else if (deltaY > 2) {
                  pageText += '\n'
                }
                // Diferença pequena = mesma linha, continuar
              }

              lastY = currentY
            }

            pageText += item.str + ' '
          }

          console.log(`📄 Página ${currentPageNum} - Texto extraído (${pageText.length} chars)`)

          if (pageText.trim().length > 0) {
            // Armazenar texto da página (para detecção de padrões)
            pagesArray.push(pageText)

            // Se temos padrões, aplicar limpeza
            let finalText = pageText
            if (detector && patterns && patterns.length > 0) {
              console.log(`🔍 ANTES da limpeza (página ${currentPageNum}):`, pageText.substring(0, 200))
              finalText = detector.applyPatterns(pageText, patterns)
              console.log(`✅ DEPOIS da limpeza (página ${currentPageNum}):`, finalText.substring(0, 200))
              console.log(`📏 Tamanho: ${pageText.length} → ${finalText.length} chars`)
            }

            const pageBlock = `\n\n[PAGE_${currentPageNum}]\n\n${finalText}\n\n`
            console.log(`📦 Bloco retornado (página ${currentPageNum}):`, pageBlock.substring(0, 200))
            return pageBlock
          }

          return ''
        })
      }
    })

    const totalPages = data.numpages
    const actualEndPage = Math.min(endPage, totalPages)

    console.log(`PDF tem ${totalPages} páginas. Processadas ${startPage} a ${actualEndPage}. Texto: ${data.text.length} chars`)

    return {
      text: sanitizeUnicode(data.text.trim()),
      actualEndPage,
      pagesArray,
    }
  } catch (error) {
    console.error('Erro na extração com pdf-parse:', error)
    throw new Error('Falha na extração de páginas: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
  }
}

// Função para contar total de páginas
async function getTotalPages(buffer: Buffer): Promise<number> {
  try {
    console.log('Contando total de páginas do PDF...')

    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer, { max: 0 }) // max: 0 = apenas metadados

    console.log(`PDF tem ${data.numpages} páginas`)

    return data.numpages
  } catch (error) {
    console.error('Erro ao contar páginas:', error)
    throw new Error('Falha ao contar páginas do PDF')
  }
}

export async function POST(request: NextRequest) {
  try {
    // Autenticação DESABILITADA TEMPORARIAMENTE PARA POC
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json(
    //     { error: 'Não autorizado' },
    //     { status: 401 }
    //   )
    // }

    const body = await request.json()
    const { materialId, startPage, endPage, batchSize = 10 } = body

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

    // Verificar se é PDF
    if (material.tipo !== 'PDF' || !material.arquivoPdfUrl) {
      return NextResponse.json(
        { error: 'Material não é um PDF válido' },
        { status: 400 }
      )
    }

    // Validar ownership do arquivo (DESABILITADO PARA POC)
    // const pathParts = material.arquivoPdfUrl.replace(/^\/uploads\//, '').split('/')
    // const fileOwnerId = pathParts[0]

    // if (fileOwnerId !== session.user.id) {
    //   return NextResponse.json(
    //     { error: 'Você não tem permissão para processar este arquivo' },
    //     { status: 403 }
    //   )
    // }

    const pathParts = material.arquivoPdfUrl.replace(/^\/uploads\//, '').split('/')
    const fileOwnerId = pathParts[0]

    // Carregar arquivo PDF
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    const fileName = material.arquivoPdfUrl.split('/').pop()
    const pdfPath = path.join(uploadDir, fileOwnerId, fileName || '')

    // Verificar se o arquivo existe
    try {
      await fs.stat(pdfPath)
    } catch (error) {
      return NextResponse.json(
        { error: 'Arquivo PDF não encontrado' },
        { status: 404 }
      )
    }

    // Ler arquivo
    const buffer = await fs.readFile(pdfPath)

    // Verificar se é um PDF válido
    const pdfHeader = buffer.slice(0, 4).toString()
    if (pdfHeader !== '%PDF') {
      return NextResponse.json(
        { error: 'Arquivo não é um PDF válido' },
        { status: 400 }
      )
    }

    // Se é o primeiro lote, contar total de páginas e criar registro
    let mobileText = material.mobileText

    if (!mobileText) {
      const totalPages = await getTotalPages(buffer)

      mobileText = await prisma.pdfMobileText.create({
        data: {
          materialId: material.id,
          formattedText: '',
          rawText: '',
          totalPages,
          processedPages: 0,
          lastProcessedPage: 0,
          processingStatus: 'processing',
          aiModel: 'incremental-extraction',
        },
      })

      // Atualizar total de páginas no material também
      await prisma.materialEstudo.update({
        where: { id: material.id },
        data: { totalPaginas: totalPages },
      })
    }

    // Determinar intervalo de páginas a processar
    const start = startPage || mobileText.lastProcessedPage + 1
    const end = endPage || Math.min(start + batchSize - 1, mobileText.totalPages)

    if (start > mobileText.totalPages) {
      // Processamento completo
      await prisma.pdfMobileText.update({
        where: { id: mobileText.id },
        data: { processingStatus: 'complete' },
      })

      return NextResponse.json({
        success: true,
        complete: true,
        message: 'Processamento completo',
        status: {
          totalPages: mobileText.totalPages,
          processedPages: mobileText.processedPages,
          processingStatus: 'complete',
        },
      })
    }

    // Atualizar status para processing
    await prisma.pdfMobileText.update({
      where: { id: mobileText.id },
      data: { processingStatus: 'processing' },
    })

    // Verificar se já temos padrões detectados
    let patterns: HeaderFooterPattern[] = []

    if (mobileText.headerFooterPatterns) {
      // Já temos padrões salvos - usar eles
      patterns = JSON.parse(mobileText.headerFooterPatterns)
      console.log(`📋 Usando ${patterns.length} padrões já detectados`)
    } else if (start === 1) {
      // Primeiro lote - detectar padrões com IA ANTES de processar (apenas análise)
      console.log('🤖 Primeiro lote - detectando padrões com IA nas primeiras 3 páginas (apenas análise)...')

      try {
        // Extrair APENAS 3 primeiras páginas SEM limpeza (apenas para análise da IA)
        const { pagesArray: initialPages } = await extractPagesText(buffer, 1, 3)

        if (initialPages.length > 0) {
          // Usar IA para detectar padrões
          const detector = new HeaderFooterDetectorService()
          const detection = await detector.detectPatterns(initialPages)

          patterns = detection.patterns

          // Salvar padrões no banco IMEDIATAMENTE
          await prisma.pdfMobileText.update({
            where: { id: mobileText.id },
            data: {
              headerFooterPatterns: JSON.stringify(patterns),
              tokensUsed: (mobileText.tokensUsed || 0) + detection.tokensUsed,
            },
          })

          console.log(`✅ IA detectou e salvou ${patterns.length} padrões (${detection.tokensUsed} tokens)`)

          // Mostrar quais padrões foram detectados
          patterns.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.type.toUpperCase()}: "${p.description}"`)
            console.log(`      Regex: /${p.regexPattern}/i`)
          })
        }
      } catch (aiError) {
        console.error('⚠️  Erro na detecção com IA, processando sem limpeza:', aiError)
        // Continuar sem padrões se IA falhar
        patterns = []
      }
    }

    // Agora extrair texto do lote completo COM os padrões detectados aplicados
    console.log(`🔄 Extraindo páginas ${start} a ${end} COM padrões aplicados (${patterns.length} padrões)...`)
    const { text: extractedText, actualEndPage } = await extractPagesText(
      buffer,
      start,
      end,
      patterns.length > 0 ? patterns : undefined
    )

    console.log(`🎯 TEXTO FINAL EXTRAÍDO (primeiros 500 chars):`)
    console.log(extractedText.substring(0, 500))
    console.log(`🎯 Total: ${extractedText.length} caracteres`)

    // 🤖 FORMATAR TEXTO PARA MARKDOWN COM OPENAI
    console.log(`🤖 Formatando texto para Markdown com OpenAI...`)
    let formattedMarkdown = extractedText
    let markdownTokensUsed = 0

    try {
      const formatService = new OpenAIFormatService()
      const formatResult = await formatService.formatTextForMobile(extractedText)
      formattedMarkdown = formatResult.formattedText
      markdownTokensUsed = formatResult.tokensUsed

      console.log(`✅ Markdown gerado (${markdownTokensUsed} tokens)`)
      console.log(`📝 Primeiros 500 chars do markdown:`)
      console.log(formattedMarkdown.substring(0, 500))
    } catch (formatError) {
      console.error(`⚠️  Erro ao formatar com OpenAI, usando texto bruto:`, formatError)
      // Se falhar, usar texto bruto mesmo
      formattedMarkdown = extractedText
    }

    // Atualizar registro com novo texto
    const pagesProcessed = actualEndPage - start + 1
    const updatedMobileText = await prisma.pdfMobileText.update({
      where: { id: mobileText.id },
      data: {
        formattedText: mobileText.formattedText + formattedMarkdown,
        rawText: mobileText.rawText + extractedText,
        processedPages: mobileText.processedPages + pagesProcessed,
        lastProcessedPage: actualEndPage,
        processingStatus: actualEndPage >= mobileText.totalPages ? 'complete' : 'partial',
        tokensUsed: (mobileText.tokensUsed || 0) + markdownTokensUsed,
      },
    })

    const isComplete = updatedMobileText.processingStatus === 'complete'

    console.log(`📤 RETORNANDO AO CLIENTE (primeiros 500 chars do batch.text):`)
    console.log(extractedText.substring(0, 500))

    return NextResponse.json({
      success: true,
      complete: isComplete,
      batch: {
        startPage: start,
        endPage: actualEndPage,
        pagesProcessed,
        text: extractedText,
      },
      status: {
        totalPages: updatedMobileText.totalPages,
        processedPages: updatedMobileText.processedPages,
        lastProcessedPage: updatedMobileText.lastProcessedPage,
        processingStatus: updatedMobileText.processingStatus,
        progress: Math.round((updatedMobileText.processedPages / updatedMobileText.totalPages) * 100),
      },
    })
  } catch (error) {
    console.error('Erro ao processar lote de PDF:', error)

    // Tentar atualizar status de erro
    try {
      const { materialId } = await request.json()
      if (materialId) {
        await prisma.pdfMobileText.updateMany({
          where: { materialId },
          data: {
            processingStatus: 'error',
            processingError: error instanceof Error ? error.message : 'Erro desconhecido',
          },
        })
      }
    } catch (updateError) {
      console.error('Erro ao atualizar status de erro:', updateError)
    }

    return NextResponse.json(
      {
        error: 'Erro ao processar lote de PDF',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
