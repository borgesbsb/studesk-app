const fetch = require('node-fetch');

async function testFormatPDF() {
  const materialId = 'cmjm98x060001c9wqri24taxc'; // Material de teste

  console.log('🚀 TESTE DE FORMATAÇÃO DE PDF COM OPENAI');
  console.log('='.repeat(60));
  console.log(`📄 Material ID: ${materialId}\n`);

  try {
    console.log('📤 Enviando requisição para formatação...\n');

    const response = await fetch('http://localhost:3030/api/pdf/format-for-reader', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ materialId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro:', errorData.error || response.statusText);
      console.error('Details:', errorData.details);
      process.exit(1);
    }

    const data = await response.json();

    console.log('✅ SUCESSO!\n');
    console.log('📊 RESULTADOS:');
    console.log('─'.repeat(60));
    console.log(`   Cached: ${data.cached ? 'Sim (já estava processado)' : 'Não (processado agora)'}`);
    console.log(`   ID: ${data.data.id}`);
    console.log(`   Tokens usados: ${data.data.tokensUsed.toLocaleString('pt-BR')}`);
    console.log(`   Processado em: ${new Date(data.data.processedAt).toLocaleString('pt-BR')}`);
    console.log(`   Tamanho do texto: ${data.data.formattedText.length.toLocaleString('pt-BR')} caracteres`);
    console.log('─'.repeat(60));

    // Preview do texto formatado
    console.log('\n📱 PREVIEW DO MARKDOWN FORMATADO (primeiros 1000 caracteres):');
    console.log('='.repeat(60));
    console.log(data.data.formattedText.substring(0, 1000));
    console.log('...');
    console.log('='.repeat(60));

    // Estimar custo
    const inputTokens = Math.round(data.data.tokensUsed * 0.6); // Aproximação
    const outputTokens = Math.round(data.data.tokensUsed * 0.4);
    const custoEstimado = (inputTokens / 1000000) * 0.15 + (outputTokens / 1000000) * 0.60;

    console.log('\n💰 CUSTO ESTIMADO:');
    console.log(`   ~$${custoEstimado.toFixed(4)} USD`);
    console.log(`   ~R$${(custoEstimado * 5).toFixed(2)} BRL`);

    console.log('\n🎉 Teste concluído com sucesso!');
    console.log(`\n🌐 Acesse: http://localhost:3030/[userHash]/material/${materialId}/ler`);

  } catch (error) {
    console.error('❌ Erro ao testar formatação:', error.message);
    process.exit(1);
  }
}

testFormatPDF();
