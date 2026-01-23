#!/usr/bin/env node

/**
 * Script 4: Iniciar Processamento de PDFs em Background
 *
 * Este script:
 * 1. Lista todos os PDFs carregados sem processamento
 * 2. Envia requisição para iniciar processamento em background via API
 * 3. Monitora progresso através do banco de dados
 *
 * IMPORTANTE: Execute após scripts 1, 2 e 3
 * IMPORTANTE: O servidor Next.js DEVE estar rodando (PM2)
 */

import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

const USER_EMAIL = 'borgesbsb.dev@gmail.com'
const API_BASE_URL = 'http://localhost:3030'

// Modo: 'test' (5 PDFs) ou 'full' (todos os PDFs)
const MODE = 'test' // Mude para 'full' quando estiver pronto

async function main() {
  console.log(`🎬 Iniciando Processamento de PDFs (modo: ${MODE})\n`)

  // 1. Buscar usuário
  console.log(`🔍 Buscando usuário ${USER_EMAIL}...`)
  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL }
  })

  if (!user) {
    throw new Error(`Usuário ${USER_EMAIL} não encontrado`)
  }
  console.log(`✅ Usuário: ${user.id}\n`)

  // 2. Buscar PDFs sem processamento
  console.log('📚 Buscando PDFs sem processamento...')
  const pdfs = await prisma.materialEstudo.findMany({
    where: {
      userId: user.id,
      tipo: 'PDF',
      mobileText: null // PDFs que ainda não têm registro de processamento
    },
    orderBy: { createdAt: 'asc' }
  })

  if (pdfs.length === 0) {
    console.log('✅ Todos os PDFs já foram processados!\n')
    return
  }

  console.log(`✅ ${pdfs.length} PDFs encontrados sem processamento\n`)

  // 3. Selecionar PDFs baseado no modo
  const pdfsToProcess = MODE === 'test' ? pdfs.slice(0, 5) : pdfs
  console.log(`🚀 Processando ${pdfsToProcess.length} PDFs...\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < pdfsToProcess.length; i++) {
    const pdf = pdfsToProcess[i]
    const num = i + 1

    console.log('='.repeat(60))
    console.log(`[${num}/${pdfsToProcess.length}] ${pdf.nome}`)
    console.log('='.repeat(60))

    try {
      // Disparar processamento via API
      console.log('  🚀 Enviando requisição para API...')

      const response = await fetch(`${API_BASE_URL}/api/pdf/start-background-processing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ materialId: pdf.id })
      })

      if (!response.ok) {
        throw new Error(`API retornou erro: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log(`  ✅ Processamento iniciado: ${result.message}`)
      successCount++

      // Aguardar 2 segundos entre requisições para não sobrecarregar
      if (i < pdfsToProcess.length - 1) {
        console.log('  ⏳ Aguardando 2s antes do próximo...\n')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

    } catch (error) {
      console.log(`  ❌ Erro ao iniciar processamento: ${error.message}`)
      errorCount++
    }
  }

  // 4. Resumo final
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO DO DISPARO DE PROCESSAMENTOS')
  console.log('='.repeat(60))
  console.log(`✅ Sucesso:  ${successCount}`)
  console.log(`❌ Erro:     ${errorCount}`)
  console.log(`📄 Total:    ${pdfsToProcess.length}`)
  console.log('='.repeat(60))

  if (MODE === 'test') {
    console.log('\n⚠️  MODO TESTE - Apenas 5 PDFs foram disparados')
    console.log('   Para processar todos, edite MODE = "full" no script\n')
  }

  console.log('\n💡 DICA: Acompanhe o processamento nos logs do PM2:')
  console.log('   pm2 logs studesk --lines 100\n')
  console.log('\n📌 Para verificar progresso no banco:')
  console.log('   SELECT COUNT(*) FROM "PdfMobileText" WHERE "processingStatus" = \'complete\';\n')
}

main()
  .catch((e) => {
    console.error('\n❌ Erro:', e.message)
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
