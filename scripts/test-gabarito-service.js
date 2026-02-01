/**
 * Script de teste para processar gabaritos usando o GabaritoService
 * com extração separada (OFICIAL → USUÁRIO → Comparação)
 * Uso: node scripts/test-gabarito-service.js
 */

const fs = require('fs');
const path = require('path');

async function testGabaritoService() {
  console.log('🧪 Iniciando teste com GabaritoService (Extração Separada)...\n');

  try {
    // Carregar arquivos
    const oficialPath = path.join(__dirname, '../simulado/GabaritoOficial.png');
    const usuarioPath = path.join(__dirname, '../simulado/gabarito_usuario.jpg');

    console.log('📁 Carregando arquivos:');
    console.log(`   Oficial: ${path.basename(oficialPath)}`);
    console.log(`   Usuário: ${path.basename(usuarioPath)}\n`);

    const oficialBuffer = fs.readFileSync(oficialPath);
    const usuarioBuffer = fs.readFileSync(usuarioPath);

    console.log('📊 Tamanhos dos arquivos:');
    console.log(`   Oficial: ${(oficialBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   Usuário: ${(usuarioBuffer.length / 1024).toFixed(2)} KB\n`);

    const OpenAI = require('openai');

    // Verificar API keys
    const openaiApiKey = process.env.OPENAI_API_KEY;

    console.log('🔑 Verificando API keys:');
    console.log(`   OPENAI_API_KEY: ${openaiApiKey ? '✅ Configurado' : '❌ Não encontrado'}\n`);

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurada! Configure no .env');
    }

    const client = new OpenAI({ apiKey: openaiApiKey });
    const model = 'gpt-4o-mini';

    console.log(`🎯 Provider: openai`);
    console.log(`🤖 Modelo: ${model}\n`);

    // Converter para base64
    const oficialBase64 = oficialBuffer.toString('base64');
    const usuarioBase64 = usuarioBuffer.toString('base64');

    // Intervalos para testar (primeiras 10 questões)
    const intervalos = [{ questaoInicio: 1, questaoFim: 10 }];
    const intervalosStr = intervalos.map((int, idx) =>
      `${idx + 1}. Questões ${int.questaoInicio} até ${int.questaoFim}`
    ).join('\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 PASSO 1: Extraindo GABARITO OFICIAL...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const promptOficial = `Você é um especialista em OCR de gabaritos.

TAREFA:
Extraia as respostas corretas do gabarito oficial para as seguintes questões:
${intervalosStr}

DESCRIÇÃO DA IMAGEM:
- Documento com gabarito oficial da prova
- Formato: lista ou tabela com número da questão e letra da resposta
- Exemplo: "1. A", "2. C", "3. ANULADA"

O QUE FAZER:
1. Para cada questão, encontre o número
2. Identifique a letra ao lado (A, B, C, D, E ou ANULADA)
3. Se a questão foi anulada, use "ANULADA"

FORMATO DE SAÍDA:
{
  "questoes": [
    { "numero": 1, "resposta": "A" },
    { "numero": 2, "resposta": "C" },
    { "numero": 3, "resposta": "ANULADA" }
  ]
}

Retorne APENAS o JSON, sem texto adicional.`;

    const startOficial = Date.now();
    const completionOficial = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente especializado em OCR e extração de gabaritos. Sempre retorne JSON válido.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: promptOficial },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${oficialBase64}` }
            }
          ]
        }
      ],
      temperature: 0,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const elapsedOficial = ((Date.now() - startOficial) / 1000).toFixed(2);
    const resultOficial = completionOficial.choices[0]?.message?.content || '';
    const gabaritoOficial = JSON.parse(resultOficial);

    console.log(`✅ Gabarito OFICIAL extraído em ${elapsedOficial}s`);
    console.log('Primeiras 5 questões:', gabaritoOficial.questoes.slice(0, 5));
    console.log();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 PASSO 2: Extraindo GABARITO DO USUÁRIO...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const promptUsuario = `Identifique as letras marcadas na folha de respostas.

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

    const startUsuario = Date.now();
    const completionUsuario = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente especializado em OCR e extração de gabaritos. Sempre retorne JSON válido.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: promptUsuario },
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

    const elapsedUsuario = ((Date.now() - startUsuario) / 1000).toFixed(2);
    const resultUsuario = completionUsuario.choices[0]?.message?.content || '';
    const gabaritoUsuario = JSON.parse(resultUsuario);

    console.log(`✅ Gabarito USUÁRIO extraído em ${elapsedUsuario}s`);
    console.log('Primeiras 5 questões:', gabaritoUsuario.questoes.slice(0, 5));
    console.log();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 PASSO 3: Comparando gabaritos (NO CÓDIGO)...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Criar mapa do usuário
    const usuarioMap = new Map(
      gabaritoUsuario.questoes.map(q => [q.numero, q.resposta])
    );

    const questoesComparadas = [];

    for (const questaoOficial of gabaritoOficial.questoes) {
      const respostaUsuario = usuarioMap.get(questaoOficial.numero) || 'N';
      let acertou = null;

      if (respostaUsuario === 'N') {
        acertou = null;
      } else if (questaoOficial.resposta === 'ANULADA') {
        acertou = true;
      } else {
        acertou = questaoOficial.resposta === respostaUsuario;
      }

      questoesComparadas.push({
        numero: questaoOficial.numero,
        respostaOficial: questaoOficial.resposta,
        respostaUsuario: respostaUsuario,
        acertou
      });
    }

    console.log('✅ Comparação concluída!\n');

    // Estatísticas
    const acertos = questoesComparadas.filter(q => q.acertou === true).length;
    const erros = questoesComparadas.filter(q => q.acertou === false).length;
    const naoRespondidas = questoesComparadas.filter(q => q.acertou === null).length;

    console.log('📊 RESULTADO FINAL:');
    console.log('─'.repeat(80));
    console.log(`   Total de questões: ${questoesComparadas.length}`);
    console.log(`   ✅ Acertos: ${acertos}`);
    console.log(`   ❌ Erros: ${erros}`);
    console.log(`   ⚪ Não respondidas: ${naoRespondidas}`);
    console.log(`   📈 Percentual: ${((acertos / (acertos + erros)) * 100).toFixed(1)}%`);
    console.log('─'.repeat(80));
    console.log();

    console.log('📋 DETALHAMENTO:');
    questoesComparadas.forEach(q => {
      const status = q.acertou === true ? '✅' : (q.acertou === false ? '❌' : '⚪');
      console.log(`   ${status} Q${q.numero}: OFICIAL=${q.respostaOficial} | USUÁRIO=${q.respostaUsuario}`);
    });

    console.log('\n🎉 Teste concluído com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro durante o teste:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar teste
testGabaritoService();
