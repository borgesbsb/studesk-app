const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const materialId = 'cmjm98x060001c9wqri24taxc'
  
  console.log('🗑️  Deletando registro de processamento...')
  
  const result = await prisma.pdfMobileText.deleteMany({
    where: { materialId }
  })
  
  console.log(`✅ Deletado ${result.count} registro(s)`)
  console.log('👍 Pronto para processar novamente do zero!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
