import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const concursoId = formData.get('concursoId') as string
    
    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      )
    }

    if (!concursoId) {
      return NextResponse.json(
        { error: "ID do concurso é obrigatório" },
        { status: 400 }
      )
    }

    console.log('Arquivo de fine tuning recebido:', {
      nome: file.name,
      tipo: file.type,
      tamanho: file.size
    })

    // Validar tipo do arquivo
    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: "Apenas arquivos PDF são permitidos" },
        { status: 400 }
      )
    }

    // Validar tamanho do arquivo (máximo 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Tamanho máximo: 50MB" },
        { status: 400 }
      )
    }

    // Criar nome único para o arquivo
    const timestamp = Date.now()
    const fileName = `fine-tuning-${concursoId}-${timestamp}-${file.name.replace(/\s+/g, '-')}`
    
    // Definir caminho do arquivo na pasta fine-tuning específica do concurso
    const fineTuningDir = path.join(process.cwd(), 'public', 'uploads', 'fine-tuning', concursoId)
    const filePath = path.join(fineTuningDir, fileName)

    console.log('Caminhos para fine tuning:', {
      fineTuningDir,
      filePath,
      cwd: process.cwd()
    })
    
    // Garantir que o diretório existe
    if (!existsSync(fineTuningDir)) {
      console.log('Criando diretório de fine tuning...')
      await mkdir(fineTuningDir, { recursive: true })
    }
    
    // Converter o arquivo para ArrayBuffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    console.log('Salvando arquivo de fine tuning...')
    // Salvar o arquivo
    await writeFile(filePath, buffer)
    console.log('Arquivo de fine tuning salvo com sucesso!')
    
    // Retornar o caminho relativo do arquivo
    const fileUrl = `/uploads/fine-tuning/${concursoId}/${fileName}`
    
    return NextResponse.json({ 
      success: true, 
      fileUrl,
      fileName,
      details: {
        originalName: file.name,
        savedAs: fileName,
        size: file.size,
        type: 'fine-tuning',
        concursoId: concursoId,
        uploadedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Erro detalhado ao fazer upload do fine tuning:', error)
    return NextResponse.json(
      { error: "Erro ao fazer upload do arquivo de fine tuning", details: error },
      { status: 500 }
    )
  }
} 