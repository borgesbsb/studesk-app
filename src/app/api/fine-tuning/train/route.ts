import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import OpenAI from 'openai'
import { OpenAIService } from '@/application/services/openai.service'

export async function POST(request: NextRequest) {
  try {
    const { concursoId } = await request.json()
    
    if (!concursoId) {
      return NextResponse.json(
        { error: "ID do concurso é obrigatório" },
        { status: 400 }
      )
    }

    console.log('Iniciando treinamento de fine tuning para concurso:', concursoId)

    // Verificar se existem textos processados
    const processedTextsDir = path.join(process.cwd(), 'public', 'uploads', 'fine-tuning', concursoId, 'processed-texts')
    
    if (!existsSync(processedTextsDir)) {
      return NextResponse.json(
        { error: "Nenhum texto processado encontrado. Extraia o texto dos PDFs primeiro." },
        { status: 404 }
      )
    }

    // Ler todos os textos processados
    const textFiles = await readdir(processedTextsDir)
    const txtFiles = textFiles.filter(file => file.endsWith('.txt'))
    
    if (txtFiles.length === 0) {
      return NextResponse.json(
        { error: "Nenhum arquivo de texto encontrado para treinamento." },
        { status: 404 }
      )
    }

    console.log(`Encontrados ${txtFiles.length} arquivos de texto para treinamento`)

    // Ler e combinar todos os textos
    const allTexts = []
    for (const txtFile of txtFiles) {
      const filePath = path.join(processedTextsDir, txtFile)
      const content = await readFile(filePath, 'utf-8')
      allTexts.push(content)
    }

    // Preparar dados para fine tuning
    const trainingData = await prepareTrainingData(allTexts, concursoId)
    
    // Salvar arquivo de treinamento
    const trainingFilePath = await saveTrainingFile(trainingData, concursoId)
    
    // Iniciar fine tuning com OpenAI
    const fineTuningJob = await startFineTuning(trainingFilePath, concursoId)
    
    return NextResponse.json({
      success: true,
      message: "Treinamento de fine tuning iniciado com sucesso",
      jobId: fineTuningJob.id,
      status: fineTuningJob.status,
      trainingDataSize: trainingData.length,
      textFilesUsed: txtFiles.length,
      trainingFile: trainingFilePath
    })
    
  } catch (error) {
    console.error('Erro ao iniciar treinamento:', error)
    return NextResponse.json(
      { error: "Erro ao iniciar treinamento", details: error instanceof Error ? error.message : error },
      { status: 500 }
    )
  }
}

async function prepareTrainingData(texts: string[], concursoId: string): Promise<any[]> {
  const trainingData = []
  
  for (const text of texts) {
    // Dividir texto em chunks para criar exemplos de treinamento
    const chunks = splitTextIntoChunks(text, 1000) // chunks de ~1000 caracteres
    
    for (const chunk of chunks) {
      // Criar exemplos de pergunta e resposta baseados no conteúdo
      const examples = createTrainingExamples(chunk, concursoId)
      trainingData.push(...examples)
    }
  }
  
  return trainingData
}

function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const chunks = []
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence + '. '
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
      }
      currentChunk = sentence + '. '
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}

function createTrainingExamples(text: string, concursoId: string): any[] {
  const examples = []
  
  // Exemplo 1: Explicação de conceito
  examples.push({
    messages: [
      {
        role: "system",
        content: `Você é um assistente especializado em concursos públicos, especificamente treinado para o concurso ${concursoId}. Forneça respostas precisas e detalhadas baseadas no conteúdo estudado.`
      },
      {
        role: "user",
        content: "Explique os conceitos principais deste conteúdo."
      },
      {
        role: "assistant",
        content: text
      }
    ]
  })
  
  // Exemplo 2: Criação de questão
  examples.push({
    messages: [
      {
        role: "system",
        content: `Você é um assistente especializado em concursos públicos, especificamente treinado para o concurso ${concursoId}. Crie questões de múltipla escolha baseadas no conteúdo estudado.`
      },
      {
        role: "user",
        content: "Crie uma questão de múltipla escolha baseada neste conteúdo."
      },
      {
        role: "assistant",
        content: `Com base no conteúdo: "${text.substring(0, 200)}...", aqui está uma questão:\n\n[Questão seria gerada aqui baseada no conteúdo específico]`
      }
    ]
  })
  
  return examples
}

