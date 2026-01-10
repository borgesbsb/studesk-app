import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'
import { sanitizeUnicode } from '@/utils/unicode-sanitizer'
import {
  HeaderFooterDetectorService,
  HeaderFooterPattern,
} from './header-footer-detector.service'
import { OpenAIFormatService } from './openai-format.service'

/**
 * Serviço para processamento em background de PDFs
 * Processa todas as páginas automaticamente no servidor
 */
export class PdfBackgroundProcessorService {
  private isProcessing = false

  /**
   * Inicia processamento completo de um PDF em background
   * @param materialId - ID do material a ser processado
   */
  async processFullPdf(materialId: string): Promise<void> {
    if (this.isProcessing) {
      console.log(`⚠️  Processamento já em andamento para material ${materialId}`)
      return
    }

    try {
      this.isProcessing = true
      console.log(`🚀 Iniciando processamento em background para material ${materialId}`)

      // Buscar material
      const material = await prisma.materialEstudo.findFirst({
        where: { id: materialId },
        include: { mobileText: true },
      })

      if (!material) {
        throw new Error('Material não encontrado')
      }

      if (material.tipo !== 'PDF' || !material.arquivoPdfUrl) {
        throw new Error('Material não é um PDF válido')
      }

      // Carregar arquivo PDF
      const pathParts = material.arquivoPdfUrl.replace(/^\/uploads\//, '').split('/')
      const fileOwnerId = pathParts[0]
      const uploadDir = path.join(process.cwd(), 'public', 'uploads')
      const fileName = material.arquivoPdfUrl.split('/').pop()
      const pdfPath = path.join(uploadDir, fileOwnerId, fileName || '')

      // Verificar se arquivo existe
      try {
        await fs.stat(pdfPath)
      } catch (error) {
        throw new Error('Arquivo PDF não encontrado')
      }

      // Ler arquivo
      const buffer = await fs.readFile(pdfPath)

      // Verificar se é PDF válido
      const pdfHeader = buffer.slice(0, 4).toString()
      if (pdfHeader !== '%PDF') {
        throw new Error('Arquivo não é um PDF válido')
      }

      // Inicializar ou recuperar registro de processamento
      let mobileText = material.mobileText

      if (!mobileText) {
        const totalPages = await this.getTotalPages(buffer)

        mobileText = await prisma.pdfMobileText.create({
          data: {
            materialId: material.id,
            formattedText: '',
            rawText: '',
            totalPages,
            processedPages: 0,
            lastProcessedPage: 0,
            processingStatus: 'processing',
            aiModel: 'groq/openai',
          },
        })

        await prisma.materialEstudo.update({
          where: { id: material.id },
          data: { totalPaginas: totalPages },
        })

        console.log(`📊 PDF tem ${totalPages} páginas`)
      } else {
        // Verificar integridade: se processou páginas mas [PAGE_1] não existe, resetar
        if (mobileText.lastProcessedPage > 0) {
          const hasPage1 = (mobileText.formattedText || '').includes('[PAGE_1]')

          if (!hasPage1) {
            console.log(`⚠️  PROBLEMA DETECTADO: lastProcessedPage = ${mobileText.lastProcessedPage}, mas [PAGE_1] não encontrado!`)
            console.log(`🔄 Resetando processamento para corrigir...`)

            // Resetar processamento
            mobileText = await prisma.pdfMobileText.update({
              where: { id: mobileText.id },
              data: {
                formattedText: '',
                rawText: '',
                processedPages: 0,
                lastProcessedPage: 0,
                processingStatus: 'processing',
                processingError: null,
              },
            })

            console.log(`✅ Processamento resetado - iniciando do zero`)
          }
        }
      }

      // Processar todos os lotes
      await this.processAllBatches(buffer, mobileText)

      console.log(`✅ Processamento completo do material ${materialId}!`)
    } catch (error) {
      console.error(`❌ Erro no processamento em background:`, error)

      // Atualizar status de erro no banco
      try {
        await prisma.pdfMobileText.updateMany({
          where: { materialId },
          data: {
            processingStatus: 'error',
            processingError: error instanceof Error ? error.message : 'Erro desconhecido',
          },
        })
      } catch (updateError) {
        console.error('Erro ao atualizar status de erro:', updateError)
      }

      throw error
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Processa todos os lotes de um PDF
   */
  private async processAllBatches(buffer: Buffer, mobileText: any): Promise<void> {
    const initialBatchSize = 5
    const batchSize = 10

    // Detectar padrões de cabeçalho/rodapé nas primeiras 3 páginas (SEM salvar o texto)
    let patterns: HeaderFooterPattern[] = []

    if (!mobileText.headerFooterPatterns && mobileText.lastProcessedPage === 0) {
      console.log('🤖 Detectando padrões com IA nas primeiras 3 páginas (apenas análise)...')
      try {
        // Extrair APENAS para análise (não salvar no banco)
        const { pagesArray: initialPages } = await this.extractPagesText(buffer, 1, 3)

        if (initialPages.length > 0) {
          const detector = new HeaderFooterDetectorService()
          const detection = await detector.detectPatterns(initialPages)
          patterns = detection.patterns

          await prisma.pdfMobileText.update({
            where: { id: mobileText.id },
            data: {
              headerFooterPatterns: JSON.stringify(patterns),
              tokensUsed: (mobileText.tokensUsed || 0) + detection.tokensUsed,
            },
          })

          console.log(`✅ IA detectou ${patterns.length} padrões (${detection.tokensUsed} tokens)`)
          patterns.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.type.toUpperCase()}: "${p.description}"`)
          })
        }
      } catch (aiError) {
        console.error('⚠️  Erro na detecção com IA, processando sem limpeza:', aiError)
      }
    } else if (mobileText.headerFooterPatterns) {
      patterns = JSON.parse(mobileText.headerFooterPatterns)
      console.log(`📋 Usando ${patterns.length} padrões já detectados`)
    }

    // Recarregar mobileText para garantir que temos os dados mais recentes
    mobileText = await prisma.pdfMobileText.findUnique({
      where: { id: mobileText.id },
    })

    // Processar primeiro lote COM os padrões aplicados (começando da página 1)
    let currentPage = mobileText.lastProcessedPage + 1
    const endPage = Math.min(currentPage + initialBatchSize - 1, mobileText.totalPages)

    console.log(`📄 Processando primeiro lote COM padrões aplicados: páginas ${currentPage} a ${endPage}`)
    console.log(`📊 Estado atual: lastProcessedPage=${mobileText.lastProcessedPage}, processedPages=${mobileText.processedPages}`)
    await this.processBatch(buffer, mobileText, currentPage, endPage, patterns)

    // CRÍTICO: Recarregar mobileText após primeiro lote para ter dados atualizados
    mobileText = await prisma.pdfMobileText.findUnique({
      where: { id: mobileText.id },
    })

    console.log(`🔄 Após primeiro lote: lastProcessedPage=${mobileText.lastProcessedPage}, processedPages=${mobileText.processedPages}`)

    // Processar lotes subsequentes (10 páginas cada)
    currentPage = endPage + 1

    while (currentPage <= mobileText.totalPages) {
      const batchEndPage = Math.min(currentPage + batchSize - 1, mobileText.totalPages)

      console.log(`📄 Processando lote: páginas ${currentPage} a ${batchEndPage}`)
      await this.processBatch(buffer, mobileText, currentPage, batchEndPage, patterns)

      currentPage = batchEndPage + 1

      // Recarregar mobileText para obter dados atualizados
      mobileText = await prisma.pdfMobileText.findUnique({
        where: { id: mobileText.id },
      })
    }

    // Marcar como completo
    await prisma.pdfMobileText.update({
      where: { id: mobileText.id },
      data: { processingStatus: 'complete' },
    })

    console.log(`✅ Todas as ${mobileText.totalPages} páginas foram processadas!`)
  }

  /**
   * Processa um lote de páginas
   */
  private async processBatch(
    buffer: Buffer,
    mobileText: any,
    startPage: number,
    endPage: number,
    patterns: HeaderFooterPattern[]
  ): Promise<void> {
    console.log(`\n🔄 INICIANDO PROCESSBATCH:`)
    console.log(`   Páginas solicitadas: ${startPage} → ${endPage}`)
    console.log(`   Padrões a aplicar: ${patterns.length}`)
    console.log(`   Estado do mobileText: lastProcessedPage=${mobileText.lastProcessedPage}, processedPages=${mobileText.processedPages}`)

    // Extrair texto das páginas
    const { text: extractedText, actualEndPage } = await this.extractPagesText(
      buffer,
      startPage,
      endPage,
      patterns.length > 0 ? patterns : undefined
    )

    console.log(`📝 Extraídos ${extractedText.length} caracteres das páginas ${startPage}-${actualEndPage}`)
    console.log(`📄 Primeiros 200 chars do texto extraído: ${extractedText.substring(0, 200)}`)

    // Formatar texto com IA
    console.log(`🤖 Formatando texto para Markdown com IA...`)
    let formattedMarkdown = extractedText
    let markdownTokensUsed = 0

    try {
      const formatService = new OpenAIFormatService()
      const formatResult = await formatService.formatTextForMobile(extractedText)
      formattedMarkdown = formatResult.formattedText
      markdownTokensUsed = formatResult.tokensUsed

      console.log(`✅ Markdown gerado (${markdownTokensUsed} tokens usando ${formatResult.model})`)
    } catch (formatError) {
      console.error(`⚠️  Erro ao formatar com IA, usando texto bruto:`, formatError)
      formattedMarkdown = extractedText
    }

    // Salvar no banco
    const pagesProcessed = actualEndPage - startPage + 1

    console.log(`\n💾 SALVANDO NO BANCO:`)
    console.log(`   Páginas processadas neste lote: ${pagesProcessed} (${startPage} → ${actualEndPage})`)
    console.log(`   processedPages ANTES: ${mobileText.processedPages}`)
    console.log(`   processedPages DEPOIS: ${mobileText.processedPages + pagesProcessed}`)
    console.log(`   lastProcessedPage ANTES: ${mobileText.lastProcessedPage}`)
    console.log(`   lastProcessedPage DEPOIS: ${actualEndPage}`)
    console.log(`   Tamanho do texto formatado sendo adicionado: ${formattedMarkdown.length} chars`)
    console.log(`   Tamanho total do formattedText: ${(mobileText.formattedText || '').length + formattedMarkdown.length} chars`)

    await prisma.pdfMobileText.update({
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

    console.log(
      `✅ Salvo no banco: ${mobileText.processedPages + pagesProcessed}/${mobileText.totalPages} páginas (${Math.round(((mobileText.processedPages + pagesProcessed) / mobileText.totalPages) * 100)}%)`
    )
  }

  /**
   * Extrai texto de páginas específicas do PDF
   */
  private async extractPagesText(
    buffer: Buffer,
    startPage: number,
    endPage: number,
    patterns?: HeaderFooterPattern[]
  ): Promise<{ text: string; actualEndPage: number; pagesArray: string[] }> {
    console.log(`\n📖 EXTRACTPAGESTEXT: Extraindo páginas ${startPage} → ${endPage}`)
    console.log(`   Padrões disponíveis: ${patterns ? patterns.length : 0}`)

    const pdfParse = (await import('pdf-parse')).default
    const detector = patterns ? new HeaderFooterDetectorService() : null

    let currentPageNum = 0
    const pagesArray: string[] = []
    let pagesExtracted = 0

    const data = await pdfParse(buffer, {
      pagerender: function (pageData: any) {
        currentPageNum++

        if (currentPageNum < startPage || currentPageNum > endPage) {
          return Promise.resolve('')
        }

        pagesExtracted++
        console.log(`   📄 Extraindo página ${currentPageNum}...`)

        return pageData.getTextContent().then(function (textContent: any) {
          const items = textContent.items
          let lastY = -1
          let pageText = ''

          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (!item.str) continue

            if (item.transform && item.transform[5]) {
              const currentY = item.transform[5]
              const deltaY = Math.abs(currentY - lastY)

              if (lastY !== -1) {
                if (deltaY > 15) {
                  pageText += '\n\n'
                } else if (deltaY > 2) {
                  pageText += '\n'
                }
              }

              lastY = currentY
            }

            pageText += item.str + ' '
          }

          if (pageText.trim().length > 0) {
            pagesArray.push(pageText)

            let finalText = pageText
            if (detector && patterns && patterns.length > 0) {
              finalText = detector.applyPatterns(pageText, patterns)
            }

            return `\n\n[PAGE_${currentPageNum}]\n\n${finalText}\n\n`
          }

          return ''
        })
      },
    })

    const totalPages = data.numpages
    const actualEndPage = Math.min(endPage, totalPages)

    console.log(`✅ EXTRACTPAGESTEXT concluído:`)
    console.log(`   Total de páginas no PDF: ${totalPages}`)
    console.log(`   Páginas extraídas: ${pagesExtracted} (solicitado: ${startPage} → ${endPage})`)
    console.log(`   pagesArray.length: ${pagesArray.length}`)
    console.log(`   Texto total extraído: ${data.text.length} chars`)
    console.log(`   Primeiros 150 chars: ${data.text.substring(0, 150)}`)

    return {
      text: sanitizeUnicode(data.text.trim()),
      actualEndPage,
      pagesArray,
    }
  }

  /**
   * Conta total de páginas do PDF
   */
  private async getTotalPages(buffer: Buffer): Promise<number> {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer, { max: 0 })
    return data.numpages
  }
}
