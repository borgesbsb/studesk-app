#!/usr/bin/env node

/**
 * Script 1: Criar Disciplinas - Área Fiscal
 *
 * Este script:
 * 1. Busca o userId do usuário borgesbsb.dev@gmail.com
 * 2. Cria 10 disciplinas no banco de dados
 *
 * IMPORTANTE: Execute no servidor de produção!
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const USER_EMAIL = 'borgesbsb.dev@gmail.com'

const DISCIPLINAS = [
  { nome: 'Auditoria', cor: '#ef4444' },
  { nome: 'Contabilidade Geral', cor: '#f97316' },
  { nome: 'Direito Administrativo', cor: '#f59e0b' },
  { nome: 'Direito Constitucional', cor: '#84cc16' },
  { nome: 'Direito Previdenciário', cor: '#10b981' },
  { nome: 'Direito Tributário', cor: '#14b8a6' },
  { nome: 'Economia e Finanças Públicas', cor: '#06b6d4' },
  { nome: 'Estatística', cor: '#3b82f6' },
  { nome: 'Língua Portuguesa', cor: '#8b5cf6' },
  { nome: 'Raciocínio Lógico Matemático', cor: '#a855f7' }
]

async function main() {
  console.log('📚 Criando disciplinas - Área Fiscal\n')

  // 1. Buscar usuário
  console.log(`🔍 Buscando usuário ${USER_EMAIL}...`)
  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL }
  })

  if (!user) {
    throw new Error(`Usuário ${USER_EMAIL} não encontrado`)
  }
  console.log(`✅ Usuário encontrado: ${user.id}\n`)

  // 2. Verificar se já existem disciplinas
  const existingCount = await prisma.disciplina.count({
    where: { userId: user.id }
  })

  if (existingCount > 0) {
    console.log(`⚠️  Usuário já possui ${existingCount} disciplinas`)
    console.log('   Deseja continuar e criar mais? (Ctrl+C para cancelar)\n')
  }

  // 3. Criar disciplinas
  console.log('📝 Criando disciplinas...\n')

  for (const disc of DISCIPLINAS) {
    try {
      const disciplina = await prisma.disciplina.create({
        data: {
          userId: user.id,
          nome: disc.nome,
          cor: disc.cor,
          cargaHoraria: 0,
          peso: 1.0
        }
      })
      console.log(`✅ ${disciplina.nome.padEnd(35)} ID: ${disciplina.id}`)
    } catch (error) {
      if (error.code === 'P2002') {
        console.log(`⚠️  ${disc.nome.padEnd(35)} (já existe)`)
      } else {
        throw error
      }
    }
  }

  // 4. Resumo final
  const totalDisciplinas = await prisma.disciplina.count({
    where: { userId: user.id }
  })

  console.log('\n' + '='.repeat(60))
  console.log(`✅ Total de disciplinas: ${totalDisciplinas}`)
  console.log('='.repeat(60))
  console.log('\n📌 Próximo passo: node scripts/2-seed-prod-pdfs.mjs\n')
}

main()
  .catch((e) => {
    console.error('\n❌ Erro:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
