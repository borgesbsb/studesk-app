/**
 * Script de teste para extrair APENAS o gabarito do USUÁRIO
 * Uso: node scripts/test-gabarito-usuario-only.js
 */

const fs = require('fs');
const path = require('path');

async function testGabaritoUsuario() {
  console.log('🧪 Teste: Extraindo APENAS GABARITO DO USUÁRIO\n');

  try {
    // Carregar apenas arquivo do usuário
    const usuarioPath = path.join(__dirname, '../simulado/gabarito_usuario.jpg');

    console.log('📁 Arquivo:', path.basename(usuarioPath));
    const usuarioBuffer = fs.readFileSync(usuarioPath);
    console.log(`📊 Tamanho: ${(usuarioBuffer.length / 1024).toFixed(2)} KB\n`);

    const OpenAI = require('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurada!');
    }

    const client = new OpenAI({ apiKey: openaiApiKey });
    const model = 'gpt-4o-mini';

    console.log(`🤖 Modelo: ${model}\n`);

    // Converter para base64
    const usuarioBase64 = usuarioBuffer.toString('base64');

    // Intervalos (primeiras 10 questões)
    const intervalos = [{ questaoInicio: 1, questaoFim: 10 }];
    const intervalosStr = intervalos.map((int, idx) =>
      `${idx + 1}. Questões ${int.questaoInicio} até ${int.questaoFim}`
    ).join('\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 Extraindo GABARITO DO USUÁRIO...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const prompt = `Identifique as letras marcadas na folha de respostas.

Para as questões:
${intervalosStr}

Identifique qual letra (A, B, C, D ou E) foi marcada em cada questão.
Se nenhuma letra foi marcada, use "N".

Retorne JSON:
{
  "questoes": [
    { "numero": 1, "resposta": "A" },
    { "numero": 2, "resposta": "C" }
  ]
}`;

    console.log('📝 Prompt enviado:');
    console.log('─'.repeat(80));
    console.log(prompt);
    console.log('─'.repeat(80));
    console.log();

    const start = Date.now();
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente especializado em OCR e extração de gabaritos. Sempre retorne JSON válido.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${usuarioBase64}` }
            }
          ]
        }
      ],
      temperature: 0,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    const result = completion.choices[0]?.message?.content || '';

    console.log(`✅ Resposta recebida em ${elapsed}s\n`);

    // Verificar uso de tokens (cache reduziria esses valores)
    console.log('📊 USO DE TOKENS:');
    console.log(`   Prompt tokens: ${completion.usage?.prompt_tokens || 'N/A'}`);
    console.log(`   Completion tokens: ${completion.usage?.completion_tokens || 'N/A'}`);
    console.log(`   Total tokens: ${completion.usage?.total_tokens || 'N/A'}`);
    if (completion.usage?.prompt_tokens_details?.cached_tokens) {
      console.log(`   🎯 CACHED tokens: ${completion.usage.prompt_tokens_details.cached_tokens}`);
    } else {
      console.log(`   ⚠️  SEM cache detectado`);
    }
    console.log();

    console.log('📥 Resposta da IA (JSON):');
    console.log('─'.repeat(80));
    console.log(result);
    console.log('─'.repeat(80));
    console.log();

    const gabarito = JSON.parse(result);

    console.log('📋 GABARITO DO USUÁRIO EXTRAÍDO:');
    console.log('─'.repeat(80));
    gabarito.questoes.forEach(q => {
      console.log(`   Q${q.numero}: ${q.resposta}`);
    });
    console.log('─'.repeat(80));
    console.log();

    console.log('📊 ESTATÍSTICAS:');
    console.log(`   Total de questões: ${gabarito.questoes.length}`);
    console.log(`   Respondidas: ${gabarito.questoes.filter(q => q.resposta !== 'N').length}`);
    console.log(`   Não respondidas: ${gabarito.questoes.filter(q => q.resposta === 'N').length}`);

    console.log('\n🎉 Teste concluído!');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testGabaritoUsuario();
