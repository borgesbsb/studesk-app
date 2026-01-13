// Test script para validar reformatação de texto PDF com OpenAI
require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai').default;
const fs = require('fs');
const pdfParse = require('pdf-parse');

const PDF_PATH = 'public/uploads/cmiojz4340001c9r0iwdq6obx/vHbFQtEAZCIJrFTVKkcfN_curso-244684-aula-00-f81a-completo.pdf';

async function extrairTextoPDF(pdfPath, paginas = 2) {
  console.log(`📄 Extraindo texto do PDF: ${pdfPath.split('/').pop()}`);
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);

  // Pegar apenas as primeiras N páginas para o teste
  const textoCompleto = data.text;
  const linhas = textoCompleto.split('\n');

  // Aproximadamente 50 linhas por página
  const linhasParaTeste = linhas.slice(0, paginas * 50).join('\n');

  console.log(`✅ Extraído ${linhas.length} linhas totais`);
  console.log(`📝 Usando primeiras ${paginas} páginas (~${linhasParaTeste.split('\n').length} linhas) para teste\n`);

  return linhasParaTeste.substring(0, 2000); // Limitar para não gastar muitos tokens
}

const PROMPT_FORMATACAO = `Você é um assistente especializado em reformatar textos de PDFs para leitura em dispositivos móveis.

TAREFA: Reformatar o texto abaixo para leitura em celular, seguindo estas regras:

1. REMOVER quebras de linha desnecessárias (causadas por PDFs em colunas)
2. MANTER a estrutura lógica (títulos, subtítulos, parágrafos, listas)
3. CONVERTER para markdown limpo e bem formatado
4. PRESERVAR todo o conteúdo e significado original
5. Usar formatação adequada: # para títulos, ## para subtítulos, - para listas
6. Parágrafos devem ser contínuos (sem quebras no meio)

IMPORTANTE:
- NÃO adicione conteúdo extra
- NÃO resuma ou omita informações
- APENAS reformate o layout para mobile

Texto original:
---
{{TEXTO_PDF}}
---

Retorne APENAS o texto reformatado em markdown, sem explicações adicionais.`;

async function testarFormatacao() {
  console.log('🧪 Iniciando teste de reformatação com OpenAI...\n');

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ ERRO: OPENAI_API_KEY não encontrada no .env.local');
    process.exit(1);
  }

  console.log('✅ API Key encontrada\n');

  // Extrair texto do PDF real
  const textoPDF = await extrairTextoPDF(PDF_PATH, 2);

  console.log('📝 Texto original extraído do PDF (primeiros 500 caracteres):');
  console.log('─'.repeat(60));
  console.log(textoPDF.substring(0, 500) + '...');
  console.log('─'.repeat(60));

  try {
    const openai = new OpenAI({ apiKey });

    console.log('\n🤖 Enviando para OpenAI (gpt-4o-mini)...');
    const startTime = Date.now();

    const promptComTexto = PROMPT_FORMATACAO.replace('{{TEXTO_PDF}}', textoPDF);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente especializado em reformatar textos de PDFs para leitura mobile.'
        },
        {
          role: 'user',
          content: promptComTexto
        }
      ],
      temperature: 0.3, // Baixa temperatura para ser mais determinístico
      max_tokens: 3000,
    });

    const endTime = Date.now();
    const textoFormatado = response.choices[0].message.content;

    console.log('\n✅ Resposta recebida!');
    console.log(`⏱️  Tempo: ${endTime - startTime}ms`);
    console.log(`📊 Tokens usados: ${response.usage.total_tokens}`);
    console.log(`   - Prompt: ${response.usage.prompt_tokens}`);
    console.log(`   - Completion: ${response.usage.completion_tokens}`);

    console.log('\n📱 Texto reformatado para mobile:');
    console.log('─'.repeat(60));
    console.log(textoFormatado);
    console.log('─'.repeat(60));

    console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('\n💡 Análise:');
    console.log('   - Quebras de linha corrigidas? Verificar acima');
    console.log('   - Estrutura preservada? Verificar títulos e listas');
    console.log('   - Markdown válido? Verificar formatação');
    console.log('   - Custo por operação: ~', (response.usage.total_tokens / 1000000 * 0.15).toFixed(6), 'USD');

  } catch (error) {
    console.error('\n❌ ERRO ao chamar OpenAI:');
    console.error(error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    }
    process.exit(1);
  }
}

testarFormatacao();
