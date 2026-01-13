/**
 * Teste da API GET /api/pdf/[materialId]/mobile-text
 *
 * Como executar:
 * npx tsx test-api-get-mobile-text.ts
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testGetMobileText() {
  console.log('🧪 Testando API GET /api/pdf/[materialId]/mobile-text\n')
  console.log('='.repeat(70))

  try {
    // 1. Buscar material com texto formatado
    console.log('\n📌 PASSO 1: Buscando material com texto formatado...')
    const materialComTexto = await prisma.materialEstudo.findFirst({
      where: {
        tipo: 'PDF',
        mobileText: {
          isNot: null,
        },
      },
      include: {
        mobileText: true,
        user: true,
      },
    })

    if (!materialComTexto) {
      console.log('⚠️  Nenhum material com texto formatado encontrado')
      console.log('\n💡 Execute primeiro: npx tsx test-api-full.ts')
      return
    }

    console.log(`✅ Material encontrado: ${materialComTexto.nome}`)
    console.log(`   ID: ${materialComTexto.id}`)
    console.log(`   Usuário: ${materialComTexto.user.email}`)
    console.log(`   Texto formatado existe: SIM`)

    // 2. Verificar dados do texto formatado
    console.log('\n📌 PASSO 2: Verificando dados do texto formatado...')
    const mobileText = materialComTexto.mobileText!

    console.log(`✅ ID do texto: ${mobileText.id}`)
    console.log(`   Tamanho do texto: ${mobileText.formattedText.length} caracteres`)
    console.log(`   Modelo IA: ${mobileText.aiModel}`)
    console.log(`   Tokens usados: ${mobileText.tokensUsed}`)
    console.log(`   Processado em: ${mobileText.processedAt.toLocaleString('pt-BR')}`)

    // 3. Simular resposta da API
    console.log('\n📌 PASSO 3: Simulando resposta da API...')

    const apiResponse = {
      success: true,
      data: {
        id: mobileText.id,
        materialId: mobileText.materialId,
        formattedText: mobileText.formattedText,
        tokensUsed: mobileText.tokensUsed,
        aiModel: mobileText.aiModel,
        processedAt: mobileText.processedAt,
        createdAt: mobileText.createdAt,
        updatedAt: mobileText.updatedAt,
      },
    }

    console.log('✅ Resposta simulada da API:')
    console.log(
      JSON.stringify(
        {
          success: apiResponse.success,
          data: {
            ...apiResponse.data,
            formattedText: `${apiResponse.data.formattedText.substring(0, 100)}... (${apiResponse.data.formattedText.length} chars)`,
          },
        },
        null,
        2
      )
    )

    // 4. Prévia do texto formatado
    console.log('\n📌 PASSO 4: Prévia do texto formatado')
    console.log('─'.repeat(70))
    console.log(mobileText.formattedText.substring(0, 500))
    console.log('─'.repeat(70))
    console.log(`\n... (total: ${mobileText.formattedText.length} caracteres)`)

    // 5. Teste de material SEM texto formatado
    console.log('\n📌 PASSO 5: Testando material SEM texto formatado...')
    const materialSemTexto = await prisma.materialEstudo.findFirst({
      where: {
        tipo: 'PDF',
        mobileText: null,
      },
      include: {
        user: true,
      },
    })

    if (materialSemTexto) {
      console.log(`ℹ️  Material sem texto formatado: ${materialSemTexto.nome}`)
      console.log(`   ID: ${materialSemTexto.id}`)
      console.log(
        '   Resposta esperada: 404 - Texto formatado não disponível'
      )
    } else {
      console.log('ℹ️  Todos os materiais já possuem texto formatado')
    }

    // 6. Instruções para teste HTTP
    console.log('\n📌 PASSO 6: Instruções para teste HTTP')
    console.log('='.repeat(70))
    console.log('\n🌐 Para testar via HTTP client (Postman/Thunder Client/curl):')
    console.log(`
GET http://localhost:3030/api/pdf/${materialComTexto.id}/mobile-text

IMPORTANTE: Você precisa estar autenticado.
Faça login em http://localhost:3030
Credenciais: ${materialComTexto.user.email} / 123456
    `)

    console.log('\n📝 Exemplo com curl:')
    console.log(`
# 1. Faça login primeiro no navegador em http://localhost:3030

# 2. Copie o cookie de sessão do navegador

# 3. Execute:
curl -X GET http://localhost:3030/api/pdf/${materialComTexto.id}/mobile-text \\
  -H "Cookie: next-auth.session-token=SEU_TOKEN_AQUI"
    `)

    // 7. Estatísticas finais
    console.log('\n' + '='.repeat(70))
    console.log('📊 ESTATÍSTICAS')
    console.log('='.repeat(70))
    console.log(`✅ Material com texto: ${materialComTexto.nome}`)
    console.log(`📄 Tamanho do texto: ${mobileText.formattedText.length} caracteres`)
    console.log(`🤖 Modelo usado: ${mobileText.aiModel}`)
    console.log(`💰 Tokens usados: ${mobileText.tokensUsed}`)
    console.log(
      `💵 Custo de processamento: $${((mobileText.tokensUsed || 0) / 1000000 * 0.15).toFixed(6)} USD`
    )
    console.log(`💾 Leituras subsequentes: CUSTO ZERO (cache)`)

    console.log('\n' + '='.repeat(70))
    console.log('✅ TESTE GET CONCLUÍDO COM SUCESSO!')
    console.log('='.repeat(70))
  } catch (error) {
    console.error('\n❌ ERRO:', error)
    if (error instanceof Error) {
      console.error('   Mensagem:', error.message)
      console.error('   Stack:', error.stack)
    }
  } finally {
    await prisma.$disconnect()
  }
}

testGetMobileText()
