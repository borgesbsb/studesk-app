/**
 * Script para testar processamento em background de PDFs
 *
 * Como usar:
 * 1. Certifique-se de que o servidor está rodando (npm run dev)
 * 2. Execute: node test-background-processing.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verificarProcessamento() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('🔍 VERIFICANDO PROCESSAMENTO DE PDFs')
    console.log('='.repeat(80) + '\n')

    // Buscar todos os materiais PDF
    const materiais = await prisma.materialEstudo.findMany({
      where: { tipo: 'PDF' },
      orderBy: { createdAt: 'desc' },
      take: 10, // Últimos 10 materiais
    })

    if (materiais.length === 0) {
      console.log('⚠️  Nenhum material PDF encontrado no banco de dados')
      return
    }

    console.log(`📊 Encontrados ${materiais.length} materiais PDF:\n`)

    // Para cada material, verificar status de processamento
    for (const material of materiais) {
      console.log('─'.repeat(80))
      console.log(`📄 Material: ${material.nome}`)
      console.log(`   ID: ${material.id}`)
      console.log(`   URL: ${material.arquivoPdfUrl}`)
      console.log(`   Criado em: ${material.createdAt.toLocaleString('pt-BR')}`)
      console.log(`   Total de páginas: ${material.totalPaginas || 'não informado'}`)

      // Buscar registro de processamento
      const mobileText = await prisma.pdfMobileText.findUnique({
        where: { materialId: material.id },
      })

      if (!mobileText) {
        console.log(`   ❌ Status: PROCESSAMENTO NÃO INICIADO`)
        console.log(`   💡 Ação: Tente criar o material novamente ou chamar manualmente o processamento`)
      } else {
        const progress = mobileText.totalPages > 0
          ? Math.round((mobileText.processedPages / mobileText.totalPages) * 100)
          : 0

        console.log(`   📊 Status: ${mobileText.processingStatus}`)
        console.log(`   📈 Progresso: ${mobileText.processedPages}/${mobileText.totalPages} páginas (${progress}%)`)
        console.log(`   📅 Processado em: ${mobileText.processedAt?.toLocaleString('pt-BR') || 'em processamento'}`)
        console.log(`   🤖 Modelo IA: ${mobileText.aiModel}`)
        console.log(`   💰 Tokens usados: ${mobileText.tokensUsed || 0}`)

        if (mobileText.processingError) {
          console.log(`   ❌ Erro: ${mobileText.processingError}`)
        }

        // Indicador visual de progresso
        const barLength = 40
        const filledLength = Math.round((progress / 100) * barLength)
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength)
        console.log(`   [${bar}] ${progress}%`)
      }

      console.log()
    }

    console.log('='.repeat(80))
    console.log('✅ Verificação concluída')
    console.log('='.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Erro ao verificar processamento:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verificarProcessamento()
