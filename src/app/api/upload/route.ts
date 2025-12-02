import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      )
    }

    console.log('Arquivo recebido:', {
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

    // Criar nome único para o arquivo incluindo userId para isolamento
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/\s+/g, '-')
    const fileName = `${session.user.id}-${timestamp}-${sanitizedFileName}`

    // Definir caminho do arquivo com diretório por usuário
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', session.user.id)
    const filePath = path.join(uploadsDir, fileName)

    console.log('Caminhos:', {
      uploadsDir,
      filePath,
      cwd: process.cwd()
    })
    
    // Garantir que o diretório existe
    if (!existsSync(uploadsDir)) {
      console.log('Criando diretório de uploads...')
      await mkdir(uploadsDir, { recursive: true })
    }
    
    // Converter o arquivo para ArrayBuffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    console.log('Salvando arquivo...')
    // Salvar o arquivo
    await writeFile(filePath, buffer)
    console.log('Arquivo salvo com sucesso!')

    // Retornar o caminho da API para servir o arquivo (inclui userId no path)
    const fileUrl = `/api/uploads/${session.user.id}/${fileName}`
    
    return NextResponse.json({ 
      success: true, 
      fileUrl,
      details: {
        originalName: file.name,
        savedAs: fileName,
        size: file.size,
        path: filePath,
        uploadsDir
      }
    })
  } catch (error) {
    console.error('Erro detalhado ao fazer upload:', error)
    return NextResponse.json(
      { error: "Erro ao fazer upload do arquivo", details: error },
      { status: 500 }
    )
  }
} 