/**
 * Calculadora de custo REAL baseado no teste com Few-Shot Learning
 */

// Preços do gpt-4o-mini (Janeiro 2025)
const PRECO_INPUT = 0.150 / 1000000;   // $0.150 por 1M tokens de input
const PRECO_OUTPUT = 0.600 / 1000000;  // $0.600 por 1M tokens de output
const TAXA_CAMBIO = 6.0; // R$/USD

// DADOS REAIS DO TESTE COM FEW-SHOT (80 questões)
const TOKENS_INPUT_REAL = 76991;   // Medido no teste
const TOKENS_OUTPUT_REAL = 2494;   // Medido no teste
const QUESTOES_TESTE = 80;

// Calcular custo por simulado
const custoInputSimulado = TOKENS_INPUT_REAL * PRECO_INPUT;
const custoOutputSimulado = TOKENS_OUTPUT_REAL * PRECO_OUTPUT;
const custoTotalSimulado = custoInputSimulado + custoOutputSimulado;
const custoSimuladoBRL = custoTotalSimulado * TAXA_CAMBIO;

console.log('📊 CÁLCULO DE CUSTO REAL - BASEADO NO TESTE\n');
console.log('═'.repeat(70));

console.log('\n📋 DADOS DO TESTE:');
console.log('   Questões processadas: ' + QUESTOES_TESTE);
console.log('   Input tokens (com Few-Shot): ' + TOKENS_INPUT_REAL.toLocaleString());
console.log('   Output tokens: ' + TOKENS_OUTPUT_REAL.toLocaleString());
console.log('   Total tokens: ' + (TOKENS_INPUT_REAL + TOKENS_OUTPUT_REAL).toLocaleString());

console.log('\n💰 CUSTO POR SIMULADO (80 questões):');
console.log('   Input:  ' + TOKENS_INPUT_REAL.toLocaleString() + ' × $' + PRECO_INPUT.toFixed(8) + ' = $' + custoInputSimulado.toFixed(6));
console.log('   Output: ' + TOKENS_OUTPUT_REAL.toLocaleString() + ' × $' + PRECO_OUTPUT.toFixed(8) + ' = $' + custoOutputSimulado.toFixed(6));
console.log('   ─────────────────────────────────────────');
console.log('   TOTAL: $' + custoTotalSimulado.toFixed(6) + ' = R$ ' + custoSimuladoBRL.toFixed(4));

// CENÁRIO: 1 usuário, 1 simulado por semana, 6 meses
const SEMANAS_POR_MES = 4;
const MESES = 6;
const SIMULADOS_POR_SEMANA = 1;

const totalSemanas = SEMANAS_POR_MES * MESES;
const totalSimulados = SIMULADOS_POR_SEMANA * totalSemanas;

const custoSemanal = custoSimuladoBRL * SIMULADOS_POR_SEMANA;
const custoMensal = custoSemanal * SEMANAS_POR_MES;
const custoTotal6Meses = custoMensal * MESES;

console.log('\n\n📅 CENÁRIO: 1 USUÁRIO - 1 SIMULADO POR SEMANA\n');

console.log('┌─────────────────────────────────────────────────────────┐');
console.log('│                 RESUMO DE CUSTOS                        │');
console.log('├─────────────────────────────────────────────────────────┤');
console.log('│ Por simulado (80 questões)    │ R$ ' + custoSimuladoBRL.toFixed(4).padStart(18) + ' │');
console.log('│ Por semana (1 simulado)       │ R$ ' + custoSemanal.toFixed(4).padStart(18) + ' │');
console.log('│ Por mês (4 simulados)         │ R$ ' + custoMensal.toFixed(2).padStart(18) + ' │');
console.log('│ TOTAL 6 MESES (24 simulados)  │ R$ ' + custoTotal6Meses.toFixed(2).padStart(18) + ' │');
console.log('└─────────────────────────────────────────────────────────┘');

console.log('\n📊 DETALHAMENTO:');
console.log('   Período: 6 meses');
console.log('   Semanas: ' + totalSemanas);
console.log('   Simulados: ' + totalSimulados + ' (1 por semana)');
console.log('   Questões processadas: ' + (totalSimulados * QUESTOES_TESTE).toLocaleString());
console.log('   Tokens totais: ~' + ((TOKENS_INPUT_REAL + TOKENS_OUTPUT_REAL) * totalSimulados).toLocaleString());

