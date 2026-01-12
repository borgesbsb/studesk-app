import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { GoogleDriveService } from '@/lib/google-drive'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { nanoid } from 'nanoid'
import { handleCors } from '@/lib/cors'
import { PdfBackgroundProcessorService } from '@/application/services/pdf-background-processor.service'

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200, headers: handleCors(request) })
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const body = await request.json()
    const { fileId, fileName, disciplinaId } = body

    if (!fileId || !fileName) {
      return NextResponse.json(
        { error: 'ID do arquivo e nome são obrigatórios' },
        { status: 400, headers: handleCors(request) }
      )
    }

    if (!disciplinaId) {
      return NextResponse.json(
        { error: 'ID da disciplina é obrigatório' },
        { status: 400, headers: handleCors(request) }
      )
    }

    // Buscar tokens do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleDriveAccessToken: true,
        googleDriveRefreshToken: true,
      },
    })

    if (!user?.googleDriveAccessToken) {
      return NextResponse.json(
        { error: 'Usuário não conectou o Google Drive' },
        { status: 401, headers: handleCors(request) }
      )
    }

    // Criar instância do serviço
    const driveService = new GoogleDriveService(
      user.googleDriveAccessToken,
      user.googleDriveRefreshToken || undefined
    )

    console.log('📥 Baixando PDF do Google Drive...')
    // Baixar PDF do Google Drive
    const pdfBuffer = await driveService.downloadPdfBuffer(fileId)
    console.log(`✅ PDF baixado: ${pdfBuffer.length} bytes`)

    // Gerar nome único para o arquivo
    const uniqueFileName = `${nanoid()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    // Salvar na pasta do usuário (isolamento de dados)
    const uploadDir = join(process.cwd(), 'public', 'uploads', userId)
    const filePath = join(uploadDir, uniqueFileName)

    // Criar diretório do usuário se não existir
    await mkdir(uploadDir, { recursive: true })

    // Salvar arquivo localmente no cache
    console.log(`💾 Salvando PDF no cache: ${filePath}`)
    await writeFile(filePath, pdfBuffer)
    console.log('✅ PDF salvo no cache local')

    // Extrair número de páginas do PDF usando pdf-parse
    console.log('📖 Extraindo metadados do PDF...')
    let totalPaginas = 0
    try {
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(pdfBuffer)
      totalPaginas = data.numpages
      console.log(`✅ PDF processado: ${totalPaginas} páginas`)
    } catch (parseError) {
      console.error('⚠️ Erro ao extrair páginas do PDF:', parseError)
      // Continua mesmo sem conseguir extrair o número de páginas
    }

    // Criar registro no banco de dados
    console.log('💾 Criando registro no banco de dados...')
    const material = await prisma.materialEstudo.create({
      data: {
        userId,
        nome: fileName.replace('.pdf', ''),
        tipo: 'PDF',
        arquivoPdfUrl: `/uploads/${userId}/${uniqueFileName}`,
        totalPaginas: totalPaginas || 0,
        paginasLidas: 0,
        fonteOrigem: `Google Drive (${fileId})`, // Guardar referência do Drive
      },
    })
    console.log(`✅ Material criado: ${material.id}`)

    // Associar material à disciplina
    console.log('🔗 Associando material à disciplina...')
    await prisma.disciplinaMaterial.create({
      data: {
        disciplinaId,
        materialId: material.id,
      },
    })
    console.log(`✅ Material associado à disciplina ${disciplinaId}`)

    // Iniciar processamento em background automaticamente
    if (material.tipo === 'PDF' && material.arquivoPdfUrl) {
      console.log('\n' + '='.repeat(80))
      console.log('🚀 INICIANDO PROCESSAMENTO EM BACKGROUND (Google Drive Import)')
      console.log('='.repeat(80))
      console.log(`📄 Material: ${material.nome}`)
      console.log(`🆔 ID: ${material.id}`)
      console.log(`📁 PDF URL: ${material.arquivoPdfUrl}`)
      console.log(`📊 Total de páginas: ${material.totalPaginas || 'não informado'}`)
      console.log(`⏰ Iniciado em: ${new Date().toLocaleString('pt-BR')}`)
      console.log('='.repeat(80) + '\n')

      // Chamar serviço diretamente (mesmo método do upload local)
      const processor = new PdfBackgroundProcessorService()

      processor.processFullPdf(material.id)
        .then(() => {
          console.log(`\n✅ [SUCCESS] Processamento do material ${material.id} completado com sucesso!\n`)
        })
        .catch((error) => {
          console.log('\n' + '='.repeat(80))
          console.log('❌ ERRO NO PROCESSAMENTO EM BACKGROUND')
          console.log('='.repeat(80))
          console.log(`Material ID: ${material.id}`)
          console.log(`Material Nome: ${material.nome}`)
          console.error('Erro completo:', error)
          console.error('Stack:', error.stack)
          console.log('='.repeat(80) + '\n')
        })

      console.log('✅ [ASYNC] Processamento iniciado de forma assíncrona (não bloqueia resposta HTTP)\n')
    }

    return NextResponse.json({
      success: true,
      material: {
        id: material.id,
        nome: material.nome,
        totalPaginas: material.totalPaginas,
      },
    }, { headers: handleCors(request) })
  } catch (error) {
    console.error('Erro ao importar PDF do Google Drive:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Falha ao importar PDF do Google Drive',
      },
      { status: 500, headers: handleCors(request) }
    )
  }
}
