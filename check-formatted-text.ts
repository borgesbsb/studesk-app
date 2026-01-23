import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkFormattedText() {
  try {
    // Buscar último texto formatado
    const mobileText = await prisma.pdfMobileText.findFirst({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        materialId: true,
        formattedText: true,
        aiModel: true,
        tokensUsed: true,
        createdAt: true
      }
    })

    if (!mobileText) {
      console.log('❌ Nenhum texto formatado encontrado no banco')
      return
    }

    console.log('📄 Texto formatado encontrado:')
    console.log('   ID:', mobileText.id)
    console.log('   Material ID:', mobileText.materialId)
    console.log('   Modelo IA:', mobileText.aiModel)
    console.log('   Tokens usados:', mobileText.tokensUsed)
    console.log('   Criado em:', mobileText.createdAt)
    console.log('')
    console.log('📊 ANÁLISE DO TEXTO:')
    console.log('   Tamanho total:', mobileText.formattedText.length, 'caracteres')

    // Contar quebras de linha
    const newlineCount = (mobileText.formattedText.match(/\n/g) || []).length
    const doubleNewlineCount = (mobileText.formattedText.match(/\n\n/g) || []).length
    const tripleNewlineCount = (mobileText.formattedText.match(/\n\n\n/g) || []).length

    console.log('   Quebras de linha simples (\\n):', newlineCount)
    console.log('   Quebras de linha duplas (\\n\\n):', doubleNewlineCount)
    console.log('   Quebras de linha triplas (\\n\\n\\n):', tripleNewlineCount)

    // Contar marcadores de página
    const pageMarkers = (mobileText.formattedText.match(/\[PAGE_\d+\]/g) || [])
    console.log('   Marcadores de página:', pageMarkers.length)
    if (pageMarkers.length > 0) {
      console.log('   Marcadores:', pageMarkers.join(', '))
    }

    // Dividir em parágrafos
    const paragraphs = mobileText.formattedText.split('\n\n')
    console.log('   Parágrafos (separados por \\n\\n):', paragraphs.length)

    // Mostrar tamanho médio de parágrafo
    const avgParagraphLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length
    console.log('   Tamanho médio de parágrafo:', Math.round(avgParagraphLength), 'caracteres')

    // Encontrar parágrafos muito longos (sem quebras de linha)
    const longParagraphs = paragraphs.filter(p => p.length > 1000 && !p.includes('\n'))
    console.log('   Parágrafos muito longos (>1000 chars sem \\n):', longParagraphs.length)

    console.log('')
    console.log('🔍 PRIMEIROS 1000 CARACTERES:')
    console.log('─'.repeat(80))
    console.log(mobileText.formattedText.substring(0, 1000))
    console.log('─'.repeat(80))

    console.log('')
    console.log('🔍 CARACTERES 5000-6000 (meio do texto):')
    console.log('─'.repeat(80))
    console.log(mobileText.formattedText.substring(5000, 6000))
    console.log('─'.repeat(80))

    // Mostrar um parágrafo longo de exemplo se houver
    if (longParagraphs.length > 0) {
      console.log('')
      console.log('⚠️  EXEMPLO DE PARÁGRAFO MUITO LONGO (primeiros 500 chars):')
      console.log('─'.repeat(80))
      console.log(longParagraphs[0].substring(0, 500) + '...')
      console.log('─'.repeat(80))
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkFormattedText()
