/**
 * Script de teste para processar gabaritos com IA + Few-Shot Learning
 * Uso: node scripts/test-gabarito-fewshot.js
 */

const fs = require('fs');
const path = require('path');

async function testGabaritoProcessing() {
  console.log('🧪 Iniciando teste de processamento de gabaritos...\n');

  try {
    // Carregar arquivos
    const oficialPath = path.join(__dirname, '../simulado/GabaritoOficial.png');
    const usuarioPath = path.join(__dirname, '../simulado/gabarito_usuario.jpg');
    const exemploPath = path.join(__dirname, '../simulado/gabarito_exemplo_usuario.jpg');

    console.log('📁 Carregando arquivos:');
    console.log(`   Oficial: ${path.basename(oficialPath)}`);
    console.log(`   Usuário: ${path.basename(usuarioPath)}`);
    console.log(`   Exemplo (Few-Shot): ${path.basename(exemploPath)}\n`);

    // Ler arquivos como Buffer
    const oficialBuffer = fs.readFileSync(oficialPath);
    const usuarioBuffer = fs.readFileSync(usuarioPath);
    const exemploBuffer = fs.readFileSync(exemploPath);

    console.log('📊 Tamanhos dos arquivos:');
    console.log(`   Oficial: ${(oficialBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   Usuário: ${(usuarioBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   Exemplo: ${(exemploBuffer.length / 1024).toFixed(2)} KB\n`);

    const OpenAI = require('openai');

    // Inicializar cliente
    const openaiApiKey = process.env.OPENAI_API_KEY;

    console.log('🔑 Verificando API keys:');
    console.log(`   OPENAI_API_KEY: ${openaiApiKey ? '✅ Configurado' : '❌ Não encontrado'}\n`);

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurada!');
    }

    const client = new OpenAI({ apiKey: openaiApiKey });
    const model = 'gpt-4o-mini';

    console.log(`🎯 Provider: openai`);
    console.log(`🤖 Modelo: ${model}`);
    console.log(`📚 Few-Shot Learning: ATIVADO\n`);

    // Converter para base64
    console.log('🔄 Convertendo arquivos para base64...');
    const oficialBase64 = oficialBuffer.toString('base64');
    const usuarioBase64 = usuarioBuffer.toString('base64');
    const exemploBase64 = exemploBuffer.toString('base64');
    console.log('✅ Conversão concluída\n');

    // Preparar prompt - TESTE COMPLETO
    const questaoInicio = 1;
    const questaoFim = 80;

    const prompt = `Você é um assistente especializado em processar gabaritos de provas.

Você receberá 2 imagens/documentos:
1. GABARITO OFICIAL (primeira imagem)
2. GABARITO DO USUÁRIO (segunda imagem)

TAREFA:
Extraia e compare as respostas das questões de número ${questaoInicio} até ${questaoFim}.

INSTRUÇÕES:
1. Analise cuidadosamente as duas imagens/documentos
2. Identifique cada questão e suas respostas nos dois gabaritos
3. Compare se a resposta do usuário está correta (igual à resposta oficial)
4. As respostas podem ser:
   - Letras: A, B, C, D ou E
   - "ANULADA" (se a questão foi anulada)
   - "N" (se não foi respondida)
5. Questões ANULADAS: todos acertam (acertou = true)
6. Retorne APENAS um JSON válido, sem texto adicional

FORMATO DE SAÍDA (JSON):
{
  "questoes": [
    {"numero": 1, "respostaOficial": "A", "respostaUsuario": "A", "acertou": true},
    {"numero": 10, "respostaOficial": "ANULADA", "respostaUsuario": "B", "acertou": true}
  ]
}

Retorne o JSON:`;

    console.log(`📤 Enviando para IA (openai)...`);
    console.log(`   Questões: ${questaoInicio} até ${questaoFim}`);
    console.log(`   Few-Shot Learning: SIM ✅`);
    console.log(`   Timeout: Aguardando resposta...\n`);

    const startTime = Date.now();

    // Montar mensagens com Few-Shot Learning
    const messages = [
      {
        role: 'system',
        content: 'Você é um assistente especializado em processar gabaritos de provas. Sempre retorne JSON válido.'
      },
      // EXEMPLO (Few-Shot)
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `EXEMPLO DE REFERÊNCIA (aprenda o padrão):
Esta é uma imagem exemplo de gabarito preenchido.
As marcações são: 1)A, 2)B, 3)C, 4)D, 5)E, 6)C, 7)B, 8)D, 9)B, 10)ANULADA, 11)D, 12)B, 13)A, 14)ANULADA, 15)A

Questões ANULADAS devem ser marcadas como "ANULADA" no campo respostaOficial ou respostaUsuario.`
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${exemploBase64}`
            }
          }
        ]
      },
      {
        role: 'assistant',
        content: 'Entendi o padrão. Questões anuladas são marcadas claramente no gabarito. Vou processar os próximos gabaritos seguindo este formato.'
      },
      // TAREFA REAL
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${oficialBase64}`
            }
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${usuarioBase64}`
            }
          }
        ]
      }
    ];

    const completion = await client.chat.completions.create({
      model,
      messages: messages,
      temperature: 0.1,
      max_tokens: 6000, // Aumentado para 80 questões
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Resposta recebida em ${elapsed}s\n`);

    const result = completion.choices[0]?.message?.content || '';
    const usage = completion.usage;

    console.log('📊 USO DE TOKENS:');
    console.log(`   Input tokens:  ${usage.prompt_tokens.toLocaleString()}`);
    console.log(`   Output tokens: ${usage.completion_tokens.toLocaleString()}`);
    console.log(`   Total tokens:  ${usage.total_tokens.toLocaleString()}\n`);

    // Calcular custo
    const PRECO_INPUT = 0.150 / 1000000;
    const PRECO_OUTPUT = 0.600 / 1000000;
    const custoInput = usage.prompt_tokens * PRECO_INPUT;
    const custoOutput = usage.completion_tokens * PRECO_OUTPUT;
    const custoTotal = custoInput + custoOutput;

    console.log('💰 CUSTO DA CHAMADA:');
    console.log(`   Input:  $${custoInput.toFixed(6)}`);
    console.log(`   Output: $${custoOutput.toFixed(6)}`);
    console.log(`   ─────────────────────────────`);
    console.log(`   TOTAL:  $${custoTotal.toFixed(6)} (R$ ${(custoTotal * 6.0).toFixed(4)})\n`);

    console.log('📥 Resposta da IA:');
    console.log('─'.repeat(80));
    console.log(result.substring(0, 500) + '...');  // Mostrar primeiros 500 chars
    console.log('─'.repeat(80));
    console.log();

    // Extrair JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('❌ Resposta da IA não contém JSON válido');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    console.log('✅ JSON parseado com sucesso!\n');
    console.log('📊 Resultado do processamento:');
    console.log(`   Total de questões: ${parsed.questoes.length}`);
    console.log(`   Acertos: ${parsed.questoes.filter(q => q.acertou).length}`);
    console.log(`   Erros: ${parsed.questoes.filter(q => !q.acertou && q.respostaUsuario !== 'N').length}`);
    console.log(`   Não respondidas: ${parsed.questoes.filter(q => q.respostaUsuario === 'N').length}`);
    console.log(`   Anuladas: ${parsed.questoes.filter(q => q.respostaOficial === 'ANULADA' || q.respostaUsuario === 'ANULADA').length}\n`);

    console.log('📋 Primeiras 20 questões:');
    parsed.questoes.slice(0, 20).forEach(q => {
      const status = q.acertou ? '✅' : (q.respostaUsuario === 'N' ? '⊝' : '❌');
      const anulada = (q.respostaOficial === 'ANULADA' || q.respostaUsuario === 'ANULADA') ? ' 🚫' : '';
      console.log(`   ${status} Q${q.numero.toString().padStart(2)}: Oficial=${q.respostaOficial.padEnd(7)} | Usuário=${q.respostaUsuario.padEnd(7)}${anulada}`);
    });

    if (parsed.questoes.length > 20) {
      console.log(`   ... (${parsed.questoes.length - 20} questões restantes)`);
    }

    console.log('\n🎉 Teste concluído com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro durante o teste:');
    console.error(error.message);

    if (error.response) {
      console.error('\n📡 Resposta da API:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }

    process.exit(1);
  }
}

// Executar teste
testGabaritoProcessing();
