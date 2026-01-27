#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const userId = 'cmk8x1gpt0001kxqifdq7r6tg'

  console.log('📊 Verificando URLs dos PDFs\n')

  const materiais = await prisma.materialEstudo.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      nome: true,
      arquivoPdfUrl: true,
      fonteOrigem: true,
      createdAt: true
    }
  })

  console.log(`Total de materiais: ${materiais.length}\n`)

  materiais.forEach((mat, index) => {
    const fonte = mat.fonteOrigem?.includes('Google Drive') ? '🌐 Google Drive' : '📤 Upload Local'
    console.log(`${index + 1}. ${fonte}`)
    console.log(`   Nome: ${mat.nome}`)
    console.log(`   URL: ${mat.arquivoPdfUrl}`)
    console.log(`   Criado: ${mat.createdAt.toLocaleString('pt-BR')}`)
    console.log('')
  })

  await prisma.$disconnect()
}

main().catch(console.error)
