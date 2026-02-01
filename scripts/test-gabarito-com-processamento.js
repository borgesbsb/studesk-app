/**
 * Script de teste com processamento de imagem
 * Aplica tratamentos para melhorar OCR
 * Uso: node scripts/test-gabarito-com-processamento.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function processarImagem(inputPath, outputPath) {
  console.log('🔧 Processando imagem...');

  const image = sharp(inputPath);
  const metadata = await image.metadata();

  console.log(`   Resolução original: ${metadata.width}x${metadata.height}`);
  console.log(`   Formato: ${metadata.format}`);
  console.log(`   Tamanho: ${(fs.statSync(inputPath).size / 1024).toFixed(2)} KB`);

  // Aplicar processamentos para melhorar OCR
  await image
    // 1. Redimensionar se muito grande (mantém proporção)
    .resize(2000, 2000, {
      fit: 'inside',
      withoutEnlargement: true
    })
    // 2. Converter para escala de cinza (remove cores desnecessárias)
    .grayscale()
    // 3. Aumentar contraste (torna bolinhas preenchidas mais evidentes)
    .normalize()
    // 4. Aumentar nitidez (melhora bordas)
    .sharpen()
    // 5. Ajustar brilho/contraste
    .modulate({
      brightness: 1.1,  // 10% mais brilho
      saturation: 0,    // Remove saturação (já está em cinza)
      contrast: 1.2     // 20% mais contraste
    })
    // 6. Salvar como PNG de alta qualidade (sem compressão JPG)
    .png({ quality: 100, compressionLevel: 0 })
    .toFile(outputPath);

  const processedSize = fs.statSync(outputPath).size;
  console.log(`   ✅ Imagem processada: ${(processedSize / 1024).toFixed(2)} KB`);
  console.log(`   Salva em: ${path.basename(outputPath)}\n`);

  return outputPath;
}

async function testComProcessamento() {
  console.log('🧪 Teste: GABARITO DO USUÁRIO com Processamento de Imagem\n');

  try {
    // Carregar arquivo original
    const usuarioPath = path.join(__dirname, '../simulado/gabarito_usuario.jpg');
    const processedPath = path.join(__dirname, '../simulado/gabarito_usuario_processado.png');

    // Processar imagem
    await processarImagem(usuarioPath, processedPath);

    // Carregar imagem processada
    const usuarioBuffer = fs.readFileSync(processedPath);

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
    console.log('📤 Extraindo GABARITO DO USUÁRIO (imagem processada)...');
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

    console.log('📋 GABARITO DO USUÁRIO EXTRAÍDO (COM PROCESSAMENTO):');
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

    console.log('\n💡 DICA: Compare com a imagem processada em:');
    console.log(`   ${processedPath}`);

    console.log('\n🎉 Teste concluído!');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testComProcessamento();
