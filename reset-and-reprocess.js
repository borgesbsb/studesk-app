const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function resetAndReprocess() {
  const materialId = 'cmjymezjz0007c99rjvn3gnp1'

  console.log('🔄 Resetando processamento do material:', materialId)

  // Deletar registro de PdfMobileText
  const deleted = await prisma.pdfMobileText.deleteMany({
    where: { materialId }
  })

  console.log('✅ Deletado', deleted.count, 'registro(s) de PdfMobileText')

  console.log('\n📝 Agora execute o processamento novamente via API:')
  console.log('\nURL para iniciar processamento em background:')
  console.log(`POST http://localhost:3030/api/pdf/start-background-processing`)
  console.log(`Body: { "materialId": "${materialId}" }`)

  console.log('\nOu use este comando curl:')
  console.log(`curl -X POST http://localhost:3030/api/pdf/start-background-processing \\
  -H "Content-Type: application/json" \\
  -d '{"materialId": "${materialId}"}'`)

  await prisma.$disconnect()
}

resetAndReprocess().catch(console.error)
