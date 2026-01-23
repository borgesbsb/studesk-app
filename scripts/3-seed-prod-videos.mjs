#!/usr/bin/env node

/**
 * Script 3: Carregar Vídeos (Metadados) - Área Fiscal
 *
 * Este script:
 * 1. Lista vídeos de cada disciplina no Google Drive
 * 2. Cadastra APENAS METADADOS dos vídeos no banco (não copia arquivos)
 * 3. Armazena caminho do Google Drive em fonteOrigem
 * 4. Associa vídeos às disciplinas
 *
 * IMPORTANTE: Execute no servidor de produção!
 * IMPORTANTE: Requer rclone configurado com Google Drive
 * IMPORTANTE: Vídeos NÃO são copiados, ficam no Google Drive
 */

import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

const USER_EMAIL = 'borgesbsb.dev@gmail.com'
const GOOGLE_DRIVE_REMOTE = 'Google-Drive:'
const AREA_FISCAL_PATH = 'Área Fiscal'

// Modo: 'test' (5 vídeos por disciplina) ou 'full' (todos os vídeos)
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
  console.log(`🎬 Carregando Vídeos (metadados) - Área Fiscal (modo: ${MODE})\n`)

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

  // 3. Processar cada disciplina
  let totalVideosProcessed = 0
  let totalVideosSuccess = 0
  let totalVideosError = 0

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

    // 3.1. Listar Vídeos
    console.log('  🔍 Listando vídeos (.mp4)...')
    const { stdout: videoList } = await execAsync(
      `rclone ls "${fullPath}" --include "*.mp4" 2>/dev/null || echo ""`
    )

    const videos = videoList
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.trim().split(/\s+/)
        const size = parseInt(parts[0])
        const name = parts.slice(1).join(' ')
        return { name, size }
      })

    if (videos.length === 0) {
      console.log(`  ⏭️  Nenhum vídeo encontrado\n`)
      continue
    }

    console.log(`  ✅ ${videos.length} vídeos encontrados`)

    // 3.2. Selecionar vídeos baseado no modo
    const videosToProcess = MODE === 'test' ? videos.slice(0, 5) : videos
    console.log(`  📹 Cadastrando ${videosToProcess.length} vídeos (apenas metadados)...\n`)

    for (const video of videosToProcess) {
      totalVideosProcessed++

      try {
        // Encontrar caminho completo do vídeo
        const { stdout: findPath } = await execAsync(
          `rclone lsf "${fullPath}" --files-only --include "*${video.name}" --recursive`
        )

        const relativePath = findPath.trim().split('\n')[0]
        if (!relativePath) {
          console.log(`    ⚠️  [${totalVideosProcessed}] ${video.name} - Não encontrado`)
          totalVideosError++
          continue
        }

        const sourcePath = `${fullPath}/${relativePath}`

        // Verificar se já existe no banco
        const existing = await prisma.materialEstudo.findFirst({
          where: {
            userId: user.id,
            nome: video.name.replace('.mp4', '')
          }
        })

        if (existing) {
          console.log(`    ⏭️  [${totalVideosProcessed}] ${video.name} - Já existe`)
          totalVideosSuccess++
          continue
        }

        // Cadastrar no banco (APENAS METADADOS, sem copiar arquivo)
        const material = await prisma.materialEstudo.create({
          data: {
            userId: user.id,
            nome: video.name.replace('.mp4', ''),
            tipo: 'VIDEO',
            totalPaginas: 0,
            paginasLidas: 0,
            duracaoSegundos: 0, // Será atualizado depois se necessário
            tempoAssistido: 0,
            arquivoVideoUrl: null, // Vídeo fica no Google Drive
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

        totalVideosSuccess++
        console.log(`    ✅ [${totalVideosProcessed}] ${video.name}`)
      } catch (error) {
        totalVideosError++
        console.log(`    ❌ [${totalVideosProcessed}] ${video.name} - Erro: ${error.message}`)
      }
    }

    console.log('')
  }

  // 4. Resumo final
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO DA CARGA DE VÍDEOS')
  console.log('='.repeat(60))
  console.log(`✅ Sucesso:  ${totalVideosSuccess}`)
  console.log(`❌ Erro:     ${totalVideosError}`)
  console.log(`🎬 Total:    ${totalVideosProcessed}`)
  console.log('='.repeat(60))

  if (MODE === 'test') {
    console.log('\n⚠️  MODO TESTE - Apenas 5 vídeos por disciplina foram processados')
    console.log('   Para processar todos, edite MODE = "full" no script\n')
  }

  console.log('\n✅ Carga de vídeos concluída!')
  console.log('📌 Nota: Vídeos ficam no Google Drive, apenas metadados foram salvos\n')
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
