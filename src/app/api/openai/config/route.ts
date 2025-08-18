import { NextResponse } from 'next/server'
import { OpenAIService } from '@/application/services/openai.service'

export async function GET() {
  try {
    const config = await OpenAIService.getConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const updatedConfig = await OpenAIService.updateConfig(body)
    return NextResponse.json(updatedConfig)
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar configurações' },
      { status: 500 }
    )
  }
} 