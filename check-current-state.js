const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkCurrentState() {
  const materialId = 'cmjymezjz0007c99rjvn3gnp1'

  console.log('🔍 Verificando estado ATUAL do PdfMobileText...\n')

  const mobileText = await prisma.pdfMobileText.findFirst({
    where: { materialId }
  })

  if (!mobileText) {
    console.log('❌ PdfMobileText não existe')
    return
  }

  console.log('📊 ESTADO COMPLETO:')
  console.log(JSON.stringify(mobileText, null, 2))

  console.log('\n🔑 CAMPOS CRÍTICOS:')
  console.log('lastProcessedPage:', mobileText.lastProcessedPage)
  console.log('processedPages:', mobileText.processedPages)
  console.log('totalPages:', mobileText.totalPages)
  console.log('processingStatus:', mobileText.processingStatus)

  console.log('\n💡 ANÁLISE:')
  console.log('Se lastProcessedPage = 5, então:')
  console.log('  currentPage = lastProcessedPage + 1 = 6')
  console.log('  Isso explicaria por que começamos na página 6!')

  await prisma.$disconnect()
}

checkCurrentState().catch(console.error)
