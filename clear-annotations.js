const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearAnnotations() {
  try {
    console.log('🗑️  Limpando todas as anotações...')

    const result = await prisma.anotacao.deleteMany({})

    console.log(`✅ ${result.count} anotações deletadas com sucesso!`)

    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Erro ao limpar anotações:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

clearAnnotations()
