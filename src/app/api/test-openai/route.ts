import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY não configurada no .env' },
        { status: 500 }
      )
    }

    console.log('🔑 Testando OpenAI com chave:', apiKey.substring(0, 20) + '...')

    const openai = new OpenAI({ apiKey })

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Responda apenas com a palavra: FUNCIONANDO',
        },
      ],
      max_tokens: 10,
    })

    const resultado = response.choices[0].message.content

    return NextResponse.json({
      success: true,
      message: 'OpenAI API funcionando corretamente!',
      resultado,
      tokensUsados: response.usage?.total_tokens || 0,
      chaveUsada: apiKey.substring(0, 20) + '...' + apiKey.slice(-4),
    })
  } catch (error: any) {
    console.error('❌ Erro ao testar OpenAI:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
      },
      { status: 500 }
    )
  }
}
