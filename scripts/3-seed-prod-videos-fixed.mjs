#!/usr/bin/env node

/**
 * Script 3 (CORRIGIDO): Cadastro de Vídeos com Google Drive FileId
 *
 * Este script:
 * 1. Lista vídeos do Google Drive usando rclone lsjson
 * 2. Extrai fileId e nome original de cada vídeo
 * 3. Cadastra no banco com googleDriveFileId e googleDriveFileName
 * 4. Vídeos serão streamados via API usando OAuth tokens
 *
 * IMPORTANTE: Execute após scripts 1 e 2
 */

import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

const USER_EMAIL = 'borgesbsb.dev@gmail.com'
const GOOGLE_DRIVE_REMOTE = 'Google-Drive:'
const AREA_FISCAL_PATH = 'Área Fiscal'

// Modo: 'test' (5 vídeos por disciplina) ou 'full' (todos)
const MODE = 'full' // 'test' = 5 vídeos por disciplina, 'full' = todos

// Mapeamento de disciplinas para pastas do Google Drive
const DISCIPLINAS_MAP = {
  // Nomes do banco local
  'Auditoria Governamental e Controle': 'Auditoria',
  'Auditoria Privada': 'Auditoria',
  'Direito Constitucional ': 'Direito Constitucional',
  'Portugues': 'Lingua Portuguesa',
  'RLM': 'Raciocínio Lógico Matemático',
  // Nomes do banco de produção
  'Auditoria': 'Auditoria',
  'Contabilidade Geral': 'Contabilidade Geral',
  'Direito Administrativo': 'Direito Administrativo',
  'Direito Constitucional': 'Direito Constitucional',
  'Direito Previdenciário': 'Direito Previdenciario',
  'Direito Tributário': 'Direito Tributário',
  'Economia e Finanças Públicas': 'Economia e Finanças Públicas',
  'Estatística': 'Estatística',
  'Estatistica': 'Estatística',
  'Língua Portuguesa': 'Lingua Portuguesa',
  'Português': 'Lingua Portuguesa',
  'Raciocínio Lógico Matemático': 'Raciocínio Lógico Matemático',
}

/**
 * Extrai número da aula da pasta (ex: "AULA01-Organizacao.../videos/file.mp4" => 1)
 */
function extractAulaNumber(path) {
  const match = path.match(/AULA(\d+)/i)
  return match ? parseInt(match[1]) : 999
}

/**
 * Extrai número do vídeo do nome do arquivo (ex: "10-Autarquias.mp4" => 10)
 */
function extractVideoNumber(name) {
  const match = name.match(/^(\d+)/)
  return match ? parseInt(match[1]) : 999
}

/**
 * Formata o número da aula com zero à esquerda (ex: 1 => "01")
 */
function formatAulaNumber(path) {
  const num = extractAulaNumber(path)
  return num === 999 ? '??' : String(num).padStart(2, '0')
}

async function listVideosWithFileId(disciplinaPath) {
  const fullPath = `${GOOGLE_DRIVE_REMOTE}${AREA_FISCAL_PATH}/${disciplinaPath}`

  try {
    // rclone lsjson retorna JSON com fileId (ID), nome, tamanho, etc.
    const { stdout } = await execAsync(
      `rclone lsjson "${fullPath}" --recursive --files-only --include "*.mp4"`
    )

    const files = JSON.parse(stdout)

    // Mapear para formato esperado
    const videos = files.map(file => ({
      fileId: file.ID,           // Google Drive fileId
      name: file.Name,           // Nome original
      path: file.Path,           // Caminho relativo
      size: file.Size,           // Tamanho em bytes
      modTime: file.ModTime      // Data de modificação
    }))

    // Ordenar por número da aula e depois por número do vídeo
    videos.sort((a, b) => {
      const aulaA = extractAulaNumber(a.path)
      const aulaB = extractAulaNumber(b.path)
      if (aulaA !== aulaB) return aulaA - aulaB
      const videoA = extractVideoNumber(a.name)
      const videoB = extractVideoNumber(b.name)
      return videoA - videoB
    })

    return videos

  } catch (error) {
    console.error(`    ❌ Erro ao listar vídeos: ${error.message}`)
    return []
  }
}

function estimateDurationFromSize(sizeBytes) {
  // Estimativa: 1MB ≈ 1 segundo de vídeo (bitrate médio)
  const sizeMB = sizeBytes / (1024 * 1024)
  return Math.round(sizeMB)
}

