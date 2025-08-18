const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function migratePdfUrls() {
  try {
    console.log('🔄 Iniciando migração das URLs dos PDFs...')
    
    // Buscar todos os materiais de estudo
    const materiais = await prisma.materialEstudo.findMany({
      select: {
        id: true,
        arquivoPdfUrl: true,
        nome: true
      }
    })
    
    console.log(`📚 Encontrados ${materiais.length} materiais para migrar`)
    
    let migrados = 0
    let ignorados = 0
    
    for (const material of materiais) {
      if (!material.arquivoPdfUrl) {
        console.log(`⚠️ Material "${material.nome}" não tem URL de PDF`)
        ignorados++
        continue
      }
      
      // Verificar se já está no formato da API
      if (material.arquivoPdfUrl.startsWith('/api/uploads/')) {
        console.log(`✅ Material "${material.nome}" já está no formato correto`)
        ignorados++
        continue
      }
      
      // Converter URL antiga para nova
      let novaUrl = material.arquivoPdfUrl
      
      if (material.arquivoPdfUrl.startsWith('/uploads/')) {
        novaUrl = material.arquivoPdfUrl.replace('/uploads/', '/api/uploads/')
      } else if (!material.arquivoPdfUrl.startsWith('/')) {
        novaUrl = `/api/uploads/${material.arquivoPdfUrl}`
      }
      
      // Atualizar no banco de dados
      await prisma.materialEstudo.update({
        where: { id: material.id },
        data: { arquivoPdfUrl: novaUrl }
      })
      
      console.log(`🔄 Migrado: "${material.nome}"`)
      console.log(`   Antiga: ${material.arquivoPdfUrl}`)
      console.log(`   Nova: ${novaUrl}`)
      
      migrados++
    }
    
    console.log('\n✅ Migração concluída!')
    console.log(`📊 Resumo:`)
    console.log(`   - Migrados: ${migrados}`)
    console.log(`   - Ignorados: ${ignorados}`)
    console.log(`   - Total: ${materiais.length}`)
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar a migração
migratePdfUrls() 