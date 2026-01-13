/**
 * Script de teste para API /api/pdf/format-for-reader
 *
 * Como executar:
 * npx tsx test-api-format.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testFormatAPI() {
  console.log('🧪 Testando API /api/pdf/format-for-reader\n')

  try {
    // 1. Buscar um material de estudo PDF do banco
    console.log('1️⃣ Buscando material PDF no banco...')
    const material = await prisma.materialEstudo.findFirst({
      where: {
        tipo: 'PDF',
        arquivoPdfUrl: { not: null },
      },
      include: {
        user: true,
      },
    })

    if (!material) {
      console.error('❌ Nenhum material PDF encontrado no banco')
      console.log('\n💡 Dica: Faça upload de um PDF primeiro através da interface')
      return
    }

    console.log(`✅ Material encontrado: ${material.nome}`)
    console.log(`   ID: ${material.id}`)
    console.log(`   Usuário: ${material.user.email}`)
    console.log(`   Arquivo: ${material.arquivoPdfUrl}`)

    // 2. Verificar se já existe texto formatado
    console.log('\n2️⃣ Verificando se já existe texto formatado...')
    const existingText = await prisma.pdfMobileText.findUnique({
      where: { materialId: material.id },
    })

    if (existingText) {
      console.log('✅ Texto formatado já existe (cache):')
      console.log(`   Processado em: ${existingText.processedAt}`)
      console.log(`   Tokens usados: ${existingText.tokensUsed}`)
      console.log(`   Modelo: ${existingText.aiModel}`)
      console.log(`   Tamanho do texto formatado: ${existingText.formattedText.length} caracteres`)
      console.log(`   Tamanho do texto bruto: ${existingText.rawText.length} caracteres`)

      console.log('\n📄 Prévia do texto formatado (primeiros 500 caracteres):')
      console.log('─'.repeat(60))
      console.log(existingText.formattedText.substring(0, 500) + '...')
      console.log('─'.repeat(60))
    } else {
      console.log('ℹ️  Texto formatado não existe ainda')
      console.log('   A API irá processar o PDF na primeira chamada')
    }

    console.log('\n3️⃣ Informações para teste manual:')
    console.log('\n📝 Para testar via HTTP client (Postman/Thunder Client/curl):')
    console.log(`
POST http://localhost:3030/api/pdf/format-for-reader
Content-Type: application/json

{
  "materialId": "${material.id}"
}

IMPORTANTE: Você precisa estar autenticado. Faça login em http://localhost:3030
Credenciais: ${material.user.email} / [sua senha]
    `)

    console.log('\n4️⃣ Status dos arquivos:')
    const fs = require('fs')
    const path = require('path')
    const pdfPath = path.join(process.cwd(), 'public', material.arquivoPdfUrl!)

    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath)
      console.log(`✅ Arquivo PDF existe`)
      console.log(`   Caminho: ${pdfPath}`)
      console.log(`   Tamanho: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
    } else {
      console.log(`❌ Arquivo PDF não encontrado em: ${pdfPath}`)
    }

    console.log('\n✅ Teste de verificação concluído!')
    console.log('\n💡 Próximos passos:')
    console.log('   1. Faça login na aplicação web')
    console.log('   2. Use o Prisma Studio para ver os dados: http://localhost:5555')
    console.log('   3. Teste a API usando um cliente HTTP com os dados acima')

  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testFormatAPI()
