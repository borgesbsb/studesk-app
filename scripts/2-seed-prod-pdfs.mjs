#!/usr/bin/env node

/**
 * Script 2: Carregar PDFs - Área Fiscal
 *
 * Este script:
 * 1. Lista PDFs de cada disciplina no Google Drive
 * 2. Copia PDFs para /var/www/studesk-app/public/uploads/[userId]
 * 3. Cadastra PDFs no banco de dados
 * 4. Associa PDFs às disciplinas
 *
 * IMPORTANTE: Execute no servidor de produção!
 * IMPORTANTE: Requer rclone configurado com Google Drive
 */

import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

const USER_EMAIL = 'borgesbsb.dev@gmail.com'
const GOOGLE_DRIVE_REMOTE = 'Google-Drive:'
const AREA_FISCAL_PATH = 'Área Fiscal'

// Modo: 'test' (5 PDFs por disciplina) ou 'full' (todos os PDFs)
const MODE = 'test' // Mude para 'full' quando estiver pronto

// Mapeamento de disciplinas para pastas no Google Drive
const DISCIPLINAS_MAP = {
  'Auditoria': 'Auditoria',
  'Contabilidade Geral': 'Contabilidade Geral',
  'Direito Administrativo': 'Direito Administrativo',
  'Direito Constitucional': 'Direito Constitucional',
  'Direito Previdenciário': 'Direito Previdenciario',
  'Direito Tributário': 'Direito Tributário',
  'Economia e Finanças Públicas': 'Economia e Finanças Públicas',
  'Estatística': 'Estatística',
  'Língua Portuguesa': 'Lingua Portuguesa',
  'Raciocínio Lógico Matemático': 'Raciocínio Lógico Matemático'
}

async function main() {
  console.log(`📄 Carregando PDFs - Área Fiscal (modo: ${MODE})\n`)

  // 1. Buscar usuário
  console.log(`🔍 Buscando usuário ${USER_EMAIL}...`)
  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL }
  })

  if (!user) {
    throw new Error(`Usuário ${USER_EMAIL} não encontrado`)
  }
  console.log(`✅ Usuário: ${user.id}\n`)

  // 2. Buscar disciplinas
  console.log('📚 Buscando disciplinas...')
  const disciplinas = await prisma.disciplina.findMany({
    where: { userId: user.id },
    orderBy: { nome: 'asc' }
  })

  if (disciplinas.length === 0) {
    throw new Error('Nenhuma disciplina encontrada. Execute primeiro: node scripts/1-seed-prod-disciplinas.mjs')
  }
  console.log(`✅ ${disciplinas.length} disciplinas encontradas\n`)

  // 3. Criar diretório de uploads
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', user.id)
  if (!existsSync(uploadsDir)) {
    console.log('📁 Criando diretório de uploads...')
    await mkdir(uploadsDir, { recursive: true })
    console.log(`✅ Criado: ${uploadsDir}\n`)
  }

  // 4. Processar cada disciplina
  let totalPdfsProcessed = 0
  let totalPdfsSuccess = 0
  let totalPdfsError = 0

  for (const disciplina of disciplinas) {
    const gdrivePath = DISCIPLINAS_MAP[disciplina.nome]

    if (!gdrivePath) {
      console.log(`⏭️  ${disciplina.nome} - Sem mapeamento no Google Drive\n`)
      continue
    }

    console.log('='.repeat(60))
    console.log(`📖 ${disciplina.nome}`)
    console.log('='.repeat(60))

    const fullPath = `${GOOGLE_DRIVE_REMOTE}${AREA_FISCAL_PATH}/${gdrivePath}`

    // 4.1. Listar PDFs
    console.log('  🔍 Listando PDFs...')
    const { stdout: pdfList } = await execAsync(
      `rclone ls "${fullPath}" --include "*.pdf" 2>/dev/null || echo ""`
    )

    const pdfs = pdfList
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.trim().split(/\s+/)
        const size = parseInt(parts[0])
        const name = parts.slice(1).join(' ')
        return { name, size }
      })

    console.log(`  ✅ ${pdfs.length} PDFs encontrados`)

    // 4.2. Selecionar PDFs baseado no modo
    const pdfsToProcess = MODE === 'test' ? pdfs.slice(0, 5) : pdfs
    console.log(`  📥 Processando ${pdfsToProcess.length} PDFs...\n`)

    for (const pdf of pdfsToProcess) {
      totalPdfsProcessed++

      try {
        // Encontrar caminho completo do PDF
        const { stdout: findPath } = await execAsync(
          `rclone lsf "${fullPath}" --files-only --include "*${pdf.name}" --recursive`
        )

        const relativePath = findPath.trim().split('\n')[0]
        if (!relativePath) {
          console.log(`    ⚠️  [${totalPdfsProcessed}] ${pdf.name} - Não encontrado`)
          totalPdfsError++
          continue
        }

        const sourcePath = `${fullPath}/${relativePath}`
        const sanitizedName = pdf.name.replace(/\s+/g, '-')
        const destFileName = sanitizedName

        // Verificar se já existe no banco
        const existing = await prisma.materialEstudo.findFirst({
          where: {
            userId: user.id,
            nome: pdf.name.replace('.pdf', '')
          }
        })

        if (existing) {
          console.log(`    ⏭️  [${totalPdfsProcessed}] ${pdf.name} - Já existe`)
          totalPdfsSuccess++
          continue
        }

        // Copiar arquivo
        await execAsync(`rclone copy "${sourcePath}" "${uploadsDir}/" --progress`)

        // Cadastrar no banco
        // IMPORTANTE: Usar /uploads (caminho estático) e não /api/uploads
        const fileUrl = `/uploads/${user.id}/${destFileName}`

        const material = await prisma.materialEstudo.create({
          data: {
            userId: user.id,
            nome: pdf.name.replace('.pdf', ''),
            tipo: 'PDF',
            totalPaginas: 1, // Será atualizado depois
            paginasLidas: 0,
            arquivoPdfUrl: fileUrl,
            fonteOrigem: `Google Drive: ${sourcePath}`
          }
        })

        // Associar à disciplina
        await prisma.disciplinaMaterial.create({
          data: {
            disciplinaId: disciplina.id,
            materialId: material.id
          }
        })

        totalPdfsSuccess++
        console.log(`    ✅ [${totalPdfsProcessed}] ${pdf.name}`)
      } catch (error) {
        totalPdfsError++
        console.log(`    ❌ [${totalPdfsProcessed}] ${pdf.name} - Erro: ${error.message}`)
      }
    }

    console.log('')
  }

  // 5. Resumo final
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO DA CARGA DE PDFs')
  console.log('='.repeat(60))
  console.log(`✅ Sucesso:  ${totalPdfsSuccess}`)
  console.log(`❌ Erro:     ${totalPdfsError}`)
  console.log(`📄 Total:    ${totalPdfsProcessed}`)
  console.log('='.repeat(60))

  if (MODE === 'test') {
    console.log('\n⚠️  MODO TESTE - Apenas 5 PDFs por disciplina foram processados')
    console.log('   Para processar todos, edite MODE = "full" no script\n')
  }

  console.log('\n📌 Próximo passo: node scripts/3-seed-prod-videos.mjs\n')
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
