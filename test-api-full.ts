/**
 * Teste COMPLETO da API /api/pdf/format-for-reader
 *
 * Este teste simula o fluxo completo sem precisar de autenticação HTTP
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import { OpenAIFormatService } from './src/application/services/openai-format.service'
import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'

const prisma = new PrismaClient()

async function testFullAPILogic() {
  console.log('🧪 TESTE COMPLETO: API /api/pdf/format-for-reader\n')
  console.log('=' .repeat(70))

  try {
    //  1. Buscar material
    console.log('\n📌 PASSO 1: Buscando material PDF...')
    const material = await prisma.materialEstudo.findFirst({
      where: {
        tipo: 'PDF',
        arquivoPdfUrl: { not: null },
      },
      include: {
        mobileText: true,
      },
    })

    if (!material) {
      console.error('❌ Nenhum material encontrado')
      return
    }

    console.log(`✅ Material: ${material.nome}`)
    console.log(`   ID: ${material.id}`)
    console.log(`   Arquivo: ${material.arquivoPdfUrl}`)

    // 2. Verificar cache
    console.log('\n📌 PASSO 2: Verificando cache...')
    if (material.mobileText) {
      console.log('ℹ️  Cache encontrado! Deletando para testar processamento fresco...')
      await prisma.pdfMobileText.delete({
        where: { id: material.mobileText.id }
      })
      console.log('✅ Cache removido')
    } else {
      console.log('✅ Sem cache (primeira vez)')
    }

    // 3. Extrair texto do PDF
    console.log('\n📌 PASSO 3: Extraindo texto do PDF...')
    const pdfPath = path.join(process.cwd(), 'public', material.arquivoPdfUrl!)

    if (!fs.existsSync(pdfPath)) {
      console.error(`❌ PDF não encontrado: ${pdfPath}`)
      return
    }

    const dataBuffer = fs.readFileSync(pdfPath)
    const pdfData = await pdfParse(dataBuffer)
    const rawText = pdfData.text

    // Pegar apenas primeiras 3000 caracteres para teste rápido
    const testText = rawText.substring(0, 3000)

    console.log(`✅ Texto extraído!`)
    console.log(`   Total de páginas: ${pdfData.numpages}`)
    console.log(`   Total de caracteres: ${rawText.length}`)
    console.log(`   Usando para teste: ${testText.length} caracteres (3 páginas aprox)`)

    // 4. Formatar com OpenAI
    console.log('\n📌 PASSO 4: Formatando com OpenAI GPT-4o-mini...')
    console.log('⏳ Aguarde, processando com IA...')

    const startTime = Date.now()
    const formatService = new OpenAIFormatService()
    const result = await formatService.formatTextForMobile(testText)
    const endTime = Date.now()

    console.log(`✅ Formatação concluída!`)
    console.log(`   Tempo: ${((endTime - startTime) / 1000).toFixed(2)}s`)
    console.log(`   Tokens usados: ${result.tokensUsed}`)
    console.log(`   Modelo: ${result.model}`)
    console.log(`   Tamanho formatado: ${result.formattedText.length} caracteres`)

    // 5. Salvar no banco
    console.log('\n📌 PASSO 5: Salvando no banco...')
    const mobileText = await prisma.pdfMobileText.create({
      data: {
        materialId: material.id,
        formattedText: result.formattedText,
        rawText: testText,
        aiModel: result.model,
        tokensUsed: result.tokensUsed,
      },
    })

    console.log(`✅ Salvo no banco!`)
    console.log(`   ID: ${mobileText.id}`)

    // 6. Mostrar resultado
    console.log('\n📌 PASSO 6: Resultado da formatação')
    console.log('=' .repeat(70))
    console.log('\n📄 TEXTO ORIGINAL (primeiros 500 chars):')
    console.log('-'.repeat(70))
    console.log(testText.substring(0, 500))
    console.log('-'.repeat(70))

    console.log('\n✨ TEXTO FORMATADO (primeiros 800 chars):')
    console.log('-'.repeat(70))
    console.log(result.formattedText.substring(0, 800))
    console.log('-'.repeat(70))

    // 7. Verificar cache na próxima chamada
    console.log('\n📌 PASSO 7: Testando cache (segunda chamada)...')
    const materialComCache = await prisma.materialEstudo.findUnique({
      where: { id: material.id },
      include: { mobileText: true },
    })

    if (materialComCache?.mobileText) {
      console.log('✅ Cache funcionando!')
      console.log(`   Texto do cache tem ${materialComCache.mobileText.formattedText.length} caracteres`)
      console.log('   Próximas chamadas serão INSTANTÂNEAS e SEM CUSTO')
    }

    // 8. Estatísticas finais
    console.log('\n' + '='.repeat(70))
    console.log('📊 ESTATÍSTICAS DO TESTE')
    console.log('='.repeat(70))
    console.log(`⏱️  Tempo total: ${((endTime - startTime) / 1000).toFixed(2)}s`)
    console.log(`💰 Custo aproximado: $${(result.tokensUsed / 1000000 * 0.15).toFixed(6)} USD`)
    console.log(`📦 Compressão: ${((1 - result.formattedText.length / testText.length) * 100).toFixed(1)}%`)
    console.log(`✅ Cache salvo: SIM`)
    console.log(`💾 Próximas leituras: CUSTO ZERO`)

    console.log('\n' + '='.repeat(70))
    console.log('✅ TESTE COMPLETO COM SUCESSO!')
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

testFullAPILogic()
