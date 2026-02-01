/**
 * Script de teste com prompt MUITO mais detalhado
 * Explicando exatamente como identificar bolinhas preenchidas
 * Uso: node scripts/test-gabarito-detalhado.js
 */

const fs = require('fs');
const path = require('path');

async function testComPromptDetalhado() {
  console.log('🧪 Teste: Prompt Super Detalhado\n');

  try {
    const usuarioPath = path.join(__dirname, '../simulado/gabarito_usuario.jpg');
    const usuarioBuffer = fs.readFileSync(usuarioPath);
    const usuarioBase64 = usuarioBuffer.toString('base64');

    console.log('📁 Arquivo:', path.basename(usuarioPath));
    console.log(`📊 Tamanho: ${(usuarioBuffer.length / 1024).toFixed(2)} KB\n`);

    const OpenAI = require('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurada!');
    }

    const client = new OpenAI({ apiKey: openaiApiKey });
    const model = 'gpt-4o-mini';

    console.log(`🤖 Modelo: ${model}\n`);

    const prompt = `Você está analisando uma FOLHA DE RESPOSTAS de múltipla escolha.

📋 DESCRIÇÃO EXATA DO LAYOUT:
- A folha tem várias LINHAS HORIZONTAIS
- Cada linha representa UMA questão
- À ESQUERDA de cada linha tem o NÚMERO da questão (1, 2, 3, etc.)
- À DIREITA do número tem 5 CÍRCULOS em sequência horizontal
- Cada círculo representa uma alternativa: A, B, C, D, E (nesta ordem, da esquerda para direita)
- Dentro de cada círculo tem a LETRA da alternativa impressa

🎯 COMO O USUÁRIO MARCA A RESPOSTA:
- O usuário PINTA/PREENCHE completamente o círculo da alternativa escolhida
- Quando um círculo é pintado, ele fica ESCURO/PRETO
- A letra DENTRO do círculo pintado pode ficar invisível ou difícil de ver
- Os outros 4 círculos da mesma linha permanecem vazios (você vê a letra dentro)

🔍 SUA TAREFA:
Para as questões 1 até 10:
1. Localize o número da questão à esquerda
2. Olhe os 5 círculos dessa linha (sempre na ordem A, B, C, D, E)
3. Identifique qual círculo está PINTADO (mais escuro/preenchido que os outros)
4. A posição do círculo pintado indica a resposta:
   - 1º círculo pintado (mais à esquerda) = A
   - 2º círculo pintado = B
   - 3º círculo pintado = C
   - 4º círculo pintado = D
   - 5º círculo pintado (mais à direita) = E
5. Se NENHUM círculo estiver pintado na linha, use "N"

⚠️ IMPORTANTE:
- Não tente ler a letra DENTRO do círculo pintado (pode estar invisível)
- Identifique QUAL círculo está preenchido pela COR/TONALIDADE escura
- Use a POSIÇÃO do círculo (1º, 2º, 3º, 4º ou 5º) para determinar a letra
- A ordem SEMPRE é: A (1º), B (2º), C (3º), D (4º), E (5º)

📤 FORMATO DE SAÍDA:
Retorne JSON com as questões 1 até 10:
{
  "questoes": [
    { "numero": 1, "resposta": "A" },
    { "numero": 2, "resposta": "B" }
  ]
}`;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 Enviando com prompt detalhado...');
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

    console.log('🎉 Teste concluído!');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testComPromptDetalhado();
