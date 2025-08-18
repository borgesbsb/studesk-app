import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import OpenAI from 'openai'
import * as pdfjsLib from 'pdfjs-dist'
import { OpenAIService } from '@/application/services/openai.service'

// Configurar o worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

export async function POST(request: NextRequest) {
  try {
    const { filePath, concursoId } = await request.json()
    
    if (!filePath || !concursoId) {
      return NextResponse.json(
        { error: "Caminho do arquivo e ID do concurso são obrigatórios" },
        { status: 400 }
      )
    }

    console.log('Extraindo texto do PDF:', filePath)

    // Construir o caminho completo do arquivo
    const fullPath = path.join(process.cwd(), 'public', filePath)
    
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { error: "Arquivo não encontrado" },
        { status: 404 }
      )
    }

    // Ler o arquivo PDF
    const pdfBuffer = await readFile(fullPath)
    
    // Verificar se o arquivo não está vazio
    if (pdfBuffer.length === 0) {
      return NextResponse.json(
        { error: "Arquivo PDF está vazio" },
        { status: 400 }
      )
    }
    
    console.log(`Arquivo PDF lido: ${pdfBuffer.length} bytes`)
    
    // Extrair texto usando PDF.js (com fallback para pdf-parse)
    const extractedText = await extractTextFromPDF(pdfBuffer)
    
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: "Não foi possível extrair texto do PDF" },
        { status: 400 }
      )
    }

    console.log(`Texto extraído: ${extractedText.length} caracteres`)

    // Processar o texto com OpenAI para limpar e estruturar
    const processedText = await processTextWithOpenAI(extractedText, concursoId)
    
    // Salvar o texto processado para fine tuning
    const savedFile = await saveProcessedText(processedText, concursoId, filePath)
    
    return NextResponse.json({
      success: true,
      extractedText: extractedText.substring(0, 500) + '...', // Preview
      processedText: processedText.substring(0, 500) + '...', // Preview
      savedFile,
      textLength: extractedText.length,
      processedLength: processedText.length
    })
    
  } catch (error) {
    console.error('Erro ao extrair texto:', error)
    return NextResponse.json(
      { error: "Erro ao extrair texto do PDF", details: error instanceof Error ? error.message : error },
      { status: 500 }
    )
  }
}

async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  // Primeiro tentar com PDF.js
  try {
    console.log('Tentando extrair texto com PDF.js...')
    // Converter Buffer para Uint8Array que o PDF.js espera
    const uint8Array = new Uint8Array(pdfBuffer)
    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise
    let fullText = ''
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      
      fullText += pageText + '\n\n'
    }
    
    console.log('Texto extraído com sucesso usando PDF.js')
    return fullText.trim()
  } catch (pdfJsError) {
    console.warn('PDF.js falhou, tentando com pdf-parse:', pdfJsError)
    
    // Fallback para pdf-parse
    try {
      console.log('Tentando extrair texto com pdf-parse...')
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(pdfBuffer)
      console.log('Texto extraído com sucesso usando pdf-parse')
      return data.text.trim()
    } catch (pdfParseError) {
      console.error('Ambas as bibliotecas falharam:', { pdfJsError, pdfParseError })
      throw new Error(`Falha na extração de texto do PDF com ambas as bibliotecas: PDF.js: ${pdfJsError instanceof Error ? pdfJsError.message : 'Erro desconhecido'}, pdf-parse: ${pdfParseError instanceof Error ? pdfParseError.message : 'Erro desconhecido'}`)
    }
  }
}

async function processTextWithOpenAI(text: string, concursoId: string): Promise<string> {
  try {
    // Buscar configurações do banco
    const config = await OpenAIService.getConfig()
    
    if (!config.apiKey) {
      console.warn('API Key da OpenAI não configurada no banco, usando fallback')
      return cleanText(text)
    }

    const openai = new OpenAI({
      apiKey: config.apiKey,
    })

    const response = await openai.chat.completions.create({
      model: config.model || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um assistente especializado em processar textos para fine-tuning de modelos de IA focados em concursos públicos.

Sua tarefa é limpar, estruturar e formatar o texto extraído de um PDF para ser usado no treinamento de um modelo especializado.

Instruções:
1. Remova caracteres especiais desnecessários e erros de OCR
2. Organize o conteúdo em seções lógicas
3. Mantenha informações importantes como: leis, artigos, conceitos, definições
4. Remova cabeçalhos/rodapés repetitivos 
5. Mantenha a formatação que ajude na compreensão (numeração, listas)
6. Se houver questões/exercícios, mantenha-os bem estruturados

Retorne APENAS o texto processado, sem comentários adicionais.`
        },
        {
          role: "user",
          content: `Processe este texto de concurso público para fine-tuning:\n\n${text.substring(0, 15000)}` // Limite para não exceder tokens
        }
      ],
      temperature: config.temperature || 0.1,
      max_tokens: config.maxTokens || 4000,
    })

    return response.choices[0]?.message?.content || text
  } catch (error) {
    console.error('Erro ao processar texto com OpenAI:', error)
    // Se der erro na IA, retorna o texto original limpo
    return cleanText(text)
  }
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Múltiplos espaços para um
    .replace(/\n\s*\n/g, '\n\n') // Múltiplas quebras para duas
    .replace(/[^\w\s\n\-\(\)\[\]\.,:;!?]/g, '') // Remove caracteres especiais
    .trim()
}

async function saveProcessedText(processedText: string, concursoId: string, originalFilePath: string): Promise<string> {
  try {
    const { writeFile, mkdir } = await import('fs/promises')
    const { existsSync } = await import('fs')
    
    // Criar pasta para textos processados
    const textDir = path.join(process.cwd(), 'public', 'uploads', 'fine-tuning', concursoId, 'processed-texts')
    
    if (!existsSync(textDir)) {
      await mkdir(textDir, { recursive: true })
    }
    
    // Nome do arquivo baseado no PDF original
    const originalFileName = path.basename(originalFilePath, '.pdf')
    const textFileName = `${originalFileName}-processed.txt`
    const textFilePath = path.join(textDir, textFileName)
    
    // Salvar o texto processado
    await writeFile(textFilePath, processedText, 'utf-8')
    
    const relativeTextPath = `/uploads/fine-tuning/${concursoId}/processed-texts/${textFileName}`
    
    console.log('Texto processado salvo em:', relativeTextPath)
    
    return relativeTextPath
  } catch (error) {
    console.error('Erro ao salvar texto processado:', error)
    throw error
  }
} 