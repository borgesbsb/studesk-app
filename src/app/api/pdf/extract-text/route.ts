import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Função alternativa usando pdf-parse como fallback
async function extractTextWithPdfParse(buffer: Buffer): Promise<{
  text: string
  pages: number
}> {
  try {
    console.log('Tentando usar pdf-parse como alternativa...')
    
    // Importação dinâmica mais específica do pdf-parse
    const pdfParse = (await import('pdf-parse')).default
    
    console.log('pdf-parse importado com sucesso')
    console.log('Processando buffer de tamanho:', buffer.length, 'bytes')
    
    const data = await pdfParse(buffer)
    
    console.log(`PDF processado com ${data.numpages} páginas`)
    console.log(`Texto extraído: ${data.text.length} caracteres`)
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('Nenhum texto foi extraído do PDF')
    }
    
    return {
      text: data.text,
      pages: data.numpages
    }
    
  } catch (error) {
    console.error('Erro na extração com pdf-parse:', error)
    // Não re-lançar o erro, apenas loggar para debug
    throw error
  }
}

// Função para extrair texto usando pdfjs-dist
async function extractTextWithPdfjs(buffer: Buffer): Promise<{
  text: string
  pages: number
}> {
  try {
    console.log('Importando pdfjs-dist...')
    
    // Importação dinâmica que funciona melhor com Next.js
    const pdfjsLib = await import('pdfjs-dist')
    
    console.log('pdfjs-dist importado com sucesso (modo servidor)')
    
    // Converter buffer para Uint8Array
    const uint8Array = new Uint8Array(buffer)
    
    console.log('Carregando documento PDF...')
    const doc = await pdfjsLib.getDocument({ 
      data: uint8Array
    }).promise
    const numPages = doc.numPages
    
    console.log(`PDF carregado com ${numPages} páginas`)
    
    let fullText = ''
    
    // Extrair texto de cada página
    for (let i = 1; i <= numPages; i++) {
      try {
        console.log(`Processando página ${i}/${numPages}`)
        const page = await doc.getPage(i)
        const textContent = await page.getTextContent()
        
        const pageText = textContent.items
          .filter((item: any) => item.str && typeof item.str === 'string')
          .map((item: any) => item.str.trim())
          .filter((str: string) => str.length > 0)
          .join(' ')
        
        if (pageText.length > 0) {
          fullText += pageText + '\n\n'
        }
      } catch (pageError) {
        console.warn(`Erro ao processar página ${i}:`, pageError)
        // Continuar com as outras páginas
      }
    }
    
    console.log(`Extração concluída. Caracteres extraídos: ${fullText.length}`)
    
    if (fullText.length === 0) {
      throw new Error('Nenhum texto foi extraído do PDF')
    }
    
    return {
      text: fullText.trim(),
      pages: numPages
    }
    
  } catch (error) {
    console.error('Erro na extração com pdfjs-dist:', error)
    throw new Error('Falha na extração de texto com pdfjs-dist: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
  }
}

// Função de fallback final usando extração simples
async function extractTextSimple(buffer: Buffer): Promise<{
  text: string
  pages: number
}> {
  try {
    console.log('Tentando extração simples como último recurso...')
    
    // Converter buffer para string e tentar extrair texto básico
    const content = buffer.toString('binary')
    
    // Verificar se é um PDF válido
    if (!content.startsWith('%PDF')) {
      throw new Error('Arquivo não é um PDF válido')
    }
    
    // Extrair versão do PDF
    const versionMatch = content.match(/%PDF-(\d+\.\d+)/)
    const version = versionMatch ? versionMatch[1] : 'unknown'
    
    console.log(`PDF versão ${version} detectado`)
    
    // Tentar extrair texto usando regex simples para streams de texto
    const textMatches = content.match(/\(\s*([^)]+)\s*\)/g) || []
    let extractedText = ''
    
    for (const match of textMatches) {
      const text = match.replace(/^\(/, '').replace(/\)$/, '').trim()
      if (text.length > 3 && /[a-zA-ZáàâãéèêíïóôõöúüçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇÑ]/.test(text)) {
        extractedText += text + ' '
      }
    }
    
    // Estimativa de páginas baseada em marcadores comuns
    const pageMarkers = (content.match(/\/Type\s*\/Page/g) || []).length
    const estimatedPages = Math.max(1, pageMarkers)
    
    if (extractedText.trim().length === 0) {
      throw new Error('Não foi possível extrair texto do PDF com método simples')
    }
    
    console.log(`Extração simples concluída: ${extractedText.length} caracteres, ~${estimatedPages} páginas`)
    
    return {
      text: extractedText.trim(),
      pages: estimatedPages
    }
    
  } catch (error) {
    console.error('Erro na extração simples:', error)
    throw error
  }
}

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

    console.log('=== INICIANDO EXTRAÇÃO DE PDF SIMPLIFICADA ===')
    console.log('Request URL:', request.url)
    console.log('Request method:', request.method)
    console.log('User ID:', session.user.id)

    let body
    try {
      body = await request.json()
      console.log('Body parsed successfully:', JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError)
      return NextResponse.json(
        { error: 'JSON inválido no corpo da requisição' },
        { status: 400 }
      )
    }

    const { pdfUrl } = body
    
    if (!pdfUrl) {
      console.error('PDF URL não fornecida')
      return NextResponse.json(
        { error: 'URL do PDF é obrigatória' },
        { status: 400 }
      )
    }

    console.log('URL recebida:', pdfUrl)
    console.log('Working directory:', process.cwd())

    let absoluteUrl = pdfUrl
    let isLocalFile = false

    // Se a URL começar com /uploads ou /api/uploads, validar ownership
    if (pdfUrl.startsWith('/uploads/') || pdfUrl.startsWith('/api/uploads/')) {
      // Extrair path segments
      const pathParts = pdfUrl.replace(/^\/api\/uploads\//, '').replace(/^\/uploads\//, '').split('/')

      // O primeiro segmento deve ser o userId
      const fileOwnerId = pathParts[0]

      // Validar ownership
      if (fileOwnerId !== session.user.id) {
        return NextResponse.json(
          { error: 'Você não tem permissão para processar este arquivo' },
          { status: 403 }
        )
      }

      const uploadDir = path.join(process.cwd(), 'public', 'uploads')
      const fileName = pdfUrl.split('/').pop()
      absoluteUrl = path.join(uploadDir, fileOwnerId, fileName || '')
      isLocalFile = true
      
      console.log('Caminho da pasta uploads:', uploadDir)
      console.log('Nome do arquivo:', fileName)
      console.log('Caminho completo:', absoluteUrl)
      
      // Verificar se o arquivo existe
      try {
        const stats = await fs.stat(absoluteUrl)
        console.log('Arquivo encontrado! Tamanho:', stats.size, 'bytes')
      } catch (error) {
        console.error('ERRO: Arquivo não encontrado:', absoluteUrl)
        console.error('Detalhes do erro:', error)
        throw new Error(`Arquivo PDF não encontrado: ${pdfUrl}`)
      }
    }

    let buffer: Buffer
    
    // Se for um caminho local, ler diretamente do sistema de arquivos
    if (isLocalFile) {
      console.log('Lendo arquivo local...')
      try {
        buffer = await fs.readFile(absoluteUrl)
        console.log('Arquivo lido com sucesso. Tamanho:', buffer.length, 'bytes')
      } catch (readError) {
        console.error('Erro ao ler arquivo:', readError)
        throw new Error('Falha ao ler arquivo PDF do disco')
      }
    } else {
      // Fazer download do PDF
      console.log('Fazendo download do PDF...')
      const response = await fetch(absoluteUrl)
      if (!response.ok) {
        throw new Error(`Erro ao baixar PDF: ${response.status} ${response.statusText}`)
      }

      // Converter para Buffer
      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      console.log('PDF baixado. Tamanho:', buffer.length, 'bytes')
    }

    // Verificar se o buffer não está vazio
    if (buffer.length === 0) {
      throw new Error('Arquivo PDF está vazio')
    }

    // Verificar se é um PDF válido (verificação básica)
    const pdfHeader = buffer.slice(0, 4).toString()
    if (pdfHeader !== '%PDF') {
      console.error('Cabeçalho do arquivo:', pdfHeader)
      throw new Error('Arquivo não é um PDF válido')
    }

    console.log('PDF válido detectado, testando extração com pdf-parse...')
    
    // Testar APENAS pdf-parse por enquanto
    let text: string
    let pages: number
    
    try {
      console.log('=== USANDO PDF-PARSE ===')
      const pdfParse = (await import('pdf-parse')).default
      console.log('pdf-parse importado com sucesso')
      
      const data = await pdfParse(buffer)
      console.log('PDF processado com pdf-parse:')
      console.log('- Páginas:', data.numpages)
      console.log('- Caracteres extraídos:', data.text.length)
      console.log('- Primeiros 300 chars:', data.text.substring(0, 300))
      console.log('- Últimos 200 chars:', data.text.slice(-200))
      
      text = data.text
      pages = data.numpages
      
      if (!text || text.trim().length === 0) {
        throw new Error('PDF-parse não extraiu texto')
      }
      
    } catch (pdfParseError) {
      console.error('Erro com pdf-parse:', pdfParseError)
      throw new Error('Falha na extração com pdf-parse: ' + (pdfParseError instanceof Error ? pdfParseError.message : String(pdfParseError)))
    }

    console.log('Extração concluída!')
    console.log('Páginas processadas:', pages)
    console.log('Caracteres extraídos:', text.length)

    // Processamento básico do texto
    console.log('Aplicando limpeza básica...')
    
    // Limpeza simples sem utils externos
    const cleanedText = text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .replace(/(\w)-\n(\w)/g, '$1$2')
      .trim()
    
    // Organização simples em parágrafos
    const paragraphs = cleanedText
      .split('\n\n')
      .map(p => p.trim())
      .filter(p => p.length > 50) // Filtrar parágrafos muito pequenos
      .filter(p => !/^\d+$/.test(p)) // Remover números de página
    
    console.log('Processamento concluído!')
    console.log('Parágrafos organizados:', paragraphs.length)
    console.log('Amostra do primeiro parágrafo:', paragraphs[0]?.substring(0, 200))

    return NextResponse.json({
      success: true,
      text: text,
      cleanedText: cleanedText,
      paragraphs: paragraphs,
      pages: pages,
      info: {
        producer: 'pdf-parse',
        pages: pages,
        extractionMethod: 'simplified'
      }
    })
    
  } catch (error) {
    console.error('=== ERRO NA EXTRAÇÃO DE PDF ===')
    console.error('Erro completo:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A')
    console.error('Tipo do erro:', typeof error)
    console.error('Nome do erro:', error instanceof Error ? error.name : 'N/A')
    
    let errorMessage = 'Erro desconhecido'
    
    if (error instanceof Error) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 