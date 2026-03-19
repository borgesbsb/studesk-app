import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Criando Build: ISS Vitória da Conquista...')

  // ─── Build Plano ────────────────────────────────────────────────────────────
  const build = await prisma.buildPlano.create({
    data: {
      nome: 'ISS Vitória da Conquista – Auditor Fiscal',
      descricao: 'Baseado no CSC Mentoria CA – 16 ciclos (17–32 são repetição)',
      numeroCiclos: 16,
      status: 'gerado',
    },
  })
  console.log(`✅ BuildPlano criado: ${build.id}`)

  // ─── Disciplinas ─────────────────────────────────────────────────────────────
  // P1 = ciclos ímpares | P2 = ciclos pares

  const disciplinas = [
    // P1
    {
      nome: 'Língua Portuguesa',
      tipo: 'P1' as const,
      cor: '#3b82f6',
      assuntos: [
        // ciclo 1
        { ciclo: 1, nome: 'Análise e interpretação de texto (compreensão geral, ponto de vista, argumentação, coesão, inferências, estrutura)' },
        { ciclo: 1, nome: 'Tipologia e gêneros textuais' },
        { ciclo: 1, nome: 'Figuras de linguagem' },
        // ciclo 3
        { ciclo: 3, nome: 'Emprego dos pronomes demonstrativos' },
        { ciclo: 3, nome: 'Relações semânticas entre orações/parágrafos (oposição, conclusão, concessão, causalidade, adição, alternância)' },
        { ciclo: 3, nome: 'Relações de sinonímia e de antonímia' },
        // ciclo 5
        { ciclo: 5, nome: 'Sintaxe da oração (termos fundamentais e acessórios, tipos de predicado) e do período (coordenação e subordinação)' },
        { ciclo: 5, nome: 'Funções do que e do se' },
        // ciclo 7
        { ciclo: 7, nome: 'Emprego do acento grave' },
        { ciclo: 7, nome: 'Emprego dos sinais de pontuação e suas funções no texto' },
        // ciclo 9
        { ciclo: 9, nome: 'Ortografia' },
        { ciclo: 9, nome: 'Concordâncias verbal e nominal' },
        // ciclo 11
        { ciclo: 11, nome: 'Regências verbal e nominal' },
        { ciclo: 11, nome: 'Emprego de tempos e modos verbais' },
        // ciclo 13
        { ciclo: 13, nome: 'Formação de tempos compostos dos verbos' },
        { ciclo: 13, nome: 'Locuções verbais (perífrases verbais)' },
        // ciclo 15
        { ciclo: 15, nome: 'Sintaxe de colocação pronominal' },
        { ciclo: 15, nome: 'Paralelismo sintático e paralelismo semântico' },
      ],
    },
    {
      nome: 'Noções de Administração Pública',
      tipo: 'P1' as const,
      cor: '#8b5cf6',
      assuntos: [
        { ciclo: 1,  nome: 'Constituição Federal de 1988' },
        { ciclo: 3,  nome: 'Lei 8.112/90 – Estatuto dos Servidores Públicos Federais' },
        { ciclo: 5,  nome: 'Lei 14.133/2021 – Licitações e Contratos' },
        { ciclo: 7,  nome: 'Lei de Responsabilidade Fiscal – Lei Complementar 101/2000' },
        { ciclo: 9,  nome: 'Ética na Administração Pública' },
        { ciclo: 11, nome: 'Lei Complementar 1.786/2011 – Regime Jurídico Único dos Servidores de Vitória da Conquista' },
        // repetições
        { ciclo: 13, nome: 'Revisão: Constituição Federal de 1988' },
        { ciclo: 13, nome: 'Revisão: Lei 8.112/90' },
        { ciclo: 13, nome: 'Revisão: Lei 14.133/2021' },
        { ciclo: 15, nome: 'Revisão: Lei de Responsabilidade Fiscal – LC 101/2000' },
        { ciclo: 15, nome: 'Revisão: Ética na Administração Pública' },
        { ciclo: 15, nome: 'Revisão: LC 1.786/2011 – Regime Jurídico Único' },
      ],
    },
    {
      nome: 'Noções de Informática',
      tipo: 'P1' as const,
      cor: '#06b6d4',
      assuntos: [
        { ciclo: 1,  nome: 'Aplicativos para edição de textos, planilhas e apresentações: Microsoft Office e BR Office' },
        { ciclo: 3,  nome: 'Sistemas operacionais: Windows e LINUX' },
        { ciclo: 5,  nome: 'Tecnologias, ferramentas e procedimentos associados à Internet e intranet' },
        { ciclo: 7,  nome: 'Organização e gerenciamento de informações, arquivos, pastas e programas' },
        { ciclo: 9,  nome: 'Certificação e assinatura digital' },
        { ciclo: 11, nome: 'Segurança da Informação' },
        // repetições
        { ciclo: 13, nome: 'Revisão: Microsoft Office / BR Office' },
        { ciclo: 13, nome: 'Revisão: Sistemas operacionais Windows e LINUX' },
        { ciclo: 13, nome: 'Revisão: Internet e intranet' },
        { ciclo: 15, nome: 'Revisão: Gerenciamento de arquivos, pastas e programas' },
        { ciclo: 15, nome: 'Revisão: Certificação e assinatura digital' },
        { ciclo: 15, nome: 'Revisão: Segurança da Informação' },
      ],
    },
    {
      nome: 'Conhecimentos Gerais / Atualidades',
      tipo: 'P1' as const,
      cor: '#f59e0b',
      assuntos: [
        { ciclo: 1,  nome: 'Vida econômica, social, política, tecnológica, relações exteriores, segurança e ecologia em nível nacional e internacional' },
        { ciclo: 3,  nome: 'Descobertas e inovações científicas na atualidade e seus impactos na sociedade contemporânea' },
        { ciclo: 5,  nome: 'Desenvolvimento urbano brasileiro' },
        { ciclo: 7,  nome: 'Cultura e sociedade brasileira: artes, arquitetura, cinema, jornais, revistas, televisão, música e teatro' },
        { ciclo: 9,  nome: 'História, Cultura, Turismo e Geografia da Bahia e de Vitória da Conquista' },
        // repetições
        { ciclo: 11, nome: 'Revisão: Vida econômica, social, política e tecnológica' },
        { ciclo: 11, nome: 'Revisão: Descobertas e inovações científicas' },
        { ciclo: 11, nome: 'Revisão: Desenvolvimento urbano brasileiro' },
        { ciclo: 13, nome: 'Revisão: Cultura e sociedade brasileira' },
        { ciclo: 15, nome: 'Revisão: História, Cultura e Geografia da Bahia e de Vitória da Conquista' },
      ],
    },
    // P2
    {
      nome: 'Contabilidade Geral',
      tipo: 'P2' as const,
      cor: '#10b981',
      assuntos: [
        { ciclo: 2,  nome: 'A Escrituração Contábil' },
        { ciclo: 4,  nome: 'Os registros das operações típicas de uma empresa' },
        { ciclo: 6,  nome: 'A avaliação dos ativos e passivos' },
        { ciclo: 8,  nome: 'A elaboração das demonstrações contábeis' },
        // repetições
        { ciclo: 10, nome: 'Revisão: A Escrituração Contábil' },
        { ciclo: 12, nome: 'Revisão: Os registros das operações típicas de uma empresa' },
        { ciclo: 14, nome: 'Revisão: A avaliação dos ativos e passivos' },
        { ciclo: 16, nome: 'Revisão: A elaboração das demonstrações contábeis' },
      ],
    },
    {
      nome: 'Contabilidade Pública',
      tipo: 'P2' as const,
      cor: '#059669',
      assuntos: [
        { ciclo: 2,  nome: 'Contabilidade Pública – conceitos e fundamentos' },
        { ciclo: 4,  nome: 'Plano de Contas' },
        { ciclo: 6,  nome: 'Orçamento Público' },
        { ciclo: 8,  nome: 'Receita e Despesa Pública' },
        { ciclo: 10, nome: 'Demonstrações Contábeis' },
        { ciclo: 12, nome: 'Balanço Geral' },
        { ciclo: 14, nome: 'Sistemas de Controle Interno e Externo' },
        { ciclo: 16, nome: 'Gestão Fiscal' },
      ],
    },
    {
      nome: 'Auditoria Contábil',
      tipo: 'P2' as const,
      cor: '#7c3aed',
      assuntos: [
        { ciclo: 2,  nome: 'Normas brasileiras para o exercício da auditoria interna: independência, competência, âmbito, execução e administração' },
        { ciclo: 2,  nome: 'Finalidades e objetivos da auditoria. Abrangência de atuação' },
        { ciclo: 2,  nome: 'Normas e tipos. Normas relativas à execução dos trabalhos' },
        { ciclo: 4,  nome: 'Normas relativas à opinião do auditor' },
        { ciclo: 4,  nome: 'Relatórios, pareceres e certificados de auditoria' },
        { ciclo: 4,  nome: 'Operacionalidade' },
        { ciclo: 4,  nome: 'Objetivos, técnicas e procedimentos de auditoria' },
        { ciclo: 6,  nome: 'Planejamento dos trabalhos de auditoria' },
        { ciclo: 6,  nome: 'Programas de auditoria' },
        { ciclo: 6,  nome: 'Papéis de trabalho' },
        { ciclo: 6,  nome: 'Testes de auditoria' },
        { ciclo: 8,  nome: 'Amostragem estatística em auditoria' },
        { ciclo: 8,  nome: 'Eventos ou transações subsequentes' },
        { ciclo: 8,  nome: 'Revisão analítica' },
        { ciclo: 10, nome: 'Entrevista em auditoria' },
        { ciclo: 10, nome: 'Conferência de cálculo' },
        { ciclo: 10, nome: 'Confirmação' },
        { ciclo: 12, nome: 'Interpretação das informações e Observações' },
        { ciclo: 12, nome: 'Procedimentos de auditoria em áreas específicas das demonstrações contábeis' },
        { ciclo: 12, nome: 'Normas relativas ao Parecer' },
        { ciclo: 14, nome: 'Ética profissional e responsabilidade legal' },
        { ciclo: 14, nome: 'Avaliação dos controles internos' },
        { ciclo: 14, nome: 'Materialidade, relevância e risco em auditoria' },
        { ciclo: 16, nome: 'Evidência em auditoria' },
        { ciclo: 16, nome: 'Função da Auditoria Interna' },
        { ciclo: 16, nome: 'Sistemas de controle interno e externo e suas normas constitucionais e legais' },
      ],
    },
    {
      nome: 'Noções de Direito Público e Privado',
      tipo: 'P2' as const,
      cor: '#dc2626',
      assuntos: [
        { ciclo: 2,  nome: 'Fontes e Hierarquia da Norma' },
        { ciclo: 2,  nome: 'Estado e Constituição' },
        { ciclo: 4,  nome: 'Poderes do Estado' },
        { ciclo: 4,  nome: 'A Pessoa e seus Atributos' },
        { ciclo: 6,  nome: 'Tipos de Sociedades' },
        { ciclo: 6,  nome: 'Contratos' },
        { ciclo: 8,  nome: 'Crimes contra a ordem econômica' },
        { ciclo: 8,  nome: 'Tributos e suas espécies' },
        { ciclo: 10, nome: 'Créditos Tributários' },
        { ciclo: 10, nome: 'Contratos de trabalho em relação aos empregos' },
        { ciclo: 12, nome: 'Direitos Trabalhistas' },
        { ciclo: 12, nome: 'Conhecimentos de direito financeiro: Lei 4.320/64' },
        { ciclo: 14, nome: 'Processos de licitação: Lei nº 14.133/2021' },
        { ciclo: 14, nome: 'Lei Complementar 101/00 – Finanças Públicas' },
        { ciclo: 16, nome: 'Constituição Federal de 1988' },
        { ciclo: 16, nome: 'Imposto Territorial Rural – ITR' },
      ],
    },
    {
      nome: 'Direito Tributário',
      tipo: 'P2' as const,
      cor: '#ea580c',
      assuntos: [
        { ciclo: 2,  nome: 'Sistema Tributário Nacional – princípios gerais e constitucionais, limitações ao poder de tributar, imunidades' },
        { ciclo: 4,  nome: 'Competência tributária da União, Estados, Municípios e Distrito Federal. Competência residual. Conflito de competência' },
        { ciclo: 4,  nome: 'Tributo: conceito e espécies (impostos, taxas, contribuição de melhoria, empréstimo compulsório, contribuições). Classificação e funções' },
        { ciclo: 6,  nome: 'Repartição de receitas tributárias' },
        { ciclo: 6,  nome: 'Direito Tributário: conceito, natureza, fontes. Legislação tributária: vigência, aplicação, interpretação e integração. Normas complementares' },
        { ciclo: 6,  nome: 'Obrigação tributária: conceito, natureza, espécies (principal e acessória). Hipótese de incidência. Fato gerador' },
        { ciclo: 8,  nome: 'Sujeitos da obrigação tributária. Substituição tributária. Solidariedade. Capacidade tributária. Domicílio tributário. Responsabilidade tributária' },
        { ciclo: 10, nome: 'Crédito tributário: conceito, natureza. Lançamento: modalidades (declaração, homologação, ofício). Suspensão. Extinção. Exclusão do crédito tributário. Garantias e privilégios' },
        { ciclo: 12, nome: 'Sigilo fiscal' },
        { ciclo: 12, nome: 'Administração tributária. Fiscalização. Certidões negativas. Dívida Ativa: liquidez, certeza, exigibilidade' },
        { ciclo: 14, nome: 'Regime Jurídico dos Impostos Municipais: IPTU, ISS e ITBI' },
        { ciclo: 16, nome: 'Execução fiscal – Lei 6.830/80. Medida Cautelar Fiscal – Lei 8.397/92' },
        { ciclo: 16, nome: 'Mandado de Segurança, Ação Anulatória, Declaratória, Cautelares e demais ações em matéria tributária. Lei nº 1.259/2004 – Código Tributário Municipal' },
      ],
    },
  ]

  // ─── Inserir disciplinas e assuntos ─────────────────────────────────────────
  for (const [i, disc] of disciplinas.entries()) {
    const { assuntos, ...discData } = disc

    const created = await prisma.buildPlanoDisciplina.create({
      data: {
        buildPlanoId: build.id,
        nome: discData.nome,
        tipo: discData.tipo,
        cor: discData.cor,
        ordem: i,
        assuntos: {
          createMany: {
            data: assuntos.map((a, idx) => ({
              nome: a.nome,
              ciclo: a.ciclo,
              ordem: idx,
            })),
          },
        },
      },
    })

    console.log(`  ✅ ${discData.tipo} – ${discData.nome} (${assuntos.length} assuntos)`)
  }

  console.log('\n✅ Build populado com sucesso!')
  console.log(`   → /admin/build-plano/${build.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
