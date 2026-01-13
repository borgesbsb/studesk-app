const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function deleteAndReprocess() {
  const materialId = 'cmjyo0adt000jc99r6taw46zb'

  console.log('🗑️  Deletando PdfMobileText do material:', materialId)

  const deleted = await prisma.pdfMobileText.deleteMany({
    where: { materialId }
  })

  console.log('✅ Deletado', deleted.count, 'registro(s)')

  console.log('\n🚀 Agora reprocesse com:')
  console.log(`\ncurl -X POST http://localhost:3030/api/pdf/start-background-processing \\
  -H "Content-Type: application/json" \\
  -d '{"materialId": "${materialId}"}'`)

  console.log('\n✅ Com a correção implementada:')
  console.log('1. Processa páginas 1-5')
  console.log('2. RECARREGA mobileText do banco ← CORREÇÃO!')
  console.log('3. Processa páginas 6-15 com dados atualizados')
  console.log('4. Todas as páginas serão salvas corretamente!')

  await prisma.$disconnect()
}

deleteAndReprocess().catch(console.error)
