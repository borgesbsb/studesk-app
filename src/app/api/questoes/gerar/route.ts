import { NextResponse } from 'next/server'
import { QuestaoRequest, QuestaoResponse } from '@/domain/entities/Questao'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const body: QuestaoRequest = await request.json()
    const apiKey = request.headers.get('x-openai-key')

    if (!apiKey) {
      return NextResponse.json(
        {
          questoes: [],
          status: 'error',
          message: 'Chave da API OpenAI não fornecida'
        },
        { status: 400 }
      )
    }

    const openai = new OpenAI({ apiKey })

    const basePrompt = `
      Você é um especialista em criar questões de múltipla escolha educacionais de alta qualidade, seguindo as melhores práticas pedagógicas.

      Gere ${body.quantidade} questão(ões) de múltipla escolha sobre o seguinte texto:

      ${body.paragrafo}

      TÉCNICAS AVANÇADAS (aplique pelo menos 2-3 das seguintes):
      
      🎯 CENÁRIOS CONTEXTUALIZADOS: Crie situações práticas baseadas no texto
      🧩 QUESTÕES MULTIETAPA: Divida o raciocínio em etapas (compreender → aplicar)
      🔗 INTEGRAÇÃO DE CONCEITOS: Combine diferentes tópicos do texto
      🎭 DISTRATORES INTELIGENTES: Use erros comuns como alternativas incorretas
      🚫 EXCEÇÕES/CONTRAEXEMPLOS: Questione quando regras não se aplicam
      📊 INTERPRETAÇÃO DE DADOS: Explore números/dados quando presentes
      🔍 AVALIAÇÃO CRÍTICA: Use verbos como "Avalie", "Justifique", "Analise"
      🚀 APLICAÇÃO PRÁTICA: Transfira conceitos para contextos novos
      💡 SÍNTESE: Use "Projetar", "Criar", "Desenvolver"
      📝 LINGUAGEM TÉCNICA: Use terminologia formal da área

      Requisitos:
      1. Cada questão deve ter 4 alternativas
      2. Apenas uma alternativa deve ser correta
      3. As alternativas devem ser plausíveis e desafiadoras
      4. A explicação da resposta correta deve ser clara e baseada no texto
      5. O enunciado deve usar linguagem técnica e formal
      6. Evite questões óbvias - busque análise, síntese e avaliação crítica
      7. Deixe as opções de resposta certas mas erradas no contexto da pergunta
      8. Não repita as mesmas alternativas em diferentes questões
      9. Não deixe que o usuário responda a questão sem que tenha lido o texto.
      10. Adicione questoes de V ou F de multipla escolha em uma ou mais questões.
    `

    const customPrompt = body.promptPersonalizado ? `
      Instruções adicionais para geração das questões:
      ${body.promptPersonalizado}
    ` : ''

    const formatInstructions = `
      7. Retorne no seguinte formato JSON:
      {
        "questoes": [
          {
            "enunciado": "texto da questão",
            "alternativas": [
              {
                "texto": "texto da alternativa",
                "correta": true/false,
                "explicacao": "explicação se esta for a alternativa correta"
              }
            ],
            "paragrafoPai": "texto original que gerou a questão"
          }
        ]
      }
    `

    const prompt = basePrompt + customPrompt + formatInstructions

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "Você é um especialista em elaboração de questões educacionais de múltipla escolha, especializado em técnicas avançadas de avaliação pedagógica. Crie questões que exijam análise crítica, síntese e aplicação prática dos conceitos. Use cenários contextualizados, questões multietapa e distratores inteligentes. Priorize níveis cognitivos superiores da Taxonomia de Bloom. Retorne apenas o JSON solicitado, sem texto adicional."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    })

    const response = completion.choices[0].message.content
    if (!response) {
      throw new Error('Resposta vazia da OpenAI')
    }

    const questoes = JSON.parse(response)
    return NextResponse.json({
      questoes: questoes.questoes,
      status: 'success'
    })

  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json(
      { 
        questoes: [], 
        status: 'error',
        message: error instanceof Error ? error.message : 'Erro ao processar requisição'
      },
      { status: 500 }
    )
  }
} 