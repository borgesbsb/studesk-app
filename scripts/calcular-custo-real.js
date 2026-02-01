/**
 * Calculadora de custo REAL baseado no seu cenário
 */

// Preços do gpt-4o-mini (Janeiro 2025)
const PRECO_INPUT = 0.150 / 1000000;   // $0.150 por 1M tokens de input
const PRECO_OUTPUT = 0.600 / 1000000;  // $0.600 por 1M tokens de output
const TAXA_CAMBIO = 6.0; // R$/USD

// SEU CENÁRIO REAL
const QUESTOES_POR_SIMULADO = 80;
const DISCIPLINAS = 22;
const SEMANAS_POR_MES = 4;
const MESES = 6;

// Estimativas de tokens (baseado no teste)
const TOKENS_IMAGENS = 1840; // oficial + usuário (constante)
const TOKENS_PROMPT_BASE = 250; // prompt sistema + user
const TOKENS_POR_QUESTAO_INPUT = 10;
const TOKENS_POR_QUESTAO_OUTPUT = 50;

function calcularCusto(questoes) {
  const tokens_input = TOKENS_IMAGENS + TOKENS_PROMPT_BASE + (questoes * TOKENS_POR_QUESTAO_INPUT);
  const tokens_output = questoes * TOKENS_POR_QUESTAO_OUTPUT;
  const custo_usd = (tokens_input * PRECO_INPUT) + (tokens_output * PRECO_OUTPUT);
  const custo_brl = custo_usd * TAXA_CAMBIO;
  return { tokens_input, tokens_output, custo_usd, custo_brl };
}

console.log('📊 ANÁLISE DE CUSTO - SEU CENÁRIO REAL\n');
console.log('═'.repeat(70));

console.log('\n📋 DADOS DO SEU CENÁRIO:');
console.log('   • Questões por simulado: ' + QUESTOES_POR_SIMULADO);
console.log('   • Disciplinas: ' + DISCIPLINAS);
console.log('   • Período: ' + MESES + ' meses (' + (SEMANAS_POR_MES * MESES) + ' semanas)');
console.log('   • Frequência: 1 simulado por semana por disciplina');

// Cálculo por simulado
const custoSimulado = calcularCusto(QUESTOES_POR_SIMULADO);

console.log('\n💰 CUSTO POR SIMULADO (80 questões):');
console.log('   Input tokens:  ~' + custoSimulado.tokens_input.toLocaleString());
console.log('   Output tokens: ~' + custoSimulado.tokens_output.toLocaleString());
console.log('   ─────────────────────────────────────────');
console.log('   Custo: $' + custoSimulado.custo_usd.toFixed(6) + ' = R$ ' + custoSimulado.custo_brl.toFixed(4));

// Cálculo semanal
const simuladosPorSemana = DISCIPLINAS;
const custoSemanal = custoSimulado.custo_brl * simuladosPorSemana;

console.log('\n📅 CUSTO SEMANAL:');
console.log('   Simulados: ' + simuladosPorSemana + ' (1 por disciplina)');
console.log('   Custo: R$ ' + custoSemanal.toFixed(2));

// Cálculo mensal
const semanasPorMes = SEMANAS_POR_MES;
const custoMensal = custoSemanal * semanasPorMes;

console.log('\n📅 CUSTO MENSAL:');
console.log('   Semanas: ' + semanasPorMes);
console.log('   Simulados: ' + (simuladosPorSemana * semanasPorMes));
console.log('   Custo: R$ ' + custoMensal.toFixed(2));

// Cálculo total do período
const custoTotal = custoMensal * MESES;
const totalSimulados = simuladosPorSemana * semanasPorMes * MESES;
const totalQuestoes = totalSimulados * QUESTOES_POR_SIMULADO;

console.log('\n📅 CUSTO TOTAL (' + MESES + ' MESES):');
console.log('   Total de simulados: ' + totalSimulados.toLocaleString());
console.log('   Total de questões: ' + totalQuestoes.toLocaleString());
console.log('   ─────────────────────────────────────────');
console.log('   💰 CUSTO TOTAL: R$ ' + custoTotal.toFixed(2));
console.log('   💰 CUSTO TOTAL USD: $' + (custoTotal / TAXA_CAMBIO).toFixed(2));

console.log('\n\n📊 RESUMO VISUAL:\n');
console.log('┌─────────────────────────────────────────────────────────┐');
console.log('│                 RESUMO DE CUSTOS                        │');
console.log('├─────────────────────────────────────────────────────────┤');
console.log('│ Por simulado (80 questões)    │ R$ ' + custoSimulado.custo_brl.toFixed(4).padStart(18) + ' │');
console.log('│ Por semana (22 simulados)     │ R$ ' + custoSemanal.toFixed(2).padStart(18) + ' │');
console.log('│ Por mês (88 simulados)        │ R$ ' + custoMensal.toFixed(2).padStart(18) + ' │');
console.log('│ TOTAL 6 MESES (528 simulados) │ R$ ' + custoTotal.toFixed(2).padStart(18) + ' │');
console.log('└─────────────────────────────────────────────────────────┘');

console.log('\n💡 OBSERVAÇÕES:\n');
console.log('1. Custo TOTAL de 6 meses: R$ ' + custoTotal.toFixed(2));
console.log('2. Isso equivale a ~R$ ' + (custoTotal / (MESES * 30)).toFixed(2) + ' por dia');
console.log('3. Total de ' + totalQuestoes.toLocaleString() + ' questões processadas');
console.log('4. Custo médio por questão: R$ ' + (custoTotal / totalQuestoes).toFixed(6));
console.log('5. O custo é EXTREMAMENTE baixo comparado ao valor do produto!');

console.log('\n🎯 COMPARAÇÃO:\n');
console.log('   • Café no bar: ~R$ 5.00');
console.log('   • Custo mensal do serviço: R$ ' + custoMensal.toFixed(2));
console.log('   • Você gasta menos que 1 café por mês! ☕');

console.log('\n💰 ESCALA DE USUÁRIOS:\n');

const usuarios = [10, 50, 100, 500, 1000];
usuarios.forEach(function(numUsuarios) {
  const custoMensalTotal = custoMensal * numUsuarios;
  console.log('   ' + numUsuarios.toString().padStart(4) + ' usuários: R$ ' +
              custoMensalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(12) +
              ' / mês');
});

console.log('\n═'.repeat(70));
