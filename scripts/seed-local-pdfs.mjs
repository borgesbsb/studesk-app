#!/usr/bin/env node

/**
 * Script: Importar PDFs locais de /home/borgesbsb/projetos/concursos/Área Fiscal/
 *
 * Copia PDFs para public/uploads/[userId] e registra no banco.
 */

import { PrismaClient } from '@prisma/client'
import { copyFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

const USER_EMAIL = 'borgesbsb.dev@gmail.com'
const SOURCE_DIR = '/home/borgesbsb/projetos/concursos/Área Fiscal'

// Mapeamento: pasta local → nome da disciplina no banco
const FOLDER_TO_DISCIPLINA = {
  'Auditoria': ['Auditoria Governamental e Controle', 'Auditoria Privada'],
  'Contabilidade Geral': ['Contabilidade Geral'],
  'Direito Administrativo': ['Direito Administrativo'],
  'Direito Tributário': ['Direito Tributário'],
  'Raciocínio Lógico Matemático': ['RLM'],
}

async function main() {
  console.log('📄 Importando PDFs locais para o Studesk\n')

  // 1. Buscar usuário
  const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } })
  if (!user) throw new Error(`Usuário ${USER_EMAIL} não encontrado`)
  console.log(`✅ Usuário: ${user.id}\n`)

  // 2. Buscar disciplinas
  const disciplinas = await prisma.disciplina.findMany({
    where: { userId: user.id },
  })
  const discMap = Object.fromEntries(disciplinas.map(d => [d.nome.trim(), d]))

  // 3. Criar diretório de uploads
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', user.id)
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true })
  }

  let totalSuccess = 0
  let totalSkipped = 0
  let totalError = 0

  // 4. Processar cada pasta
  for (const [folder, discNames] of Object.entries(FOLDER_TO_DISCIPLINA)) {
    const folderPath = path.join(SOURCE_DIR, folder)
    if (!existsSync(folderPath)) {
      console.log(`⏭️  Pasta não encontrada: ${folder}\n`)
      continue
    }

    console.log('='.repeat(60))
    console.log(`📖 ${folder} → ${discNames.join(', ')}`)
    console.log('='.repeat(60))

    // Listar PDFs recursivamente
    const { stdout } = await execAsync(`find "${folderPath}" -name "*.pdf" -type f`)
    const pdfPaths = stdout.trim().split('\n').filter(Boolean)

    if (pdfPaths.length === 0) {
      console.log('  ℹ️  Nenhum PDF encontrado\n')
      continue
    }

    console.log(`  📥 ${pdfPaths.length} PDFs encontrados\n`)

    // Buscar disciplinas no banco
    const targetDisciplinas = discNames
      .map(name => discMap[name])
      .filter(Boolean)

    if (targetDisciplinas.length === 0) {
      console.log(`  ❌ Disciplinas não encontradas no banco: ${discNames.join(', ')}\n`)
      totalError += pdfPaths.length
      continue
    }

    for (const pdfPath of pdfPaths) {
      const fileName = path.basename(pdfPath)
      const nomeMaterial = fileName.replace('.pdf', '')

      try {
        // Verificar se já existe no banco
        const existing = await prisma.materialEstudo.findFirst({
          where: {
            userId: user.id,
            nome: nomeMaterial,
          }
        })

        if (existing) {
          console.log(`    ⏭️  ${fileName} (já existe)`)
          totalSkipped++
          continue
        }

        // Copiar para uploads
        const destPath = path.join(uploadsDir, fileName)
        await copyFile(pdfPath, destPath)

        const fileUrl = `/uploads/${user.id}/${fileName}`

        // Criar material no banco
        const material = await prisma.materialEstudo.create({
          data: {
            userId: user.id,
            nome: nomeMaterial,
            tipo: 'PDF',
            totalPaginas: 0,
            paginasLidas: 0,
            arquivoPdfUrl: fileUrl,
            fonteOrigem: `Local: ${pdfPath}`
          }
        })

        // Associar à primeira disciplina mapeada
        await prisma.disciplinaMaterial.create({
          data: {
            disciplinaId: targetDisciplinas[0].id,
            materialId: material.id
          }
        })

        console.log(`    ✅ ${fileName} → ${targetDisciplinas[0].nome.trim()}`)
        totalSuccess++
      } catch (error) {
        console.log(`    ❌ ${fileName} - Erro: ${error.message}`)
        totalError++
      }
    }

    console.log('')
  }

  // 5. Resumo
  console.log('='.repeat(60))
  console.log('📊 RESUMO DA IMPORTAÇÃO')
  console.log('='.repeat(60))
  console.log(`✅ Importados: ${totalSuccess}`)
  console.log(`⏭️  Pulados:    ${totalSkipped}`)
  console.log(`❌ Erros:      ${totalError}`)
  console.log('='.repeat(60))
}

main()
  .catch((e) => {
    console.error('\n❌ Erro:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
