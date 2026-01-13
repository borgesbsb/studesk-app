#!/usr/bin/env tsx

/**
 * Worker independente para processamento de PDFs
 * Roda continuamente verificando materiais pendentes e processando automaticamente
 *
 * Uso:
 *   npm run worker:pdf
 *   ou via PM2: pm2 start workers/pdf-processor-worker.ts --name pdf-worker --interpreter tsx
 */

import { PrismaClient } from '@prisma/client'
import { PdfBackgroundProcessorService } from '../src/application/services/pdf-background-processor.service'

const prisma = new PrismaClient()
const processor = new PdfBackgroundProcessorService()

// Configurações
const CHECK_INTERVAL_MS = 30000 // Verificar a cada 30 segundos
const MAX_RETRY_ATTEMPTS = 3
let isProcessing = false

/**
 * Busca materiais que precisam ser processados
 */
async function findPendingMaterials() {
  try {
    // Buscar materiais com status 'partial' ou 'pending'
    const pendingMaterials = await prisma.pdfMobileText.findMany({
      where: {
        OR: [
          { processingStatus: 'partial' },
          { processingStatus: 'pending' },
          { processingStatus: 'error' }, // Tentar reprocessar erros
        ],
        // Evitar processar materiais que falharam muitas vezes
        retryCount: {
          lt: MAX_RETRY_ATTEMPTS,
        },
      },
      include: {
        material: {
          select: {
            id: true,
            nome: true,
            tipo: true,
            arquivoPdfUrl: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'asc', // Processar os mais antigos primeiro
      },
      take: 1, // Processar um de cada vez
    })

    return pendingMaterials
  } catch (error) {
    console.error('❌ Erro ao buscar materiais pendentes:', error)
    return []
  }
}

/**
 * Processa um material
 */
async function processMaterial(mobileText: any) {
  const materialId = mobileText.materialId
  const materialName = mobileText.material?.nome || materialId

  console.log(`\n${'='.repeat(80)}`)
  console.log(`🚀 Iniciando processamento automático`)
  console.log(`${'='.repeat(80)}`)
  console.log(`📄 Material: ${materialName}`)
  console.log(`🆔 ID: ${materialId}`)
  console.log(`📊 Status atual: ${mobileText.processingStatus}`)
  console.log(`📖 Progresso: ${mobileText.processedPages}/${mobileText.totalPages} páginas`)
  console.log(`⏰ Horário: ${new Date().toLocaleString('pt-BR')}`)
  console.log(`${'='.repeat(80)}\n`)

  try {
    // Atualizar retry count
    await prisma.pdfMobileText.update({
      where: { id: mobileText.id },
      data: {
        retryCount: (mobileText.retryCount || 0) + 1,
        processingStatus: 'processing',
      },
    })

    // Processar
    await processor.processFullPdf(materialId)

    console.log(`\n✅ Material ${materialName} processado com sucesso!`)

    // Resetar retry count em caso de sucesso
    await prisma.pdfMobileText.update({
      where: { id: mobileText.id },
      data: {
        retryCount: 0,
      },
    })

    return true
  } catch (error) {
    console.error(`\n❌ Erro ao processar material ${materialName}:`, error)

    // Atualizar status de erro
    await prisma.pdfMobileText.update({
      where: { id: mobileText.id },
      data: {
        processingStatus: 'error',
        processingError: error instanceof Error ? error.message : 'Erro desconhecido',
      },
    })

    return false
  }
}

/**
 * Loop principal do worker
 */
async function workerLoop() {
  console.log(`\n${'▓'.repeat(80)}`)
  console.log(`🤖 PDF PROCESSOR WORKER - INICIADO`)
  console.log(`${'▓'.repeat(80)}`)
  console.log(`⏱️  Intervalo de verificação: ${CHECK_INTERVAL_MS / 1000}s`)
  console.log(`🔄 Máximo de tentativas: ${MAX_RETRY_ATTEMPTS}`)
  console.log(`⏰ Iniciado em: ${new Date().toLocaleString('pt-BR')}`)
  console.log(`${'▓'.repeat(80)}\n`)

  while (true) {
    try {
      if (!isProcessing) {
        // Buscar materiais pendentes
        const pendingMaterials = await findPendingMaterials()

        if (pendingMaterials.length > 0) {
          isProcessing = true

          console.log(`\n📋 Encontrado(s) ${pendingMaterials.length} material(is) pendente(s)`)

          // Processar o primeiro da fila
          const material = pendingMaterials[0]
          await processMaterial(material)

          isProcessing = false
        } else {
          // Nenhum material pendente
          const timestamp = new Date().toLocaleTimeString('pt-BR')
          process.stdout.write(`\r⏳ [${timestamp}] Aguardando materiais pendentes...`)
        }
      }

      // Aguardar antes da próxima verificação
      await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL_MS))
    } catch (error) {
      console.error('\n❌ Erro no loop do worker:', error)
      isProcessing = false

      // Aguardar um pouco mais em caso de erro
      await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL_MS * 2))
    }
  }
}

/**
 * Tratamento de sinais para encerramento gracioso
 */
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Recebido sinal de interrupção (SIGINT)')
  console.log('🔄 Encerrando worker...')

  await prisma.$disconnect()
  console.log('✅ Worker encerrado com sucesso')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Recebido sinal de término (SIGTERM)')
  console.log('🔄 Encerrando worker...')

  await prisma.$disconnect()
  console.log('✅ Worker encerrado com sucesso')
  process.exit(0)
})

// Iniciar worker
workerLoop().catch((error) => {
  console.error('❌ Erro fatal no worker:', error)
  process.exit(1)
})
