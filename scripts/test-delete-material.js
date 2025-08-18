const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testDeleteMaterial() {
  try {
    console.log('🔍 Verificando materiais existentes...')
    
    // Listar todos os materiais
    const materiais = await prisma.materialEstudo.findMany({
      select: {
        id: true,
        nome: true,
        arquivoPdfUrl: true,
        _count: {
          select: {
            disciplinas: true,
            historicoPontuacoes: true,
            sessoes: true,
            historicoLeitura: true,
            anotacoes: true
          }
        }
      }
    })
    
    console.log(`📚 Encontrados ${materiais.length} materiais:`)
    
    materiais.forEach((material, index) => {
      console.log(`${index + 1}. ${material.nome}`)
      console.log(`   ID: ${material.id}`)
      console.log(`   Relações: ${material._count.disciplinas} disciplinas, ${material._count.historicoPontuacoes} pontuações, ${material._count.sessoes} sessões, ${material._count.historicoLeitura} leituras, ${material._count.anotacoes} anotações`)
      console.log('')
    })
    
    if (materiais.length === 0) {
      console.log('❌ Nenhum material encontrado para testar')
      return
    }
    
    // Perguntar qual material deletar
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    rl.question('Digite o número do material que deseja deletar (ou "cancel" para cancelar): ', async (answer) => {
      if (answer.toLowerCase() === 'cancel') {
        console.log('❌ Operação cancelada')
        rl.close()
        return
      }
      
      const index = parseInt(answer) - 1
      if (index < 0 || index >= materiais.length) {
        console.log('❌ Número inválido')
        rl.close()
        return
      }
      
      const material = materiais[index]
      
      rl.question(`Tem certeza que deseja deletar "${material.nome}"? (sim/não): `, async (confirm) => {
        if (confirm.toLowerCase() !== 'sim') {
          console.log('❌ Operação cancelada')
          rl.close()
          return
        }
        
        try {
          console.log('🗑️ Iniciando deleção...')
          
          // Verificar relações antes da deleção
          const disciplinas = await prisma.disciplinaMaterial.findMany({
            where: { materialId: material.id }
          })
          
          const chunks = await prisma.chunkUtilizado.findMany({
            where: { materialId: material.id }
          })
          
          console.log(`📊 Relações encontradas:`)
          console.log(`   - DisciplinaMaterial: ${disciplinas.length}`)
          console.log(`   - ChunkUtilizado: ${chunks.length}`)
          
          // Tentar deletar
          await prisma.materialEstudo.delete({
            where: { id: material.id }
          })
          
          console.log('✅ Material deletado com sucesso!')
          
        } catch (error) {
          console.error('❌ Erro ao deletar material:', error.message)
          
          if (error.code === 'P2003') {
            console.log('🔍 Detalhes da violação de chave estrangeira:')
            console.log('   - Verifique se há relações que não foram removidas')
            console.log('   - Execute o script novamente para ver as relações')
          }
        }
        
        rl.close()
      })
    })
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar o teste
testDeleteMaterial() 