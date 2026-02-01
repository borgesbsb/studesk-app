/**
 * Calculadora de custo OpenAI para processamento de gabaritos
 */

// Preços do gpt-4o-mini (Janeiro 2025)
const PRECO_INPUT = 0.150 / 1000000;   // $0.150 por 1M tokens de input
const PRECO_OUTPUT = 0.600 / 1000000;  // $0.600 por 1M tokens de output

// Dados do teste realizado
const QUESTOES_TESTE = 10;
const TEMPO_TESTE = 8.68; // segundos

// Estimativas baseadas no teste
const TAMANHO_OFICIAL_KB = 92.43;
const TAMANHO_USUARIO_KB = 275.27;

// Estimativa de tokens visuais (baseado no tamanho da imagem)
const TOKENS_OFICIAL = Math.ceil(TAMANHO_OFICIAL_KB / 100 * 500);
const TOKENS_USUARIO = Math.ceil(TAMANHO_USUARIO_KB / 100 * 500);

// Tokens do prompt (texto)
const TOKENS_PROMPT_SISTEMA = 50;
const TOKENS_PROMPT_USER = 200;
const TOKENS_POR_QUESTAO_INPUT = 10;

// Tokens de output (resposta JSON)
const TOKENS_POR_QUESTAO_OUTPUT = 50;

// Total de tokens para o teste
const TOKENS_INPUT_TESTE = TOKENS_OFICIAL + TOKENS_USUARIO + TOKENS_PROMPT_SISTEMA +
                           TOKENS_PROMPT_USER + (QUESTOES_TESTE * TOKENS_POR_QUESTAO_INPUT);
const TOKENS_OUTPUT_TESTE = QUESTOES_TESTE * TOKENS_POR_QUESTAO_OUTPUT;

console.log('📊 ANÁLISE DE CUSTO - OPENAI GPT-4O-MINI\\n');
console.log('═'.repeat(60));

console.log('\\n💰 PREÇOS (Janeiro 2025):');
console.log('   Input:  $' + (PRECO_INPUT * 1000000).toFixed(3) + ' por 1M tokens');
console.log('   Output: $' + (PRECO_OUTPUT * 1000000).toFixed(3) + ' por 1M tokens');

console.log('\\n📸 TAMANHOS DAS IMAGENS:');
console.log('   Gabarito Oficial: ' + TAMANHO_OFICIAL_KB.toFixed(2) + ' KB');
console.log('   Gabarito Usuário: ' + TAMANHO_USUARIO_KB.toFixed(2) + ' KB');

console.log('\\n🔢 ESTIMATIVA DE TOKENS (teste com 10 questões):');
console.log('   Tokens visuais oficial: ~' + TOKENS_OFICIAL.toLocaleString() + ' tokens');
console.log('   Tokens visuais usuário: ~' + TOKENS_USUARIO.toLocaleString() + ' tokens');
console.log('   Tokens de prompt: ~' + (TOKENS_PROMPT_SISTEMA + TOKENS_PROMPT_USER) + ' tokens');
console.log('   ─────────────────────────────────────────');
console.log('   TOTAL INPUT:  ~' + TOKENS_INPUT_TESTE.toLocaleString() + ' tokens');
console.log('   TOTAL OUTPUT: ~' + TOKENS_OUTPUT_TESTE.toLocaleString() + ' tokens');

const CUSTO_TESTE = (TOKENS_INPUT_TESTE * PRECO_INPUT) + (TOKENS_OUTPUT_TESTE * PRECO_OUTPUT);

console.log('\\n💵 CUSTO DO TESTE (10 questões):');
console.log('   Input:  ' + TOKENS_INPUT_TESTE.toLocaleString() + ' × $' + PRECO_INPUT.toFixed(8) + ' = $' + (TOKENS_INPUT_TESTE * PRECO_INPUT).toFixed(6));
console.log('   Output: ' + TOKENS_OUTPUT_TESTE.toLocaleString() + ' × $' + PRECO_OUTPUT.toFixed(8) + ' = $' + (TOKENS_OUTPUT_TESTE * PRECO_OUTPUT).toFixed(6));
console.log('   ─────────────────────────────────────────');
console.log('   TOTAL: $' + CUSTO_TESTE.toFixed(6) + ' (R$ ' + (CUSTO_TESTE * 6.0).toFixed(4) + ' @ R$6.00/USD)');

console.log('\\n\\n📈 PROJEÇÃO PARA DIFERENTES QUANTIDADES:\\n');

const cenarios = [
  { questoes: 30, descricao: '30 questões (1 disciplina pequena)' },
  { questoes: 60, descricao: '60 questões (1 disciplina completa)' },
  { questoes: 120, descricao: '120 questões (2 disciplinas)' },
  { questoes: 180, descricao: '180 questões (3 disciplinas)' },
  { questoes: 300, descricao: '300 questões (prova completa grande)' }
];

cenarios.forEach(function(cenario) {
  const questoes = cenario.questoes;
  const descricao = cenario.descricao;

  // Como as imagens são as mesmas, só muda o output
  const tokens_input = TOKENS_INPUT_TESTE + ((questoes - QUESTOES_TESTE) * TOKENS_POR_QUESTAO_INPUT);
  const tokens_output = questoes * TOKENS_POR_QUESTAO_OUTPUT;
  const custo = (tokens_input * PRECO_INPUT) + (tokens_output * PRECO_OUTPUT);
  const custo_brl = custo * 6.0;
  const tempo_estimado = (TEMPO_TESTE / QUESTOES_TESTE) * questoes;

  console.log(descricao);
  console.log('   Custo: $' + custo.toFixed(6) + ' (R$ ' + custo_brl.toFixed(4) + ')');
  console.log('   Tempo estimado: ~' + tempo_estimado.toFixed(1) + 's\\n');
});

console.log('\\n💡 OBSERVAÇÕES IMPORTANTES:\\n');
console.log('1. O custo é MUITO BAIXO porque o gpt-4o-mini é extremamente barato');
console.log('2. As imagens são enviadas UMA VEZ, então processar mais questões');
console.log('   na mesma imagem adiciona custo mínimo');
console.log('3. Melhor estratégia: processar TODAS as questões de uma disciplina');
console.log('   de uma vez (ex: 1-60) em vez de fazer múltiplas chamadas');
console.log('4. Custo total de um simulado completo (300 questões): < R$ 0.05');
console.log('\\n═'.repeat(60));
