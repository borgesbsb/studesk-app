#!/usr/bin/env node

/**
 * Script para corrigir URLs dos PDFs importados pelo Google Drive
 *
 * Problema: PDFs com arquivoPdfUrl = null ou com /api/uploads
 * Solução: Atualizar para /uploads/[userId]/[filename]
 */

import { PrismaClient } from '@prisma/client'
import { readdir } from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()
const userId = 'cmk8x1gpt0001kxqifdq7r6tg'

async function main() {
  console.log('🔧 Corrigindo URLs dos PDFs\n')

  // 1. Buscar materiais PDF com URL null ou incorreta
  const materiais = await prisma.materialEstudo.findMany({
    where: {
      userId,
      tipo: 'PDF',
      OR: [
        { arquivoPdfUrl: null },
        { arquivoPdfUrl: { startsWith: '/api/uploads' } }
      ]
    }
  })

  console.log(`📊 Encontrados ${materiais.length} materiais para corrigir\n`)

  if (materiais.length === 0) {
    console.log('✅ Nenhum material precisa de correção!')
    return
  }

  // 2. Listar arquivos no diretório
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', userId)
  console.log(`📁 Buscando arquivos em: ${uploadsDir}\n`)

  const files = await readdir(uploadsDir)
  console.log(`✅ ${files.length} arquivos encontrados\n`)

  // 3. Corrigir cada material
  let corrigidos = 0
  let naoEncontrados = 0

  for (const material of materiais) {
    // Tentar encontrar o arquivo correspondente
    const nomeNormalizado = material.nome
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()

    const arquivo = files.find(f => {
      const fNormalizado = f
        .replace(/\.pdf$/i, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()

      return fNormalizado.includes(nomeNormalizado) || nomeNormalizado.includes(fNormalizado)
    })

    if (arquivo) {
      const novaUrl = `/uploads/${userId}/${arquivo}`

      await prisma.materialEstudo.update({
        where: { id: material.id },
        data: { arquivoPdfUrl: novaUrl }
      })

      console.log(`✅ ${material.nome}`)
      console.log(`   Arquivo: ${arquivo}`)
      console.log(`   Nova URL: ${novaUrl}\n`)
      corrigidos++
    } else {
      console.log(`⚠️  ${material.nome} - Arquivo não encontrado\n`)
      naoEncontrados++
    }
  }

  console.log('='.repeat(60))
  console.log('📊 RESUMO')
  console.log('='.repeat(60))
  console.log(`✅ Corrigidos: ${corrigidos}`)
  console.log(`⚠️  Não encontrados: ${naoEncontrados}`)
  console.log(`📄 Total: ${materiais.length}`)
  console.log('='.repeat(60))

  await prisma.$disconnect()
}

main().catch(error => {
  console.error('❌ Erro:', error)
  process.exit(1)
})
