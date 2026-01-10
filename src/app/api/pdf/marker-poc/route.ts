import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { promisify } from 'util'

const readFile = promisify(fs.readFile)

export async function POST(request: NextRequest) {
  try {
    // Autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { materialId } = body

    if (!materialId) {
      return NextResponse.json(
        { success: false, error: 'materialId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar material e verificar ownership
    const material = await prisma.materialEstudo.findUnique({
      where: {
        id: materialId,
        userId: session.user.id
      }
    })

    if (!material) {
      return NextResponse.json(
        { success: false, error: 'Material não encontrado' },
        { status: 404 }
      )
    }

    if (!material.arquivoPdfUrl) {
      return NextResponse.json(
        { success: false, error: 'Material não possui arquivo PDF' },
        { status: 400 }
      )
    }

    // Obter caminho do arquivo PDF
    const pdfPath = path.join(process.cwd(), 'public', material.arquivoPdfUrl)

    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json(
        { success: false, error: 'Arquivo PDF não encontrado no disco' },
        { status: 404 }
      )
    }

    // Criar diretório temporário para output
    const outputDir = path.join('/tmp', `marker-output-${Date.now()}`)
    fs.mkdirSync(outputDir, { recursive: true })

    console.log('🔄 Processando PDF com marker-pdf...')
    console.log('📄 Arquivo:', pdfPath)
    console.log('📁 Output:', outputDir)

    // Executar marker-pdf via Python
    const markerPath = path.join(process.cwd(), 'venv', 'bin', 'marker_single')

    const startTime = Date.now()

    // Executar marker_single
    const markerProcess = spawn(markerPath, [
      pdfPath,
      '--output_dir',
      outputDir,
      '--disable_multiprocessing'
    ])

    let stdout = ''
    let stderr = ''

    markerProcess.stdout.on('data', (data) => {
      stdout += data.toString()
      console.log('marker-pdf stdout:', data.toString())
    })

    markerProcess.stderr.on('data', (data) => {
      stderr += data.toString()
      console.error('marker-pdf stderr:', data.toString())
    })

    // Aguardar conclusão do processo
    await new Promise((resolve, reject) => {
      markerProcess.on('close', (code) => {
        if (code === 0) {
          resolve(null)
        } else {
          reject(new Error(`marker-pdf exited with code ${code}`))
        }
      })
      markerProcess.on('error', reject)
    })

    const processingTime = Date.now() - startTime

    // Ler arquivo markdown gerado
    const files = fs.readdirSync(outputDir)
    const mdFile = files.find(f => f.endsWith('.md'))

    if (!mdFile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Arquivo markdown não foi gerado',
          stdout,
          stderr
        },
        { status: 500 }
      )
    }

    const markdownPath = path.join(outputDir, mdFile)
    const markdownContent = await readFile(markdownPath, 'utf-8')

    // Limpar diretório temporário
    fs.rmSync(outputDir, { recursive: true, force: true })

    console.log(`✅ Processamento concluído em ${processingTime}ms`)

    return NextResponse.json({
      success: true,
      data: {
        markdown: markdownContent,
        processingTimeMs: processingTime,
        wordCount: markdownContent.split(/\s+/).length,
        charCount: markdownContent.length,
        method: 'marker-pdf',
        stdout: stdout.substring(0, 1000), // Primeiros 1000 chars para debug
      }
    })

  } catch (error) {
    console.error('❌ Erro ao processar PDF com marker-pdf:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao processar PDF',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
