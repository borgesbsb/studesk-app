/**
 * Script para processar PDFs pendentes (que não foram processados ainda)
 *
 * Como usar:
 * 1. Certifique-se de que o servidor ESTÁ rodando (npm run dev)
 * 2. Execute: node process-pending-pdfs.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function processarPendentes() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('🔍 BUSCANDO PDFs PENDENTES')
    console.log('='.repeat(80) + '\n')

    // Buscar materiais PDF sem processamento iniciado
    const materiais = await prisma.materialEstudo.findMany({
      where: {
        tipo: 'PDF',
      },
      include: {
        mobileText: true
      }
    })

    if (materiais.length === 0) {
      console.log('✅ Nenhum material PDF encontrado')
      return
    }

    // Filtrar apenas os que não têm processamento iniciado
    const pendentes = materiais.filter(m => !m.mobileText && m.arquivoPdfUrl)

    if (pendentes.length === 0) {
      console.log('✅ Todos os materiais já foram processados ou estão em processamento')
      return
    }

    console.log(`📊 Encontrados ${pendentes.length} materiais pendentes:\n`)

    for (const material of pendentes) {
      console.log('─'.repeat(80))
      console.log(`📄 Material: ${material.nome}`)
      console.log(`   ID: ${material.id}`)
      console.log(`   URL: ${material.arquivoPdfUrl}`)
      console.log(`   Total de páginas: ${material.totalPaginas}`)

      if (!material.arquivoPdfUrl) {
        console.log('   ❌ ERRO: URL do PDF está vazia - pulando este material')
        console.log('   💡 Este material precisa ser re-importado ou re-uploaded')
        continue
      }

      console.log('   🚀 Iniciando processamento via API...')

      try {
        // Chamar API de processamento
        const baseUrl = 'http://localhost:3030'
        const response = await fetch(`${baseUrl}/api/pdf/start-background-processing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ materialId: material.id }),
        })

        if (response.ok) {
          console.log('   ✅ Processamento iniciado! Acompanhe o progresso no terminal do servidor.')
        } else {
          const error = await response.json()
          console.error('   ❌ Erro:', error.error || 'Erro desconhecido')
        }
      } catch (error) {
        console.error('   ❌ Erro ao chamar API:', error.message)
      }

      console.log()
    }

    console.log('='.repeat(80))
    console.log('✅ Comandos de processamento enviados')
    console.log('💡 Os logs de progresso aparecerão no TERMINAL DO SERVIDOR (npm run dev)')
    console.log('='.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Erro geral:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
processarPendentes()
