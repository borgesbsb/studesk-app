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
      console.log(`\n${'▓'.repeat(80)}`)
      console.log(`🔥 PROCESSAMENTO EM BACKGROUND - INICIADO`)
      console.log(`${'▓'.repeat(80)}`)
      console.log(`🆔 Material ID: ${materialId}`)

      // Buscar material
      console.log(`\n📊 [1/4] Buscando material no banco de dados...`)
      const material = await prisma.materialEstudo.findFirst({
        where: { id: materialId },
        include: { mobileText: true },
      })

      if (!material) {
        throw new Error('Material não encontrado')
      }
      console.log(`✅ Material encontrado: "${material.nome}"`)

      if (material.tipo !== 'PDF' || !material.arquivoPdfUrl) {
        throw new Error('Material não é um PDF válido')
      }
      console.log(`✅ Tipo confirmado: PDF`)

      // Carregar arquivo PDF
      console.log(`\n📂 [2/4] Carregando arquivo PDF...`)
      console.log(`   Fonte: ${material.fonteOrigem || 'Upload local'}`)

      let buffer: Buffer

      // Verificar se é do Google Drive
      if (material.fonteOrigem?.startsWith('Google Drive (')) {
        console.log(`   📥 Baixando do Google Drive...`)

        // Extrair fileId do fonteOrigem
        const fileIdMatch = material.fonteOrigem.match(/Google Drive \(([^)]+)\)/)
        if (!fileIdMatch) {
          throw new Error('Formato inválido de fonteOrigem do Google Drive')
        }
        const fileId = fileIdMatch[1]
        console.log(`   🆔 File ID: ${fileId}`)

        // Buscar tokens do Google Drive do usuário
        const user = await prisma.user.findUnique({
          where: { id: material.userId },
          select: {
            googleDriveAccessToken: true,
            googleDriveRefreshToken: true,
          },
        })

        if (!user?.googleDriveAccessToken) {
          throw new Error('Usuário não possui tokens do Google Drive')
        }

        // Baixar arquivo do Google Drive
        const { GoogleDriveService } = await import('@/lib/google-drive')
        const driveService = new GoogleDriveService(
          user.googleDriveAccessToken,
          user.googleDriveRefreshToken || undefined
        )

        buffer = await driveService.downloadPdfBuffer(fileId)
        console.log(`✅ Arquivo baixado do Google Drive (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`)
      } else {
        // Upload local - ler do disco
        console.log(`   📁 Lendo do disco local...`)
        console.log(`   URL do arquivo: ${material.arquivoPdfUrl}`)

        // Remove /api/uploads/ ou /uploads/ do início da URL
        const pathParts = material.arquivoPdfUrl.replace(/^\/(api\/)?uploads\//, '').split('/')
        const fileOwnerId = pathParts[0]
        const uploadDir = path.join(process.cwd(), 'public', 'uploads')
        const fileName = material.arquivoPdfUrl.split('/').pop()
        const pdfPath = path.join(uploadDir, fileOwnerId, fileName || '')

        console.log(`   Caminho completo: ${pdfPath}`)

        // Verificar se arquivo existe
        try {
          const stats = await fs.stat(pdfPath)
          console.log(`✅ Arquivo encontrado (${(stats.size / 1024 / 1024).toFixed(2)} MB)`)
        } catch (error) {
          throw new Error(`Arquivo PDF não encontrado: ${pdfPath}`)
        }

        // Ler arquivo
        buffer = await fs.readFile(pdfPath)
      }

      // Verificar se é PDF válido
      const pdfHeader = buffer.slice(0, 4).toString()
      if (pdfHeader !== '%PDF') {
        throw new Error('Arquivo não é um PDF válido')
      }
      console.log(`✅ PDF válido detectado (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`)

      // Inicializar ou recuperar registro de processamento
      console.log(`\n⚙️  [3/4] Inicializando processamento...`)
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

        console.log(`✅ Registro de processamento criado`)
        console.log(`📖 Total de páginas: ${totalPages}`)
      } else {
        console.log(`📋 Registro de processamento existente encontrado`)
        console.log(`   Status: ${mobileText.processingStatus}`)
        console.log(`   Progresso: ${mobileText.processedPages}/${mobileText.totalPages} páginas`)

        // Verificar integridade: se processou páginas mas [PAGE_1] não existe, resetar
        if (mobileText.lastProcessedPage > 0) {
          const hasPage1 = (mobileText.formattedText || '').includes('[PAGE_1]')

          if (!hasPage1) {
            console.log(`⚠️  PROBLEMA DETECTADO: Inconsistência nos dados`)
            console.log(`   lastProcessedPage = ${mobileText.lastProcessedPage}`)
            console.log(`   Mas [PAGE_1] não encontrado no texto formatado!`)
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
      console.log(`\n🔄 [4/4] Processando PDF em lotes...`)
      const startTime = Date.now()
      await this.processAllBatches(buffer, mobileText)
      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(2)

      console.log(`\n${'▓'.repeat(80)}`)
      console.log(`✅ PROCESSAMENTO COMPLETO`)
      console.log(`${'▓'.repeat(80)}`)
      console.log(`🆔 Material ID: ${materialId}`)
      console.log(`📖 Total de páginas: ${mobileText.totalPages}`)
      console.log(`⏱️  Tempo total: ${duration}s`)
      console.log(`⏰ Finalizado em: ${new Date().toLocaleString('pt-BR')}`)
      console.log(`${'▓'.repeat(80)}\n`)
    } catch (error) {
      console.log(`\n${'▓'.repeat(80)}`)
      console.log(`❌ ERRO NO PROCESSAMENTO`)
      console.log(`${'▓'.repeat(80)}`)
      console.error(`Material ID: ${materialId}`)
      console.error(`Erro:`, error)
      console.log(`${'▓'.repeat(80)}\n`)

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

    console.log(`\n┌${'─'.repeat(78)}┐`)
    console.log(`│ ETAPA 1: DETECÇÃO DE PADRÕES (CABEÇALHOS/RODAPÉS)${' '.repeat(28)}│`)
    console.log(`└${'─'.repeat(78)}┘`)

    // Detectar padrões de cabeçalho/rodapé nas primeiras 3 páginas (SEM salvar o texto)
    let patterns: HeaderFooterPattern[] = []

    if (!mobileText.headerFooterPatterns && mobileText.lastProcessedPage === 0) {
      console.log('🤖 Analisando primeiras 3 páginas com IA...')
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

          console.log(`✅ IA detectou ${patterns.length} padrões (${detection.tokensUsed} tokens usados)`)
          if (patterns.length > 0) {
            patterns.forEach((p, i) => {
              console.log(`   ${i + 1}. ${p.type.toUpperCase()}: "${p.description}"`)
            })
          } else {
            console.log(`   → Nenhum padrão repetitivo detectado`)
          }
        }
      } catch (aiError) {
        console.log('⚠️  Erro na detecção com IA, processando sem limpeza de padrões')
        console.error('   Detalhes:', aiError)
      }
    } else if (mobileText.headerFooterPatterns) {
      patterns = JSON.parse(mobileText.headerFooterPatterns)
      console.log(`📋 Usando ${patterns.length} padrões já detectados anteriormente`)
    }

    // Recarregar mobileText para garantir que temos os dados mais recentes
    mobileText = await prisma.pdfMobileText.findUnique({
      where: { id: mobileText.id },
    })

    console.log(`\n┌${'─'.repeat(78)}┐`)
    console.log(`│ ETAPA 2: PROCESSAMENTO EM LOTES (EXTRAÇÃO + FORMATAÇÃO IA)${' '.repeat(19)}│`)
    console.log(`└${'─'.repeat(78)}┘`)

    // Processar primeiro lote COM os padrões aplicados (começando da página 1)
    let currentPage = mobileText.lastProcessedPage + 1
    const endPage = Math.min(currentPage + initialBatchSize - 1, mobileText.totalPages)
    let batchNumber = 1
    const totalBatches = Math.ceil(mobileText.totalPages / batchSize) + 1

    console.log(`\n📦 LOTE ${batchNumber}/${totalBatches} - Páginas ${currentPage} a ${endPage}`)
    await this.processBatch(buffer, mobileText, currentPage, endPage, patterns, batchNumber, totalBatches)

    // CRÍTICO: Recarregar mobileText após primeiro lote para ter dados atualizados
    mobileText = await prisma.pdfMobileText.findUnique({
      where: { id: mobileText.id },
    })

    // Processar lotes subsequentes (10 páginas cada)
    currentPage = endPage + 1

    while (currentPage <= mobileText.totalPages) {
      batchNumber++
      const batchEndPage = Math.min(currentPage + batchSize - 1, mobileText.totalPages)

      console.log(`\n📦 LOTE ${batchNumber}/${totalBatches} - Páginas ${currentPage} a ${batchEndPage}`)
      await this.processBatch(buffer, mobileText, currentPage, batchEndPage, patterns, batchNumber, totalBatches)

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

    console.log(`\n┌${'─'.repeat(78)}┐`)
    console.log(`│ ✅ PROCESSAMENTO DE LOTES CONCLUÍDO${' '.repeat(42)}│`)
    console.log(`└${'─'.repeat(78)}┘`)
    console.log(`📊 Total processado: ${mobileText.totalPages} páginas`)
  }

  /**
   * Processa um lote de páginas
   */
  private async processBatch(
    buffer: Buffer,
    mobileText: any,
    startPage: number,
    endPage: number,
    patterns: HeaderFooterPattern[],
    batchNumber: number = 1,
    totalBatches: number = 1
  ): Promise<void> {
    const batchStartTime = Date.now()

    // Extrair texto das páginas
    console.log(`   ⬇️  Extraindo texto (páginas ${startPage}-${endPage})...`)
    const { text: extractedText, actualEndPage } = await this.extractPagesText(
      buffer,
      startPage,
      endPage,
      patterns.length > 0 ? patterns : undefined
    )
    console.log(`   ✅ Extraídos ${extractedText.length.toLocaleString()} caracteres`)

    // Formatar texto com IA
    console.log(`   🤖 Formatando com IA...`)
    let formattedMarkdown = extractedText
    let markdownTokensUsed = 0

    try {
      const formatService = new OpenAIFormatService()
      const formatResult = await formatService.formatTextForMobile(extractedText)
      formattedMarkdown = formatResult.formattedText
      markdownTokensUsed = formatResult.tokensUsed

      console.log(`   ✅ Formatação concluída (${markdownTokensUsed} tokens - ${formatResult.model})`)
    } catch (formatError) {
      console.log(`   ⚠️  Erro na formatação, usando texto bruto`)
      console.error('   Detalhes:', formatError)
      formattedMarkdown = extractedText
    }

    // Salvar no banco
    const pagesProcessed = actualEndPage - startPage + 1
    const newProcessedPages = mobileText.processedPages + pagesProcessed
    const progressPercent = Math.round((newProcessedPages / mobileText.totalPages) * 100)

    console.log(`   💾 Salvando no banco...`)
    await prisma.pdfMobileText.update({
      where: { id: mobileText.id },
      data: {
        formattedText: mobileText.formattedText + formattedMarkdown,
        rawText: mobileText.rawText + extractedText,
        processedPages: newProcessedPages,
        lastProcessedPage: actualEndPage,
        processingStatus: actualEndPage >= mobileText.totalPages ? 'complete' : 'partial',
        tokensUsed: (mobileText.tokensUsed || 0) + markdownTokensUsed,
      },
    })

    const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(1)

    console.log(`   ✅ Lote ${batchNumber}/${totalBatches} concluído em ${batchDuration}s`)
    console.log(`   📊 Progresso total: ${newProcessedPages}/${mobileText.totalPages} páginas (${progressPercent}%)`)

    // Barra de progresso visual
    const barLength = 40
    const filledLength = Math.round((progressPercent / 100) * barLength)
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength)
    console.log(`   [${bar}] ${progressPercent}%`)
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
