const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const materialId = 'cmjvt6t4j000bc94y997l9vhe'

  // Buscar todos os chunks deste material
  const chunks = await prisma.chunkCache.findMany({
    where: { materialId },
    orderBy: { pageNumber: 'asc' },
    select: {
      id: true,
      pageNumber: true,
      chunkIndex: true,
      rawText: true,
      createdAt: true
    }
  })

  console.log(`\n📊 Total de chunks: ${chunks.length}`)
  console.log(`📄 Páginas únicas: ${new Set(chunks.map(c => c.pageNumber)).size}`)

  // Agrupar por página
  const byPage = {}
  chunks.forEach(chunk => {
    if (!byPage[chunk.pageNumber]) {
      byPage[chunk.pageNumber] = []
    }
    byPage[chunk.pageNumber].push(chunk)
  })

  console.log('\n📋 Chunks por página:')
  Object.keys(byPage).sort((a, b) => Number(a) - Number(b)).forEach(pageNum => {
    const pageChunks = byPage[pageNum]
    console.log(`  Página ${pageNum}: ${pageChunks.length} chunks`)

    // Verificar se há duplicação
    const chunkTexts = pageChunks.map(c => c.rawText?.substring(0, 50))
    const uniqueTexts = new Set(chunkTexts)
    if (uniqueTexts.size < chunkTexts.length) {
      console.log(`    ⚠️  DUPLICAÇÃO DETECTADA!`)
    }
  })

  // Buscar MobileText
  const mobileText = await prisma.mobileText.findUnique({
    where: { materialId },
    select: {
      formattedText: true
    }
  })

  if (mobileText) {
    const text = mobileText.formattedText
    console.log(`\n📱 MobileText length: ${text.length} caracteres`)

    // Contar marcadores de página
    const pageMarkers = text.match(/\[PAGE_\d+\]/g) || []
    console.log(`📄 Marcadores de página no texto: ${pageMarkers.length}`)

    // Verificar duplicação de marcadores
    const pageNumbers = pageMarkers.map(m => m.match(/\d+/)[0])
    const uniquePages = new Set(pageNumbers)
    console.log(`📄 Páginas únicas nos marcadores: ${uniquePages.size}`)

    if (uniquePages.size < pageNumbers.length) {
      console.log(`⚠️  DUPLICAÇÃO DE MARCADORES DETECTADA!`)

      // Mostrar quais páginas estão duplicadas
      const counts = {}
      pageNumbers.forEach(num => {
        counts[num] = (counts[num] || 0) + 1
      })

      console.log('\n🔍 Páginas duplicadas:')
      Object.keys(counts).forEach(num => {
        if (counts[num] > 1) {
          console.log(`  Página ${num}: ${counts[num]} vezes`)
        }
      })
    }
  } else {
    console.log('\n❌ MobileText não encontrado')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
