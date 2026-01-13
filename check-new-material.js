const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkMaterial() {
  const materialId = 'cmjyo0adt000jc99r6taw46zb'

  console.log('🔍 Verificando material:', materialId)

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

  console.log('\n📋 MATERIAL:')
  console.log('Nome:', material.nome)
  console.log('Total Páginas:', material.totalPaginas)

  if (material.mobileText) {
    const mobileText = material.mobileText
    console.log('\n📊 MOBILE TEXT:')
    console.log('Total Pages:', mobileText.totalPages)
    console.log('Processed Pages:', mobileText.processedPages)
    console.log('Last Processed Page:', mobileText.lastProcessedPage)
    console.log('Status:', mobileText.processingStatus)

    // Verificar marcadores
    const formattedText = mobileText.formattedText || ''
    const pageMarkers = []
    const pageRegex = /\[PAGE_(\d+)\]/g
    let match
    while ((match = pageRegex.exec(formattedText)) !== null) {
      pageMarkers.push(parseInt(match[1]))
    }

    console.log('\n📄 PÁGINAS ENCONTRADAS:', pageMarkers.length)
    console.log('Primeiras 10 páginas:', pageMarkers.slice(0, 10).join(', '))

    const hasPage1 = formattedText.includes('[PAGE_1]')
    console.log('\n✅ [PAGE_1] presente?', hasPage1 ? 'SIM ✅' : 'NÃO ❌')

    if (hasPage1) {
      console.log('\n🎉 SUCESSO! As primeiras páginas foram salvas corretamente!')
    } else {
      console.log('\n❌ PROBLEMA: Páginas 1-5 ainda estão faltando')
    }
  } else {
    console.log('\n❌ Mobile text não existe')
  }

  await prisma.$disconnect()
}

checkMaterial().catch(console.error)