console.log('\n💡 COMPARAÇÃO:\n');
console.log('   • 1 Café expresso: ~R$ 5,00');
console.log('   • Custo mensal deste usuário: R$ ' + custoMensal.toFixed(2));
console.log('   • Custo total 6 meses: R$ ' + custoTotal6Meses.toFixed(2));
console.log('   • Custo por questão: R$ ' + (custoTotal6Meses / (totalSimulados * QUESTOES_TESTE)).toFixed(6));

console.log('\n💰 COMPARAÇÃO COM/SEM FEW-SHOT:\n');

// Estimativa sem Few-Shot (baseado nos dados anteriores)
const TOKENS_SEM_FEWSHOT_INPUT = 2890;  // Baseado na estimativa inicial
const TOKENS_SEM_FEWSHOT_OUTPUT = 4000; // Baseado na estimativa inicial
const custoSemFewShot = ((TOKENS_SEM_FEWSHOT_INPUT * PRECO_INPUT) + (TOKENS_SEM_FEWSHOT_OUTPUT * PRECO_OUTPUT)) * TAXA_CAMBIO;
const custoMensalSemFewShot = custoSemFewShot * SEMANAS_POR_MES;
const custoTotal6MesesSemFewShot = custoMensalSemFewShot * MESES;

console.log('┌────────────────────────────────────────────────────────────────┐');
console.log('│                   COM vs SEM FEW-SHOT                          │');
console.log('├────────────────────────────────────────────────────────────────┤');
console.log('│             │  SEM Few-Shot  │  COM Few-Shot  │  Diferença    │');
console.log('├────────────────────────────────────────────────────────────────┤');
console.log('│ Por simulado│ R$ ' + custoSemFewShot.toFixed(4).padStart(11) + ' │ R$ ' + custoSimuladoBRL.toFixed(4).padStart(11) + ' │ +' + ((custoSimuladoBRL / custoSemFewShot - 1) * 100).toFixed(0) + '%'.padStart(10) + ' │');
console.log('│ Por mês     │ R$ ' + custoMensalSemFewShot.toFixed(2).padStart(11) + ' │ R$ ' + custoMensal.toFixed(2).padStart(11) + ' │ +' + ((custoMensal / custoMensalSemFewShot - 1) * 100).toFixed(0) + '%'.padStart(10) + ' │');
console.log('│ 6 meses     │ R$ ' + custoTotal6MesesSemFewShot.toFixed(2).padStart(11) + ' │ R$ ' + custoTotal6Meses.toFixed(2).padStart(11) + ' │ +' + ((custoTotal6Meses / custoTotal6MesesSemFewShot - 1) * 100).toFixed(0) + '%'.padStart(10) + ' │');
console.log('└────────────────────────────────────────────────────────────────┘');

console.log('\n🎯 ESCALA DE USUÁRIOS (COM FEW-SHOT):\n');

const usuarios = [1, 10, 50, 100, 500, 1000];
usuarios.forEach(function(numUsuarios) {
  const custoMensalTotal = custoMensal * numUsuarios;
  const custoTotal6MesesUsuarios = custoTotal6Meses * numUsuarios;
  console.log('   ' + numUsuarios.toString().padStart(4) + ' usuário(s):');
  console.log('        Mensal: R$ ' + custoMensalTotal.toFixed(2).padStart(10) +
              ' │ 6 meses: R$ ' + custoTotal6MesesUsuarios.toFixed(2).padStart(10));
});

console.log('\n✅ CONCLUSÃO:\n');
console.log('   Com Few-Shot Learning, o custo é ~4x maior, mas ainda muito baixo.');
console.log('   Para 1 usuário com 1 simulado/semana por 6 meses:');
console.log('   • Total: R$ ' + custoTotal6Meses.toFixed(2) + ' (~R$ ' + (custoTotal6Meses / 180).toFixed(2) + '/dia)');
console.log('   • Menos que o preço de 1 picolé! 🍦');

console.log('\n═'.repeat(70));
