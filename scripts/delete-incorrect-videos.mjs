#!/usr/bin/env node

/**
 * Script para deletar vídeos cadastrados INCORRETAMENTE
 * (com arquivoVideoUrl = null)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const USER_EMAIL = 'borgesbsb.dev@gmail.com'

async function main() {
  console.log('🗑️  Deletando vídeos cadastrados incorretamente...\n')

  // 1. Buscar usuário
  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL }
  })

  if (!user) {
    throw new Error(`Usuário ${USER_EMAIL} não encontrado`)
  }

  // 2. Contar vídeos com URL null
  const count = await prisma.materialEstudo.count({
    where: {
      userId: user.id,
      tipo: 'VIDEO',
      arquivoVideoUrl: null
    }
  })

  console.log(`📊 Encontrados ${count} vídeos com arquivoVideoUrl = null\n`)

  if (count === 0) {
    console.log('✅ Nenhum vídeo incorreto encontrado!\n')
    return
  }

  // 3. Deletar associações primeiro
  console.log('🗑️  Deletando associações DisciplinaMaterial...')
  const videosToDelete = await prisma.materialEstudo.findMany({
    where: {
      userId: user.id,
      tipo: 'VIDEO',
      arquivoVideoUrl: null
    },
    select: { id: true }
  })

  const videoIds = videosToDelete.map(v => v.id)

  const deletedAssociations = await prisma.disciplinaMaterial.deleteMany({
    where: {
      materialId: { in: videoIds }
    }
  })

  console.log(`✅ ${deletedAssociations.count} associações deletadas\n`)

  // 4. Deletar vídeos
  console.log('🗑️  Deletando vídeos...')
  const deletedVideos = await prisma.materialEstudo.deleteMany({
    where: {
      userId: user.id,
      tipo: 'VIDEO',
      arquivoVideoUrl: null
    }
  })

  console.log(`✅ ${deletedVideos.count} vídeos deletados\n`)
  console.log('✅ Limpeza concluída!')
}

main()
  .catch((e) => {
    console.error('\n❌ Erro:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
