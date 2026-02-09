#!/usr/bin/env node

/**
 * Script: Limpar todos os vídeos do banco de produção
 *
 * Remove:
 * 1. HistoricoLeitura dos vídeos
 * 2. DisciplinaMaterial (associações)
 * 3. MaterialEstudo com tipo='VIDEO'
 *
 * Uso: node scripts/clean-videos.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Limpando TODOS os vídeos do banco...\n')

  // 1. Buscar todos os materiais tipo VIDEO
  const videos = await prisma.materialEstudo.findMany({
    where: { tipo: 'VIDEO' },
    select: { id: true, nome: true }
  })

  console.log(`📹 ${videos.length} vídeos encontrados\n`)

  if (videos.length === 0) {
    console.log('✅ Nenhum vídeo para remover.')
    return
  }

  const videoIds = videos.map(v => v.id)

  // 2. Deletar HistoricoLeitura dos vídeos
  const deletedHistorico = await prisma.historicoLeitura.deleteMany({
    where: { materialId: { in: videoIds } }
  })
  console.log(`  🗑️  ${deletedHistorico.count} registros de histórico removidos`)

  // 3. Deletar DisciplinaMaterial (associações)
  const deletedAssociacoes = await prisma.disciplinaMaterial.deleteMany({
    where: { materialId: { in: videoIds } }
  })
  console.log(`  🗑️  ${deletedAssociacoes.count} associações disciplina-material removidas`)

  // 4. Deletar os materiais de vídeo
  const deletedMateriais = await prisma.materialEstudo.deleteMany({
    where: { tipo: 'VIDEO' }
  })
  console.log(`  🗑️  ${deletedMateriais.count} vídeos removidos`)

  console.log('\n✅ Limpeza concluída!')
  console.log('   Agora execute o seed de vídeos atualizado para recarregar com nomes ordenados.')
}

main()
  .catch((e) => {
    console.error('\n❌ Erro:', e.message)
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
