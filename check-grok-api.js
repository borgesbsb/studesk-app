const OpenAI = require('openai')
require('dotenv').config()

async function testGrokAPI() {
  const grokApiKey = process.env.GROK_API_KEY

  if (!grokApiKey) {
    console.error('❌ GROK_API_KEY não encontrada no .env')
    process.exit(1)
  }

  console.log('🔍 Testando API do Grok (xAI)...\n')
  console.log(`🔑 API Key: ${grokApiKey.substring(0, 15)}...${grokApiKey.substring(grokApiKey.length - 10)}\n`)

  try {
    // Configurar cliente Grok
    const grok = new OpenAI({
      apiKey: grokApiKey,
      baseURL: 'https://api.x.ai/v1',
    })

    console.log('📞 Fazendo chamada de teste ao Grok...\n')

    const startTime = Date.now()

    const response = await grok.chat.completions.create({
      model: 'grok-beta',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: 'Say "Hello from Grok!" and nothing else.',
        },
      ],
      temperature: 0.3,
      max_tokens: 20,
    })

    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    console.log('✅ API do Grok está funcionando!\n')
    console.log('📊 Informações da chamada:')
    console.log(`   Modelo usado: ${response.model}`)
    console.log(`   Tempo de resposta: ${duration}s`)
    console.log(`   Tokens usados: ${response.usage.total_tokens}`)
    console.log(`   - Prompt tokens: ${response.usage.prompt_tokens}`)
    console.log(`   - Completion tokens: ${response.usage.completion_tokens}`)
    console.log('\n💬 Resposta do Grok:')
    console.log(`   "${response.choices[0].message.content}"\n`)

    console.log('🎯 Status: Pronto para uso no sistema!')

  } catch (error) {
    console.error('❌ Erro ao testar API do Grok:\n')

    // Mostrar erro completo primeiro para debug
    console.error('🔍 Detalhes completos do erro:')
    console.error(JSON.stringify(error, null, 2))
    console.error('\n')

    if (error.status === 401) {
      console.error('   🔐 API Key inválida ou expirada')
      console.error('   Verifique se a chave está correta no .env')
    } else if (error.status === 429) {
      console.error('   ⏱️  Limite de requisições atingido')
      console.error('   Aguarde alguns momentos e tente novamente')
    } else if (error.status === 403) {
      console.error('   🚫 Acesso negado - verifique permissões da API Key')
      console.error('   Possíveis causas:')
      console.error('   - API Key incorreta ou incompleta')
      console.error('   - API Key sem permissões adequadas')
      console.error('   - Conta do Grok pode estar inativa ou sem créditos')
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('   🌐 Não foi possível conectar ao servidor do Grok')
      console.error('   Verifique sua conexão com a internet')
    } else {
      console.error(`   Status: ${error.status || 'N/A'}`)
      console.error(`   Código: ${error.code || 'N/A'}`)
      console.error(`   Mensagem: ${error.message}`)

      if (error.response) {
        console.error(`   Detalhes: ${JSON.stringify(error.response.data, null, 2)}`)
      }
    }

    console.error('\n💡 Dica: Verifique se sua API Key do Grok está correta em:')
    console.error('   https://console.x.ai/')
    console.error('\n📝 Nota: Como o Grok retornou erro, o sistema usará OpenAI como fallback automaticamente.')

    process.exit(1)
  }
}

testGrokAPI()