async function main() {
  console.log(`🎬 Carregando Vídeos (Google Drive) - Área Fiscal (modo: ${MODE})\n`)

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
    throw new Error('Nenhuma disciplina encontrada. Execute primeiro o script 1.')
  }
  console.log(`✅ ${disciplinas.length} disciplinas encontradas\n`)

  let successCount = 0
  let errorCount = 0

  // 3. Processar cada disciplina
  for (const disciplina of disciplinas) {
    const folderName = DISCIPLINAS_MAP[disciplina.nome]
    if (!folderName) {
      console.log(`⚠️  Disciplina ${disciplina.nome} não mapeada, pulando...\n`)
      continue
    }

    console.log('='.repeat(60))
    console.log(`📖 ${disciplina.nome}`)
    console.log('='.repeat(60))

    // Listar vídeos com fileId
    console.log('  🔍 Listando vídeos (.mp4) com fileId...')
    const videos = await listVideosWithFileId(folderName)

    if (videos.length === 0) {
      console.log('  ℹ️  Nenhum vídeo encontrado\n')
      continue
    }

    console.log(`  ✅ ${videos.length} vídeos encontrados`)

    // Selecionar vídeos baseado no modo
    const videosToProcess = MODE === 'test' ? videos.slice(0, 5) : videos
    console.log(`  📹 Cadastrando ${videosToProcess.length} vídeos (Google Drive)...\n`)

    // Cadastrar cada vídeo
    for (let i = 0; i < videosToProcess.length; i++) {
      const video = videosToProcess[i]
      const num = i + 1

      try {
        // Verificar se vídeo já existe (por googleDriveFileId)
        const existing = await prisma.materialEstudo.findFirst({
          where: {
            userId: user.id,
            googleDriveFileId: video.fileId
          }
        })

        if (existing) {
          console.log(`    ⏭️  [${num}] ${video.name} (já existe)`)
          continue
        }

        // Estimar duração baseada no tamanho
        const estimatedDuration = estimateDurationFromSize(video.size)

        // Construir fonte de origem (caminho no Google Drive)
        const sourcePath = `${AREA_FISCAL_PATH}/${folderName}/${video.path}`

        // Nome com prefixo de aula para ordenação (ex: "Aula 01 - 3-Nome-do-Video")
        const aulaPrefix = `Aula ${formatAulaNumber(video.path)}`
        const videoName = video.name.replace('.mp4', '')
        const materialNome = `${aulaPrefix} - ${videoName}`

        // Cadastrar no banco com Google Drive fileId
        const material = await prisma.materialEstudo.create({
          data: {
            userId: user.id,
            nome: materialNome,
            tipo: 'VIDEO',
            totalPaginas: 0,
            paginasLidas: 0,
            duracaoSegundos: estimatedDuration,
            tempoAssistido: 0,
            arquivoVideoUrl: `gdrive://${video.fileId}`, // Marker para Google Drive
            googleDriveFileId: video.fileId,              // FileId para streaming
            googleDriveFileName: video.name,              // Nome original
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

        console.log(`    ✅ [${num}] ${video.name}`)
        console.log(`        FileId: ${video.fileId}`)
        console.log(`        Tamanho: ${(video.size / (1024 * 1024)).toFixed(2)} MB`)
        console.log(`        Duração estimada: ${Math.floor(estimatedDuration / 60)}min ${estimatedDuration % 60}s`)
        successCount++

      } catch (error) {
        console.log(`    ❌ [${num}] ${video.name}`)
        console.log(`        Erro: ${error.message}`)
        errorCount++
      }
    }

    console.log('') // Linha em branco
  }

  // 4. Resumo final
  console.log('='.repeat(60))
  console.log('📊 RESUMO DA CARGA DE VÍDEOS')
  console.log('='.repeat(60))
  console.log(`✅ Sucesso:  ${successCount}`)
  console.log(`❌ Erro:     ${errorCount}`)
  console.log(`🎬 Total:    ${successCount + errorCount}`)
  console.log('='.repeat(60))

  if (MODE === 'test') {
    console.log('\n⚠️  MODO TESTE - Apenas 5 vídeos por disciplina foram cadastrados')
    console.log('   Para cadastrar todos, edite MODE = "full" no script\n')
  }

  console.log('\n📌 Nota: Vídeos serão streamados do Google Drive via API')
  console.log('   Use arquivoVideoUrl com prefixo "gdrive://" para identificar')
  console.log('   API usará googleDriveFileId para gerar URLs de streaming\n')
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
