/**
 * Script para resetar processamento de um material específico
 * Uso: node reset-material-processing.js <materialId>
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function resetProcessing() {
  const materialId = process.argv[2]

  if (!materialId) {
    console.error('❌ Por favor, forneça o materialId')
    console.log('Uso: node reset-material-processing.js <materialId>')
    process.exit(1)
  }

  try {
    console.log(`🔄 Resetando processamento do material: ${materialId}`)

    // Deletar registro de processamento existente
    const deleted = await prisma.pdfMobileText.deleteMany({
      where: { materialId },
    })

    console.log(`✅ ${deleted.count} registro(s) deletado(s)`)

    // Resetar total de páginas no material (se existir)
    try {
      await prisma.materialEstudo.update({
        where: { id: materialId },
        data: { totalPaginas: 0 },
      })
      console.log(`✅ Material resetado com sucesso!`)
    } catch (updateError) {
      console.log(`⚠️  Material não encontrado no banco (provavelmente foi deletado)`)
    }

    console.log(`\nProcessamento limpo. Você pode abrir o material novamente.`)
  } catch (error) {
    console.error('❌ Erro ao resetar processamento:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetProcessing()
