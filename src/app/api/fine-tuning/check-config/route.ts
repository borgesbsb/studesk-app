import { NextRequest, NextResponse } from 'next/server'
import { OpenAIService } from '@/application/services/openai.service'

export async function GET(request: NextRequest) {
  try {
    const config = await OpenAIService.getConfig()
    
    const isConfigured = !!(config.apiKey && config.apiKey.trim().length > 0)
    
    return NextResponse.json({
      success: true,
      isConfigured,
      config: {
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        hasApiKey: isConfigured,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      },
      message: isConfigured 
        ? "Configuração OpenAI encontrada e pronta para use" 
        : "API Key da OpenAI não configurada. Configure em Settings > OpenAI"
    })
    
  } catch (error) {
    console.error('Erro ao verificar configuração:', error)
    return NextResponse.json(
      { 
        error: "Erro ao verificar configuração da OpenAI", 
        details: error instanceof Error ? error.message : error,
        isConfigured: false
      },
      { status: 500 }
    )
  }
} 