import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import OpenAI from 'openai'
import { OpenAIService } from '@/application/services/openai.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const concursoId = searchParams.get('concursoId')
    
    if (!concursoId) {
      return NextResponse.json(
        { error: "ID do concurso é obrigatório" },
        { status: 400 }
      )
    }

    // Verificar se existem jobs salvos para este concurso
    const jobsDir = path.join(process.cwd(), 'public', 'uploads', 'fine-tuning', concursoId, 'jobs')
    
    if (!existsSync(jobsDir)) {
      return NextResponse.json({
        success: true,
        jobs: [],
        message: "Nenhum job de treinamento encontrado para este concurso"
      })
    }

    // Ler todos os jobs salvos
    const jobFiles = await readdir(jobsDir)
    const jsonFiles = jobFiles.filter(file => file.endsWith('.json'))
    
    const jobs = []
    
    for (const jobFile of jsonFiles) {
      const jobFilePath = path.join(jobsDir, jobFile)
      const jobContent = await readFile(jobFilePath, 'utf-8')
      const jobInfo = JSON.parse(jobContent)
      
      // Buscar status atualizado na OpenAI
      const updatedStatus = await getJobStatusFromOpenAI(jobInfo.jobId)
      
      jobs.push({
        ...jobInfo,
        ...updatedStatus
      })
    }

    // Ordenar por data de criação (mais recente primeiro)
    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      success: true,
      jobs,
      totalJobs: jobs.length
    })
    
  } catch (error) {
    console.error('Erro ao verificar status:', error)
    return NextResponse.json(
      { error: "Erro ao verificar status dos jobs", details: error instanceof Error ? error.message : error },
      { status: 500 }
    )
  }
}

async function getJobStatusFromOpenAI(jobId: string): Promise<any> {
  try {
    // Buscar configurações do banco
    const config = await OpenAIService.getConfig()
    
    if (!config.apiKey) {
      return {
        currentStatus: 'error',
        error: 'API Key da OpenAI não configurada no banco de dados'
      }
    }

    const openai = new OpenAI({
      apiKey: config.apiKey,
    })

    const job = await openai.fineTuning.jobs.retrieve(jobId)
    
    return {
      currentStatus: job.status,
      finishedAt: job.finished_at,
      fineTunedModel: job.fine_tuned_model,
      resultFiles: job.result_files,
      trainedTokens: job.trained_tokens,
      error: job.error,
      hyperparameters: job.hyperparameters,
      estimatedFinish: job.estimated_finish
    }
  } catch (error) {
    console.error('Erro ao buscar status na OpenAI:', error)
    return {
      currentStatus: 'error',
      error: 'Erro ao comunicar com OpenAI'
    }
  }
} 