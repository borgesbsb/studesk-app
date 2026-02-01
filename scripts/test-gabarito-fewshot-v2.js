/**
 * Script de teste com Few-Shot Learning
 * Envia imagem de exemplo para a IA aprender o padrão
 * Uso: node scripts/test-gabarito-fewshot-v2.js
 */

const fs = require('fs');
const path = require('path');

async function testComFewShot() {
  console.log('🧪 Teste: Few-Shot Learning com Imagem de Exemplo\n');

  try {
    // Carregar imagem de EXEMPLO
    const exemploPath = path.join(__dirname, '../simulado/gabarito_exemplo_usuario.jpg');
    const exemploBuffer = fs.readFileSync(exemploPath);
    const exemploBase64 = exemploBuffer.toString('base64');

    console.log('📁 Imagem de EXEMPLO carregada:');
    console.log(`   Arquivo: ${path.basename(exemploPath)}`);
    console.log(`   Tamanho: ${(exemploBuffer.length / 1024).toFixed(2)} KB\n`);

    // Carregar imagem REAL do usuário
    const usuarioPath = path.join(__dirname, '../simulado/gabarito_usuario.jpg');
    const usuarioBuffer = fs.readFileSync(usuarioPath);
    const usuarioBase64 = usuarioBuffer.toString('base64');

    console.log('📁 Imagem REAL do usuário carregada:');
    console.log(`   Arquivo: ${path.basename(usuarioPath)}`);
    console.log(`   Tamanho: ${(usuarioBuffer.length / 1024).toFixed(2)} KB\n`);

    const OpenAI = require('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurada!');
    }

    const client = new OpenAI({ apiKey: openaiApiKey });
    const model = 'gpt-4o-mini';

    console.log(`🤖 Modelo: ${model}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 Enviando com Few-Shot Learning...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const start = Date.now();
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente especializado em OCR e extração de gabaritos. Sempre retorne JSON válido.'
        },
        // ===== EXEMPLO (Few-Shot) =====
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Vou te ensinar COMO identificar respostas marcadas em folhas de gabarito.

📋 COMO FUNCIONA A FOLHA DE RESPOSTAS:
- Cada questão tem uma LINHA
- Cada linha tem 5 bolinhas com letras: A, B, C, D, E
- O usuário PINTA a bolinha da letra que escolheu
- Bolinha PINTADA = escura, letra pode ficar invisível
- Bolinhas NÃO pintadas = você consegue ver a letra dentro

🔍 COMO IDENTIFICAR:
1. Encontre o número da questão na linha
2. Olhe as 5 bolinhas dessa linha (sempre na ordem A, B, C, D, E da esquerda para direita)
3. Identifique qual bolinha está PINTADA (mais escura que as outras)
4. A resposta é a letra daquela posição

📸 EXEMPLO - Veja esta folha de gabarito:`
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${exemploBase64}` }
            },
            {
              type: 'text',
              text: `Analise a imagem acima e me diga quais letras estão marcadas nas primeiras 5 questões.
Lembre-se: identifique pela bolinha MAIS ESCURA em cada linha.`
            }
          ]
        },
        {
          role: 'assistant',
          content: `Analisando a imagem, identifiquei as bolinhas pintadas (mais escuras) em cada linha:

{
  "questoes": [
    { "numero": 1, "resposta": "A" },
    { "numero": 2, "resposta": "B" },
    { "numero": 3, "resposta": "C" },
    { "numero": 4, "resposta": "D" },
    { "numero": 5, "resposta": "E" }
  ]
}`
        },
        // ===== TAREFA REAL =====
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Perfeito! Você aprendeu COMO identificar.

Agora analise esta NOVA folha de respostas e identifique as bolinhas pintadas nas questões 1 até 10.

⚠️ IMPORTANTE:
- NÃO copie o padrão do exemplo anterior
- Analise ESTA imagem e identifique qual bolinha está MAIS ESCURA em cada linha
- Cada questão pode ter UMA letra diferente marcada
- Se nenhuma bolinha estiver pintada na linha, use "N"

📸 Imagem para analisar:`
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${usuarioBase64}` }
            },
            {
              type: 'text',
              text: `Retorne JSON identificando qual bolinha está PINTADA em cada linha desta imagem:`
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

    console.log('📋 GABARITO EXTRAÍDO (COM FEW-SHOT):');
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

testComFewShot();
