import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
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

    const pdfPath = path.join(process.cwd(), 'public', material.arquivoPdfUrl)

    console.log('🔄 Processando PDF com Docling (5 primeiras páginas)...')
    console.log('📄 Arquivo:', pdfPath)

    const pythonScript = `
import sys
import json
from pathlib import Path
from docling.document_converter import DocumentConverter

pdf_path = sys.argv[1]
converter = DocumentConverter()
result = converter.convert(pdf_path, page_range=(1, 5))
markdown = result.document.export_to_markdown()

print(json.dumps({
  "markdown": markdown,
  "wordCount": len(markdown.split()),
  "charCount": len(markdown)
}))
`

    const startTime = Date.now()

    return new Promise((resolve) => {
      const pythonProcess = spawn('venv/bin/python', ['-c', pythonScript, pdfPath])

      let stdout = ''
      let stderr = ''

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      pythonProcess.on('close', (code) => {
        const processingTime = Date.now() - startTime

        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim().split('\n').pop() || '{}')

            resolve(NextResponse.json({
              success: true,
              data: {
                markdown: result.markdown,
                processingTimeMs: processingTime,
                wordCount: result.wordCount,
                charCount: result.charCount,
                method: 'docling',
                pages: 5
              }
            }))
          } catch (error) {
            resolve(NextResponse.json(
              {
                success: false,
                error: 'Erro ao parsear resultado do Docling',
                stdout: stdout.substring(0, 1000),
                stderr
              },
              { status: 500 }
            ))
          }
        } else {
          resolve(NextResponse.json(
            {
              success: false,
              error: `Docling exited with code ${code}`,
              stderr: stderr.substring(0, 1000)
            },
            { status: 500 }
          ))
        }
      })

      pythonProcess.on('error', (error) => {
        resolve(NextResponse.json(
          {
            success: false,
            error: error.message
          },
          { status: 500 }
        ))
      })
    })

  } catch (error) {
    console.error('❌ Erro ao processar PDF com Docling:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao processar PDF'
      },
      { status: 500 }
    )
  }
}
