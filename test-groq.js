const fs = require('fs').promises;
const Groq = require('groq-sdk').default;

async function extractPageText(pdfPath, pageNumber) {
  const pdfParse = (await import('pdf-parse')).default;
  const buffer = await fs.readFile(pdfPath);
  
  let currentPageNum = 0;
  let pageText = '';
  
  await pdfParse(buffer, {
    pagerender: function(pageData) {
      currentPageNum++;
      if (currentPageNum !== pageNumber) return Promise.resolve('');
      
      return pageData.getTextContent().then(function(textContent) {
        const items = textContent.items;
        let text = '';
        let lastY = -1;
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item.str) continue;
          
          if (item.transform && item.transform[5]) {
            const currentY = item.transform[5];
            if (lastY !== -1 && Math.abs(currentY - lastY) > 2) {
              text += '\n';
            }
            lastY = currentY;
          }
          text += item.str + ' ';
        }
        pageText = text;
        return text;
      });
    }
  });
  
  return pageText.trim();
}

async function formatWithGroq(text, apiKey) {
  const groq = new Groq({ apiKey });
  
  const prompt = `Você é um assistente especializado em reformatar textos de PDFs para leitura em dispositivos móveis.

TAREFA: Reformatar o texto abaixo para leitura em celular, seguindo estas regras:

1. PRESERVAR parágrafos completos - não quebre parágrafos no meio
2. MANTER a estrutura lógica (títulos, subtítulos, parágrafos, listas)
3. CONVERTER para markdown limpo e bem formatado:
   - # para títulos principais
   - ## para subtítulos de seção
   - ### para subtítulos menores
   - **negrito** para termos importantes
   - - para listas não ordenadas
   - 1. para listas ordenadas
4. PRESERVAR todo o conteúdo e significado original
5. Parágrafos devem ser contínuos (sem quebras no meio)
6. Adicionar espaçamento adequado entre seções

IMPORTANTE:
- NÃO adicione conteúdo extra
- NÃO resuma ou omita informações
- APENAS reformate o layout para mobile
- Use markdown semântico e estruturado

Texto original:
---
${text}
---

Retorne APENAS o texto reformatado em markdown, sem explicações adicionais.`;

  const startTime = Date.now();
  
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile', // Modelo grátis e potente (updated)
    messages: [
      { role: 'system', content: 'Você é um assistante especializado em reformatar textos de PDFs para leitura em dispositivos móveis.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 8000
  });
  
  const endTime = Date.now();
  
  return {
    formatted: response.choices[0].message.content,
    tokens: response.usage.total_tokens,
    time: ((endTime - startTime) / 1000).toFixed(2)
  };
}

async function main() {
  const apiKey = process.argv[2] || process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.log('❌ Erro: Forneça a API key do Groq como argumento ou variável de ambiente');
    console.log('Uso: node test-groq.js gsk_sua_chave_aqui');
    process.exit(1);
  }
  
  const pdfPath = '/home/borgesbsb/projetos/concursos/Área Fiscal/Direito Administrativo/AULA00-Administrao-pblica-princpios-bsicos/pdf/curso-244688-aula-00-a0d3-completo.pdf';
  const pageNumber = 5;
  
  console.log('🚀 TESTE GROQ - LLAMA 3.1 70B (GRÁTIS)');
  console.log('=' . repeat(50));
  console.log(`📄 Extraindo página ${pageNumber}...`);
  
  const rawText = await extractPageText(pdfPath, pageNumber);
  console.log(`✅ Texto extraído: ${rawText.length} caracteres`);
  
  console.log('\n🤖 Formatando com Groq (Llama 3.1 70B)...');
  const { formatted, tokens, time } = await formatWithGroq(rawText, apiKey);
  
  console.log('\n📊 RESULTADOS:');
  console.log(`   ⚡ Tempo: ${time}s`);
  console.log(`   🎯 Tokens: ${tokens}`);
  console.log(`   💰 Custo: $0.00 (GRÁTIS!)`);
  
  console.log('\n' + '='.repeat(50));
  console.log('📱 MARKDOWN FORMATADO (GROQ):');
  console.log('='.repeat(50));
  console.log(formatted);
  console.log('='.repeat(50));
  
  await fs.writeFile('/tmp/groq-formatted.md', formatted);
  console.log('\n💾 Salvo em: /tmp/groq-formatted.md');
  
  // Comparação com OpenAI
  console.log('\n📈 COMPARAÇÃO:');
  console.log('┌─────────────────┬──────────────┬──────────────┐');
  console.log('│                 │ OpenAI       │ Groq         │');
  console.log('├─────────────────┼──────────────┼──────────────┤');
  console.log(`│ Tempo           │ ~5s          │ ${time}s         │`);
  console.log('│ Tokens          │ 1787         │ ' + tokens.toString().padEnd(12) + ' │');
  console.log('│ Custo           │ $0.0009      │ $0.00 GRÁTIS │');
  console.log('└─────────────────┴──────────────┴──────────────┘');
}

main().catch(console.error);
