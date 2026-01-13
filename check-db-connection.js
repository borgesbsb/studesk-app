const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkConnection() {
  console.log('🔍 Verificando conexão com banco de dados...\n')

  try {
    // Contar materiais
    const materialCount = await prisma.materialEstudo.count()
    console.log(`📊 Total de materiais no banco: ${materialCount}`)

    // Listar últimos 5 materiais
    const materials = await prisma.materialEstudo.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nome: true,
        createdAt: true,
      }
    })

    console.log('\n📝 Últimos 5 materiais:')
    materials.forEach((m, i) => {
      console.log(`${i + 1}. ${m.id} - ${m.nome}`)
    })

    // Buscar material específico
    const targetId = 'cmjymezjz0007c99rjvn3gnp1'
    const material = await prisma.materialEstudo.findUnique({
      where: { id: targetId }
    })

    console.log(`\n🎯 Material ${targetId}:`, material ? 'ENCONTRADO ✅' : 'NÃO ENCONTRADO ❌')

  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkConnection()
