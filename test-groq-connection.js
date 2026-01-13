require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

async function testGroqAPI() {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  console.log('🔍 Testando conexão com Groq API...\n');
  console.log('API Key presente:', GROQ_API_KEY ? '✓ Sim' : '✗ Não');
  console.log('API Key (primeiros 20 chars):', GROQ_API_KEY?.substring(0, 20) + '...\n');

  if (!GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY não encontrada nas variáveis de ambiente');
    process.exit(1);
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: 'Diga apenas "Olá, Groq está funcionando!" em português.'
          }
        ],
        temperature: 0.7,
        max_tokens: 50,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Erro na resposta da API:');
      console.error('Status:', response.status);
      console.error('Detalhes:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log('✅ Groq API está funcional!\n');
    console.log('📊 Informações da resposta:');
    console.log('- Modelo usado:', data.model);
    console.log('- Tokens usados:', data.usage?.total_tokens || 'N/A');
    console.log('- Resposta:', data.choices[0]?.message?.content || 'N/A');
    console.log('\n✨ Teste concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao testar Groq API:', error.message);
    process.exit(1);
  }
}

testGroqAPI();
