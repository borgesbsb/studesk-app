console.log('=== DEBUG PIPELINE QUESTÕES ===');

// Simular o texto que deveria vir do PDF
const textoSimulado = `
GESTÃO DE PROJETOS

Introdução à Gestão de Projetos

Um projeto é um esforço temporário empreendido para criar um produto, serviço ou resultado único. A gestão de projetos é a aplicação de conhecimentos, habilidades, ferramentas e técnicas às atividades do projeto para atender aos requisitos do projeto.

Características dos Projetos:
- Temporários: têm início e fim definidos
- Únicos: criam produtos, serviços ou resultados únicos
- Elaboração progressiva: desenvolvidos em etapas

Ciclo de Vida do Projeto:
1. Iniciação
2. Planejamento  
3. Execução
4. Monitoramento e Controle
5. Encerramento

O gerente de projeto é responsável por liderar a equipe que realiza o trabalho do projeto. Entre suas principais responsabilidades estão: definir objetivos, criar cronogramas, gerenciar recursos, comunicar com stakeholders e garantir a qualidade das entregas.
`.trim();

console.log('Texto simulado (', textoSimulado.length, 'chars):');
console.log(textoSimulado.substring(0, 300));

// Simular chamada para questões com IA
const questoesEsperadas = {
  questoes: [
    {
      pergunta: "De acordo com o texto, qual é a principal característica que diferencia um projeto de uma operação contínua?",
      alternativaA: "O uso de recursos específicos",
      alternativaB: "A natureza temporária com início e fim definidos",
      alternativaC: "A complexidade das atividades envolvidas", 
      alternativaD: "O envolvimento de stakeholders externos",
      respostaCorreta: "B",
      explicacao: "O texto define explicitamente que projetos são temporários, tendo início e fim definidos, diferentemente das operações contínuas."
    }
  ]
};

console.log('\n=== QUESTÃO ESPERADA ===');
console.log('Pergunta:', questoesEsperadas.questoes[0].pergunta);
console.log('Resposta correta:', questoesEsperadas.questoes[0].respostaCorreta, '-', questoesEsperadas.questoes[0].alternativaB);

// Simular questão genérica (problema atual)
const questaoGenerica = {
  pergunta: "Qual é a principal ideia relacionada a 'gestão' no contexto apresentado?",
  alternativaA: "O texto destaca a importância de gestão no contexto apresentado.",
  alternativaB: "Gestão não tem relação com o assunto principal do texto.",
  alternativaC: "O texto critica o conceito de gestão de forma veemente.",
  alternativaD: "Gestão é mencionado apenas como exemplo secundário."
};

console.log('\n=== QUESTÃO GENÉRICA (PROBLEMA ATUAL) ===');
console.log('Pergunta:', questaoGenerica.pergunta);
console.log('Resposta A:', questaoGenerica.alternativaA);

console.log('\n=== DIAGNÓSTICO ===');
console.log('❌ Se as questões estão genéricas como a segunda, o problema pode ser:');
console.log('1. API Key da OpenAI não configurada (usando questões de teste)');
console.log('2. Texto não está sendo extraído do PDF');
console.log('3. Texto extraído está sendo perdido no pipeline');
console.log('4. Filtragem IA está removendo conteúdo importante');

console.log('\n=== PRÓXIMOS PASSOS ===');
console.log('1. Verificar se há API Key da OpenAI configurada');
console.log('2. Testar extração de texto diretamente');
console.log('3. Verificar logs do pipeline completo');
console.log('4. Desabilitar filtragem IA temporariamente'); 