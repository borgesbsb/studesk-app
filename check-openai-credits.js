const OpenAI = require('openai')
require('dotenv').config()

async function checkOpenAICredits() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY não encontrada no .env')
    process.exit(1)
  }

  console.log('🔍 Verificando créditos da OpenAI...\n')

  try {
    // A OpenAI não tem um endpoint direto para verificar créditos
    // Mas podemos fazer uma chamada mínima e verificar se funciona
    const openai = new OpenAI({ apiKey })

    // Fazer uma chamada muito pequena para testar
    console.log('📞 Fazendo chamada de teste...')
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Hi',
        },
      ],
      max_tokens: 5,
    })

    console.log('✅ API Key válida e funcionando!')
    console.log('\n📊 Informações da chamada de teste:')
    console.log(`   Modelo usado: ${response.model}`)
    console.log(`   Tokens usados: ${response.usage.total_tokens}`)
    console.log(`   - Prompt tokens: ${response.usage.prompt_tokens}`)
    console.log(`   - Completion tokens: ${response.usage.completion_tokens}`)

    console.log('\n💡 Para ver seus créditos e uso detalhado:')
    console.log('   1. Acesse: https://platform.openai.com/usage')
    console.log('   2. Ou vá em: https://platform.openai.com/settings/organization/billing/overview')

    console.log('\n⚠️  Nota: A API da OpenAI não permite verificar créditos programaticamente.')
    console.log('   Você precisa acessar o dashboard web para ver o saldo.')

  } catch (error) {
    console.error('❌ Erro ao verificar API:')

    if (error.status === 401) {
      console.error('   API Key inválida ou expirada')
    } else if (error.status === 429) {
      console.error('   Limite de requisições atingido ou sem créditos')
      console.error('   Verifique em: https://platform.openai.com/usage')
    } else if (error.status === 403) {
      console.error('   Acesso negado - verifique permissões da API Key')
    } else {
      console.error(`   Status: ${error.status}`)
      console.error(`   Mensagem: ${error.message}`)
    }

    process.exit(1)
  }
}

checkOpenAICredits()
