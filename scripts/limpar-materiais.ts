/**
 * Script para limpar todos os materiais do banco de dados
 * Mantém apenas as disciplinas
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function limparMateriais() {
  console.log('🧹 Iniciando limpeza de materiais...\n')

  try {
    // 1. Deletar todos os relacionamentos Material-Disciplina
    console.log('📋 Deletando relacionamentos DisciplinaMaterial...')
    const disciplinaMaterial = await prisma.disciplinaMaterial.deleteMany({})
    console.log(`✅ ${disciplinaMaterial.count} relacionamentos deletados\n`)

    // 2. Deletar histórico de leitura
    console.log('📖 Deletando histórico de leitura...')
    const historicoLeitura = await prisma.historicoLeitura.deleteMany({})
    console.log(`✅ ${historicoLeitura.count} registros de histórico deletados\n`)

    // 3. Deletar todos os materiais
    console.log('📚 Deletando materiais de estudo...')
    const materiais = await prisma.materialEstudo.deleteMany({})
    console.log(`✅ ${materiais.count} materiais deletados\n`)

    console.log('✨ Limpeza concluída com sucesso!')
    console.log('\n📊 Resumo:')
    console.log(`   - ${disciplinaMaterial.count} relacionamentos removidos`)
    console.log(`   - ${historicoLeitura.count} históricos removidos`)
    console.log(`   - ${materiais.count} materiais removidos`)
    console.log('\n✅ Disciplinas mantidas intactas')

  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

limparMateriais()
  .then(() => {
    console.log('\n🎉 Script finalizado!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Falha na execução:', error)
    process.exit(1)
  })
