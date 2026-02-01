/**
 * Script de teste para processar gabaritos com IA
 * Uso: node scripts/test-gabarito.js
 */

const fs = require('fs');
const path = require('path');

// Simular ambiente Node.js para imports ES6
async function testGabaritoProcessing() {
  console.log('🧪 Iniciando teste de processamento de gabaritos...\n');

  try {
    // Carregar arquivos
    const oficialPath = path.join(__dirname, '../simulado/GabaritoOficial.png');
    const usuarioPath = path.join(__dirname, '../simulado/gabarito_usuario.jpg');

    console.log('📁 Carregando arquivos:');
    console.log(`   Oficial: ${path.basename(oficialPath)}`);
    console.log(`   Usuário: ${path.basename(usuarioPath)}\n`);

    // Ler arquivos como Buffer
    const oficialBuffer = fs.readFileSync(oficialPath);
    const usuarioBuffer = fs.readFileSync(usuarioPath);

    console.log('📊 Tamanhos dos arquivos:');
    console.log(`   Oficial: ${(oficialBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   Usuário: ${(usuarioBuffer.length / 1024).toFixed(2)} KB\n`);

    // Criar objetos File simulados (similar ao navegador)
    const oficialFile = {
      name: path.basename(oficialPath),
      type: 'image/png',
      arrayBuffer: async () => oficialBuffer.buffer.slice(oficialBuffer.byteOffset, oficialBuffer.byteOffset + oficialBuffer.byteLength)
    };

    const usuarioFile = {
      name: path.basename(usuarioPath),
      type: 'image/jpeg',
      arrayBuffer: async () => usuarioBuffer.buffer.slice(usuarioBuffer.byteOffset, usuarioBuffer.byteOffset + usuarioBuffer.byteLength)
    };

    // Importar o serviço (usando require para compatibilidade)
    console.log('🔧 Carregando GabaritoService...');

    // Como o serviço usa import, vamos testar diretamente via API
    console.log('⚠️  GabaritoService usa ES6 imports, vamos criar teste direto com OpenAI\n');

    const OpenAI = require('openai');

    // Inicializar cliente
    const groqApiKey = process.env.GROQ_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    console.log('🔑 Verificando API keys:');
    console.log(`   GROQ_API_KEY: ${groqApiKey ? '✅ Configurado' : '❌ Não encontrado'}`);
    console.log(`   OPENAI_API_KEY: ${openaiApiKey ? '✅ Configurado' : '❌ Não encontrado'}\n`);

    if (!groqApiKey && !openaiApiKey) {
      throw new Error('Nenhuma API key configurada! Configure GROQ_API_KEY ou OPENAI_API_KEY no .env');
    }

    // Groq descontinuou modelos de visão, usar OpenAI
    const primaryProvider = 'openai';
    const client = new OpenAI({ apiKey: openaiApiKey });
    const model = 'gpt-4o-mini';  // Modelo com visão do OpenAI

    console.log(`🎯 Provider primário: ${primaryProvider}`);
    console.log(`🤖 Modelo: ${model}\n`);

    // Converter para base64
    console.log('🔄 Convertendo arquivos para base64...');
    const oficialBase64 = oficialBuffer.toString('base64');
    const usuarioBase64 = usuarioBuffer.toString('base64');
    console.log('✅ Conversão concluída\n');

    // Preparar prompt - TESTE DAS 10 PRIMEIRAS
    const questaoInicio = 1;
    const questaoFim = 10;

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
4. As respostas são sempre letras: A, B, C, D ou E
5. Se a questão não foi respondida pelo usuário, considere como "N" (não respondeu)
6. Retorne APENAS um JSON válido, sem texto adicional

FORMATO DE SAÍDA (JSON):
{
  "questoes": [
    {
      "numero": 1,
      "respostaOficial": "A",
      "respostaUsuario": "A",
      "acertou": true
    },
    {
      "numero": 2,
      "respostaOficial": "B",
      "respostaUsuario": "C",
      "acertou": false
    }
  ]
}

Retorne o JSON:`;

    console.log(`📤 Enviando para IA (${primaryProvider})...`);
    console.log(`   Questões: ${questaoInicio} até ${questaoFim}`);
    console.log(`   Timeout: Aguardando resposta...\n`);

    const startTime = Date.now();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente especializado em processar gabaritos de provas. Sempre retorne JSON válido.'
        },
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
      ],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Resposta recebida em ${elapsed}s\n`);

    const result = completion.choices[0]?.message?.content || '';

    console.log('📥 Resposta da IA:');
    console.log('─'.repeat(80));
    console.log(result);
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
    console.log(`   Não respondidas: ${parsed.questoes.filter(q => q.respostaUsuario === 'N').length}\n`);

    console.log('📋 Detalhamento das questões:');
    parsed.questoes.forEach(q => {
      const status = q.acertou ? '✅' : (q.respostaUsuario === 'N' ? '⊝' : '❌');
      console.log(`   ${status} Q${q.numero}: Oficial=${q.respostaOficial} | Usuário=${q.respostaUsuario}`);
    });

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
