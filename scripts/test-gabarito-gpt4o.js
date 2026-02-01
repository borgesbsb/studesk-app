/**
 * Script de teste com modelo GPT-4O (mais potente)
 * Para comparar com gpt-4o-mini
 * Uso: node scripts/test-gabarito-gpt4o.js
 */

const fs = require('fs');
const path = require('path');

async function testComGPT4O() {
  console.log('🧪 Teste: GPT-4O (modelo mais potente)\n');

  try {
    // Carregar arquivo do usuário
    const usuarioPath = path.join(__dirname, '../simulado/gabarito_usuario.jpg');
    const usuarioBuffer = fs.readFileSync(usuarioPath);
    const usuarioBase64 = usuarioBuffer.toString('base64');

    console.log('📁 Arquivo carregado:');
    console.log(`   ${path.basename(usuarioPath)}`);
    console.log(`   Tamanho: ${(usuarioBuffer.length / 1024).toFixed(2)} KB\n`);

    const OpenAI = require('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurada!');
    }

    const client = new OpenAI({ apiKey: openaiApiKey });
    const model = 'gpt-4o'; // ← MODELO MAIS POTENTE

    console.log(`🤖 Modelo: ${model}\n`);

    // Intervalos (primeiras 10 questões)
    const intervalos = [{ questaoInicio: 1, questaoFim: 10 }];
    const intervalosStr = intervalos.map((int, idx) =>
      `${idx + 1}. Questões ${int.questaoInicio} até ${int.questaoFim}`
    ).join('\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 Enviando para GPT-4O...');
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

    console.log('📊 USO DE TOKENS:');
    console.log(`   Prompt tokens: ${completion.usage?.prompt_tokens || 'N/A'}`);
    console.log(`   Completion tokens: ${completion.usage?.completion_tokens || 'N/A'}`);
    console.log(`   Total tokens: ${completion.usage?.total_tokens || 'N/A'}`);
    console.log();

    console.log('📥 Resposta da IA (JSON):');
    console.log('─'.repeat(80));
    console.log(result);
    console.log('─'.repeat(80));
    console.log();

    const gabarito = JSON.parse(result);

    console.log('📋 GABARITO EXTRAÍDO COM GPT-4O:');
    console.log('─'.repeat(80));
    gabarito.questoes.forEach(q => {
      console.log(`   Q${q.numero}: ${q.resposta}`);
    });
    console.log('─'.repeat(80));
    console.log();

    // Comparar com gabarito real fornecido pelo usuário
    const gabaritoReal = {
      1: 'A', 2: 'B', 3: 'A', 4: 'E', 5: 'C',
      6: 'A', 7: 'B', 8: 'A', 9: 'C', 10: 'C'
    };

    console.log('🎯 COMPARAÇÃO COM GABARITO REAL:');
    console.log('─'.repeat(80));

    let acertos = 0;
    gabarito.questoes.forEach(q => {
      const esperado = gabaritoReal[q.numero];
      const acertou = q.resposta === esperado;
      if (acertou) acertos++;

      const status = acertou ? '✅' : '❌';
      console.log(`   ${status} Q${q.numero}: IA=${q.resposta} | REAL=${esperado}`);
    });

    console.log('─'.repeat(80));
    console.log(`\n📊 TAXA DE ACERTO: ${acertos}/10 (${(acertos/10*100).toFixed(1)}%)\n`);

    console.log('🎉 Teste concluído!');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testComGPT4O();
