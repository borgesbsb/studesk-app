const OpenAI = require('openai')
require('dotenv').config()

async function testGroqAPI() {
  const groqApiKey = process.env.GROQ_API_KEY

  if (!groqApiKey) {
    console.error('❌ GROQ_API_KEY não encontrada no .env')
    console.error('\n📝 Para criar uma conta gratuita no Groq:')
    console.error('   1. Acesse: https://console.groq.com/')
    console.error('   2. Faça login com Google/GitHub')
    console.error('   3. Vá em "API Keys"')
    console.error('   4. Crie uma nova chave')
    console.error('   5. Cole no arquivo .env como: GROQ_API_KEY=sua_chave_aqui')
    console.error('\n💡 Benefícios do Groq:')
    console.error('   - 100% GRATUITO')
    console.error('   - 14,400 requisições por dia')
    console.error('   - Extremamente rápido (chips especializados)')
    console.error('   - Modelos potentes: Llama 3.3 70B, Mixtral 8x7B')
    process.exit(1)
  }

  console.log('🔍 Testando API do Groq...\n')
  console.log(`🔑 API Key: ${groqApiKey.substring(0, 15)}...${groqApiKey.substring(groqApiKey.length - 10)}\n`)

  try {
    // Configurar cliente Groq
    const groq = new OpenAI({
      apiKey: groqApiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    })

    console.log('📞 Fazendo chamada de teste ao Groq...\n')

    const startTime = Date.now()

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: 'Say "Hello from Groq!" and nothing else.',
        },
      ],
      temperature: 0.3,
      max_tokens: 20,
    })

    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    console.log('✅ API do Groq está funcionando perfeitamente!\n')
    console.log('📊 Informações da chamada:')
    console.log(`   Modelo usado: ${response.model}`)
    console.log(`   Tempo de resposta: ${duration}s (MUITO RÁPIDO!)`)
    console.log(`   Tokens usados: ${response.usage.total_tokens}`)
    console.log(`   - Prompt tokens: ${response.usage.prompt_tokens}`)
    console.log(`   - Completion tokens: ${response.usage.completion_tokens}`)
    console.log('\n💬 Resposta do Groq:')
    console.log(`   "${response.choices[0].message.content}"\n`)

    console.log('🎯 Status: Pronto para uso no sistema!')
    console.log('💰 Custo: R$ 0,00 (GRATUITO)')
    console.log(`📈 Limite diário: 14,400 requisições (você usou 1/${14400})`)

  } catch (error) {
    console.error('❌ Erro ao testar API do Groq:\n')

    if (error.status === 401) {
      console.error('   🔐 API Key inválida ou expirada')
      console.error('   Verifique se a chave está correta no .env')
    } else if (error.status === 429) {
      console.error('   ⏱️  Limite de requisições atingido')
      console.error('   Aguarde alguns momentos e tente novamente')
      console.error('   Limite: 14,400 requisições por dia')
    } else if (error.status === 403) {
      console.error('   🚫 Acesso negado - verifique permissões da API Key')
      console.error('   Possíveis causas:')
      console.error('   - API Key incorreta ou incompleta')
      console.error('   - API Key sem permissões adequadas')
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('   🌐 Não foi possível conectar ao servidor do Groq')
      console.error('   Verifique sua conexão com a internet')
    } else {
      console.error(`   Status: ${error.status || 'N/A'}`)
      console.error(`   Código: ${error.code || 'N/A'}`)
      console.error(`   Mensagem: ${error.message}`)

      if (error.response) {
        console.error(`   Detalhes: ${JSON.stringify(error.response.data, null, 2)}`)
      }
    }

    console.error('\n💡 Dica: Verifique se sua API Key do Groq está correta em:')
    console.error('   https://console.groq.com/keys')

    process.exit(1)
  }
}

testGroqAPI()
