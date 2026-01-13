const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkPages() {
  const materialId = 'cmjymezjz0007c99rjvn3gnp1'

  console.log('🔍 Verificando material:', materialId)

  // Buscar material
  const material = await prisma.materialEstudo.findUnique({
    where: { id: materialId },
    include: {
      mobileText: true
    }
  })

  if (!material) {
    console.log('❌ Material não encontrado')
    return
  }

  console.log('\n📋 INFORMAÇÕES DO MATERIAL:')
  console.log('Nome:', material.nome)
  console.log('Total de páginas:', material.totalPaginas)
  console.log('PDF URL:', material.arquivoPdfUrl)

  if (!material.mobileText) {
    console.log('\n❌ PdfMobileText não existe para este material')
    return
  }

  const mobileText = material.mobileText

  console.log('\n📊 INFORMAÇÕES DO PROCESSAMENTO:')
  console.log('Total Pages:', mobileText.totalPages)
  console.log('Processed Pages:', mobileText.processedPages)
  console.log('Last Processed Page:', mobileText.lastProcessedPage)
  console.log('Processing Status:', mobileText.processingStatus)
  console.log('Tokens Used:', mobileText.tokensUsed)
  console.log('AI Model:', mobileText.aiModel)

  // Verificar se há padrões detectados
  if (mobileText.headerFooterPatterns) {
    const patterns = JSON.parse(mobileText.headerFooterPatterns)
    console.log('\n🔍 PADRÕES DETECTADOS:', patterns.length)
    patterns.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.type.toUpperCase()}: "${p.description}"`)
    })
  }

  // Analisar o texto formatado
  const formattedText = mobileText.formattedText || ''

  console.log('\n📝 ANÁLISE DO TEXTO FORMATADO:')
  console.log('Tamanho total:', formattedText.length, 'caracteres')

  // Procurar marcadores de página
  const pageMarkers = []
  const pageRegex = /\[PAGE_(\d+)\]/g
  let match
  while ((match = pageRegex.exec(formattedText)) !== null) {
    pageMarkers.push(parseInt(match[1]))
  }

  console.log('\n📄 MARCADORES DE PÁGINA ENCONTRADOS:', pageMarkers.length)
  console.log('Páginas detectadas:', pageMarkers.sort((a, b) => a - b).join(', '))

  // Verificar se as primeiras 5 páginas estão presentes
  const missingPages = []
  for (let i = 1; i <= 5; i++) {
    if (!pageMarkers.includes(i)) {
      missingPages.push(i)
    }
  }

  if (missingPages.length > 0) {
    console.log('\n❌ PÁGINAS FALTANDO (1-5):', missingPages.join(', '))
  } else {
    console.log('\n✅ Todas as primeiras 5 páginas estão presentes!')
  }

  // Verificar se há páginas além da 5
  const pagesAbove5 = pageMarkers.filter(p => p > 5)
  if (pagesAbove5.length > 0) {
    console.log('\n📌 Páginas além da 5:', pagesAbove5.length, 'páginas')
    console.log('   Primeira página acima de 5:', Math.min(...pagesAbove5))
    console.log('   Última página:', Math.max(...pageMarkers))
  }

  // Mostrar primeiros 1000 caracteres do texto formatado
  console.log('\n📄 PRIMEIROS 1000 CARACTERES DO TEXTO:')
  console.log('─'.repeat(80))
  console.log(formattedText.substring(0, 1000))
  console.log('─'.repeat(80))

  // Verificar se existe [PAGE_1]
  if (formattedText.includes('[PAGE_1]')) {
    console.log('\n✅ [PAGE_1] encontrado no texto')
    const page1Index = formattedText.indexOf('[PAGE_1]')
    console.log('   Posição no texto:', page1Index)
    console.log('   Texto após [PAGE_1]:', formattedText.substring(page1Index, page1Index + 200))
  } else {
    console.log('\n❌ [PAGE_1] NÃO encontrado no texto!')
  }

  await prisma.$disconnect()
}

checkPages().catch(console.error)