async function saveTrainingFile(trainingData: any[], concursoId: string): Promise<string> {
  try {
    const { writeFile, mkdir } = await import('fs/promises')
    const { existsSync } = await import('fs')
    
    // Criar pasta para arquivos de treinamento
    const trainingDir = path.join(process.cwd(), 'public', 'uploads', 'fine-tuning', concursoId, 'training-files')
    
    if (!existsSync(trainingDir)) {
      await mkdir(trainingDir, { recursive: true })
    }
    
    // Nome do arquivo de treinamento
    const timestamp = Date.now()
    const trainingFileName = `training-data-${timestamp}.jsonl`
    const trainingFilePath = path.join(trainingDir, trainingFileName)
    
    // Converter para formato JSONL (cada linha é um JSON)
    const jsonlContent = trainingData.map(item => JSON.stringify(item)).join('\n')
    
    // Salvar arquivo de treinamento
    await writeFile(trainingFilePath, jsonlContent, 'utf-8')
    
    console.log('Arquivo de treinamento salvo em:', trainingFilePath)
    
    return trainingFilePath
  } catch (error) {
    console.error('Erro ao salvar arquivo de treinamento:', error)
    throw error
  }
}

async function startFineTuning(trainingFilePath: string, concursoId: string): Promise<any> {
  try {
    // Buscar configurações do banco
    const config = await OpenAIService.getConfig()
    
    if (!config.apiKey) {
      throw new Error('API Key da OpenAI não configurada no banco de dados')
    }

    const openai = new OpenAI({
      apiKey: config.apiKey,
    })

    // Upload do arquivo de treinamento para OpenAI
    const fileUpload = await openai.files.create({
      file: require('fs').createReadStream(trainingFilePath),
      purpose: 'fine-tune',
    })

    console.log('Arquivo de treinamento enviado para OpenAI:', fileUpload.id)

    // Criar job de fine tuning
    const fineTuningJob = await openai.fineTuning.jobs.create({
      training_file: fileUpload.id,
      model: 'gpt-4o-mini-2024-07-18', // Modelo base para fine tuning
      hyperparameters: {
        n_epochs: 3, // Número de épocas de treinamento
      },
    })

    console.log('Job de fine tuning criado:', fineTuningJob.id)

    // Salvar informações do job
    await saveFineTuningJobInfo(fineTuningJob, concursoId, fileUpload.id)

    return fineTuningJob
  } catch (error) {
    console.error('Erro ao iniciar fine tuning com OpenAI:', error)
    throw error
  }
}

async function saveFineTuningJobInfo(job: any, concursoId: string, fileId: string): Promise<void> {
  try {
    const { writeFile, mkdir } = await import('fs/promises')
    const { existsSync } = await import('fs')
    
    const jobsDir = path.join(process.cwd(), 'public', 'uploads', 'fine-tuning', concursoId, 'jobs')
    
    if (!existsSync(jobsDir)) {
      await mkdir(jobsDir, { recursive: true })
    }
    
    const jobInfo = {
      jobId: job.id,
      concursoId,
      fileId,
      status: job.status,
      model: job.model,
      createdAt: new Date().toISOString(),
      estimatedFinish: job.estimated_finish,
      hyperparameters: job.hyperparameters
    }
    
    const jobFilePath = path.join(jobsDir, `job-${job.id}.json`)
    await writeFile(jobFilePath, JSON.stringify(jobInfo, null, 2), 'utf-8')
    
    console.log('Informações do job salvas em:', jobFilePath)
  } catch (error) {
    console.error('Erro ao salvar informações do job:', error)
  }
} 