/**
 * Script de teste com isolamento da cor AZUL
 * Para destacar as bolinhas marcadas em azul
 * Uso: node scripts/test-gabarito-blue-isolation.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function processarComIsolamentoAzul(inputPath, outputPath) {
  console.log('🔧 Processando imagem com isolamento de azul...\n');

  const image = sharp(inputPath);
  const metadata = await image.metadata();

  console.log(`   Resolução original: ${metadata.width}x${metadata.height}`);
  console.log(`   Formato: ${metadata.format}`);
  console.log(`   Tamanho: ${(fs.statSync(inputPath).size / 1024).toFixed(2)} KB\n`);

  // Processar para destacar o azul
  await image
    // 1. Redimensionar se necessário (manter qualidade alta)
    .resize(3000, 3000, {
      fit: 'inside',
      withoutEnlargement: true
    })
    // 2. Aumentar muito o contraste
    .modulate({
      brightness: 1.2,
      saturation: 1.5,  // Aumentar saturação para destacar azul
      contrast: 1.5     // Muito contraste
    })
    // 3. Aumentar nitidez
    .sharpen({ sigma: 2 })
    // 4. Normalizar (esticar histograma)
    .normalize()
    // 5. Salvar como PNG de alta qualidade
    .png({ quality: 100, compressionLevel: 0 })
    .toFile(outputPath);

  const processedSize = fs.statSync(outputPath).size;
  console.log(`   ✅ Imagem processada: ${(processedSize / 1024).toFixed(2)} KB`);
  console.log(`   Salva em: ${path.basename(outputPath)}\n`);

  return outputPath;
}

async function testComIsolamentoAzul() {
  console.log('🧪 Teste: Isolamento de Cor AZUL para destacar marcações\n');

  try {
    const usuarioPath = path.join(__dirname, '../simulado/gabarito_usuario.jpg');
    const processedPath = path.join(__dirname, '../simulado/gabarito_usuario_blue_isolated.png');

    // Processar imagem
    await processarComIsolamentoAzul(usuarioPath, processedPath);

    // Carregar imagem processada
    const usuarioBuffer = fs.readFileSync(processedPath);
    const usuarioBase64 = usuarioBuffer.toString('base64');

    const OpenAI = require('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurada!');
    }

    const client = new OpenAI({ apiKey: openaiApiKey });
    const model = 'gpt-4o-mini';

    console.log(`🤖 Modelo: ${model}\n`);

    const prompt = `Você está analisando uma FOLHA DE RESPOSTAS de múltipla escolha.

🎯 INFORMAÇÃO IMPORTANTE:
- As respostas marcadas estão PINTADAS com CANETA AZUL
- Procure por círculos AZUIS ESCUROS/PREENCHIDOS
- Cada linha tem 5 círculos (A, B, C, D, E da esquerda para direita)
- O círculo marcado é o que está PINTADO DE AZUL

📋 TAREFA:
Para as questões 1 até 10, identifique qual círculo está PINTADO DE AZUL em cada linha.
Use a POSIÇÃO do círculo pintado:
- 1º círculo = A
- 2º círculo = B
- 3º círculo = C
- 4º círculo = D
- 5º círculo = E

Se nenhum círculo estiver pintado, use "N".

Retorne JSON:
{
  "questoes": [
    { "numero": 1, "resposta": "A" },
    { "numero": 2, "resposta": "B" }
  ]
}`;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 Enviando imagem processada...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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
              image_url: { url: `data:image/png;base64,${usuarioBase64}` }
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

    console.log('📋 GABARITO EXTRAÍDO:');
    console.log('─'.repeat(80));
    gabarito.questoes.forEach(q => {
      console.log(`   Q${q.numero}: ${q.resposta}`);
    });
    console.log('─'.repeat(80));
    console.log();

    // Comparar com gabarito real
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

    console.log('💡 Verifique a imagem processada em:');
    console.log(`   ${processedPath}\n`);

    console.log('🎉 Teste concluído!');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testComIsolamentoAzul();
