const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const materials = await prisma.materialEstudo.findMany({
    where: { tipo: 'PDF' },
    select: {
      id: true,
      nome: true,
      arquivoPdfUrl: true,
    },
    take: 5,
  })

  console.log('📚 Materiais PDF disponíveis:')
  materials.forEach(m => {
    console.log(`  - ID: ${m.id}`)
    console.log(`    Nome: ${m.nome}`)
    console.log(`    Arquivo: ${m.arquivoPdfUrl}`)
    console.log('')
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
