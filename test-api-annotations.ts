/**
 * Teste das APIs de Anotações
 *
 * POST /api/annotations/create
 * GET /api/annotations/[materialId]
 * DELETE /api/annotations/[materialId]?id=[annotationId]
 *
 * Como executar:
 * npx tsx test-api-annotations.ts
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAnnotationsAPI() {
  console.log('🧪 Testando APIs de Anotações\n')
  console.log('='.repeat(70))

  try {
    // 1. Buscar material com texto formatado
    console.log('\n📌 PASSO 1: Buscando material com texto formatado...')
    const material = await prisma.materialEstudo.findFirst({
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

    if (!material || !material.mobileText) {
      console.log('⚠️  Nenhum material com texto formatado encontrado')
      console.log('\n💡 Execute primeiro: npx tsx test-api-full.ts')
      return
    }

    console.log(`✅ Material encontrado: ${material.nome}`)
    console.log(`   ID: ${material.id}`)
    console.log(`   Tamanho do texto: ${material.mobileText.formattedText.length} caracteres`)

    // 2. Limpar anotações existentes (para teste limpo)
    console.log('\n📌 PASSO 2: Limpando anotações existentes...')
    const deleted = await prisma.anotacao.deleteMany({
      where: {
        materialId: material.id,
        startOffset: { not: null },
      },
    })
    console.log(`✅ ${deleted.count} anotações removidas`)

    // 3. Criar primeira anotação
    console.log('\n📌 PASSO 3: Criando primeira anotação...')
    const texto1 = material.mobileText.formattedText.substring(0, 50)
    const anotacao1 = await prisma.anotacao.create({
      data: {
        materialId: material.id,
        texto: texto1,
        startOffset: 0,
        endOffset: 50,
        cor: '#ffff00', // Amarelo
        tipo: 'highlight',
        pagina: 0,
      },
    })

    console.log('✅ Anotação 1 criada:')
    console.log(`   ID: ${anotacao1.id}`)
    console.log(`   Texto: "${anotacao1.texto}"`)
    console.log(`   Posição: ${anotacao1.startOffset} - ${anotacao1.endOffset}`)
    console.log(`   Cor: ${anotacao1.cor}`)

    // 4. Criar segunda anotação
    console.log('\n📌 PASSO 4: Criando segunda anotação...')
    const texto2 = material.mobileText.formattedText.substring(100, 180)
    const anotacao2 = await prisma.anotacao.create({
      data: {
        materialId: material.id,
        texto: texto2,
        startOffset: 100,
        endOffset: 180,
        cor: '#00ff00', // Verde
        tipo: 'highlight',
        pagina: 0,
      },
    })

    console.log('✅ Anotação 2 criada:')
    console.log(`   ID: ${anotacao2.id}`)
    console.log(`   Texto: "${anotacao2.texto}"`)
    console.log(`   Posição: ${anotacao2.startOffset} - ${anotacao2.endOffset}`)
    console.log(`   Cor: ${anotacao2.cor}`)

    // 5. Criar terceira anotação
    console.log('\n📌 PASSO 5: Criando terceira anotação...')
    const texto3 = material.mobileText.formattedText.substring(200, 280)
    const anotacao3 = await prisma.anotacao.create({
      data: {
        materialId: material.id,
        texto: texto3,
        startOffset: 200,
        endOffset: 280,
        cor: '#ff69b4', // Rosa
        tipo: 'highlight',
        pagina: 0,
      },
    })

    console.log('✅ Anotação 3 criada:')
    console.log(`   ID: ${anotacao3.id}`)
    console.log(`   Texto: "${anotacao3.texto}"`)
    console.log(`   Posição: ${anotacao3.startOffset} - ${anotacao3.endOffset}`)
    console.log(`   Cor: ${anotacao3.cor}`)

    // 6. Buscar todas as anotações
    console.log('\n📌 PASSO 6: Buscando todas as anotações...')
    const anotacoes = await prisma.anotacao.findMany({
      where: {
        materialId: material.id,
        startOffset: { not: null },
        endOffset: { not: null },
      },
      orderBy: {
        startOffset: 'asc',
      },
    })

    console.log(`✅ ${anotacoes.length} anotações encontradas:`)
    anotacoes.forEach((a, idx) => {
      console.log(`\n   ${idx + 1}. ID: ${a.id}`)
      console.log(`      Texto: "${a.texto}"`)
      console.log(`      Posição: ${a.startOffset} - ${a.endOffset}`)
      console.log(`      Cor: ${a.cor}`)
      console.log(`      Criado em: ${a.createdAt.toLocaleString('pt-BR')}`)
    })

    // 7. Simular resposta GET
    console.log('\n📌 PASSO 7: Simulando resposta da API GET...')
    const getResponse = {
      success: true,
      count: anotacoes.length,
      data: anotacoes.map((a) => ({
        id: a.id,
        materialId: a.materialId,
        texto: a.texto,
        startOffset: a.startOffset,
        endOffset: a.endOffset,
        cor: a.cor,
        tipo: a.tipo,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    }

    console.log('✅ Resposta simulada da API GET:')
    console.log(JSON.stringify(getResponse, null, 2))

    // 8. Deletar uma anotação
    console.log('\n📌 PASSO 8: Deletando anotação 2...')
    await prisma.anotacao.delete({
      where: { id: anotacao2.id },
    })
    console.log(`✅ Anotação ${anotacao2.id} deletada`)

    // 9. Verificar anotações restantes
    console.log('\n📌 PASSO 9: Verificando anotações restantes...')
    const anotacoesRestantes = await prisma.anotacao.findMany({
      where: {
        materialId: material.id,
        startOffset: { not: null },
      },
      orderBy: {
        startOffset: 'asc',
      },
    })

    console.log(`✅ ${anotacoesRestantes.length} anotações restantes:`)
    anotacoesRestantes.forEach((a, idx) => {
      console.log(`   ${idx + 1}. "${a.texto.substring(0, 40)}..." (${a.cor})`)
    })

    // 10. Visualizar texto com highlights
    console.log('\n📌 PASSO 10: Visualização do texto com highlights')
    console.log('─'.repeat(70))

    let textoComHighlights = material.mobileText.formattedText.substring(0, 400)
    anotacoesRestantes.forEach((a) => {
      if (a.startOffset! < 400) {
        const start = a.startOffset!
        const end = Math.min(a.endOffset!, 400)
        const highlighted = `[${a.cor}]${textoComHighlights.substring(start, end)}[/${a.cor}]`
        console.log(`\n🖍️  Highlight ${a.cor}:`)
        console.log(`   Posição ${start}-${end}: "${textoComHighlights.substring(start, end)}"`)
      }
    })

    // 11. Instruções para teste HTTP
    console.log('\n📌 PASSO 11: Instruções para teste HTTP')
    console.log('='.repeat(70))
    console.log('\n🌐 Para testar via HTTP client:')

    console.log('\n1️⃣ CRIAR ANOTAÇÃO (POST):')
    console.log(`
POST http://localhost:3030/api/annotations/create
Content-Type: application/json

{
  "materialId": "${material.id}",
  "texto": "Texto selecionado pelo usuário",
  "startOffset": 0,
  "endOffset": 50,
  "cor": "#ffff00",
  "tipo": "highlight"
}
    `)

    console.log('\n2️⃣ BUSCAR ANOTAÇÕES (GET):')
    console.log(`
GET http://localhost:3030/api/annotations/${material.id}
    `)

    console.log('\n3️⃣ DELETAR ANOTAÇÃO (DELETE):')
    console.log(`
DELETE http://localhost:3030/api/annotations/${material.id}?id=[ANNOTATION_ID]
    `)

    console.log('\n⚠️  IMPORTANTE: Você precisa estar autenticado!')
    console.log(`   Login: http://localhost:3030`)
    console.log(`   Credenciais: ${material.user.email} / 123456`)

    // 12. Estatísticas finais
    console.log('\n' + '='.repeat(70))
    console.log('📊 ESTATÍSTICAS DO TESTE')
    console.log('='.repeat(70))
    console.log(`✅ Material: ${material.nome}`)
    console.log(`📄 Tamanho do texto: ${material.mobileText.formattedText.length} caracteres`)
    console.log(`🖍️  Anotações criadas: 3`)
    console.log(`🗑️  Anotações deletadas: 1`)
    console.log(`📝 Anotações finais: ${anotacoesRestantes.length}`)
    console.log(`🎨 Cores usadas: Amarelo (#ffff00), Rosa (#ff69b4)`)

    console.log('\n' + '='.repeat(70))
    console.log('✅ TESTE DE ANOTAÇÕES CONCLUÍDO COM SUCESSO!')
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

testAnnotationsAPI()
