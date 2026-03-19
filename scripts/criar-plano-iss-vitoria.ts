import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Helpers ────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function nextMonday(): Date {
  const today = new Date()
  const day = today.getUTCDay() // 0=Sun,1=Mon...
  const daysUntilMonday = day === 1 ? 0 : (8 - day) % 7 || 7
  const d = new Date(today)
  d.setUTCDate(d.getUTCDate() + daysUntilMonday)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

// ─── Dados do plano ─────────────────────────────────────────────────────────

// Assuntos por disciplina por ciclo (extraídos do CSC)
const ASSUNTOS: Record<string, Record<number, string[]>> = {
  'Língua Portuguesa': {
    1:  ['Análise e interpretação de texto (compreensão geral, ponto de vista, argumentação, coesão, inferências, estrutura)', 'Tipologia e gêneros textuais', 'Figuras de linguagem'],
    3:  ['Emprego dos pronomes demonstrativos', 'Relações semânticas entre orações/parágrafos (oposição, conclusão, concessão, causalidade, adição, alternância)', 'Relações de sinonímia e de antonímia'],
    5:  ['Sintaxe da oração (termos fundamentais e acessórios, tipos de predicado) e do período (coordenação e subordinação)', 'Funções do que e do se'],
    7:  ['Emprego do acento grave', 'Emprego dos sinais de pontuação e suas funções no texto'],
    9:  ['Ortografia', 'Concordâncias verbal e nominal'],
    11: ['Regências verbal e nominal', 'Emprego de tempos e modos verbais'],
    13: ['Formação de tempos compostos dos verbos', 'Locuções verbais (perífrases verbais)'],
    15: ['Sintaxe de colocação pronominal', 'Paralelismo sintático e paralelismo semântico'],
  },
  'Noções de Administração Pública': {
    1:  ['Constituição Federal de 1988'],
    3:  ['Lei 8.112/90 – Estatuto dos Servidores Públicos Federais'],
    5:  ['Lei 14.133/2021 – Licitações e Contratos'],
    7:  ['Lei de Responsabilidade Fiscal – Lei Complementar 101/2000'],
    9:  ['Ética na Administração Pública'],
    11: ['Lei Complementar 1.786/2011 – Regime Jurídico Único dos Servidores de Vitória da Conquista'],
    13: ['Revisão: Constituição Federal de 1988', 'Revisão: Lei 8.112/90', 'Revisão: Lei 14.133/2021'],
    15: ['Revisão: Lei de Responsabilidade Fiscal – LC 101/2000', 'Revisão: Ética na Administração Pública', 'Revisão: LC 1.786/2011 – Regime Jurídico Único'],
  },
  'Noções de Informática': {
    1:  ['Aplicativos para edição de textos, planilhas e apresentações: Microsoft Office e BR Office'],
    3:  ['Sistemas operacionais: Windows e LINUX'],
    5:  ['Tecnologias, ferramentas e procedimentos associados à Internet e intranet'],
    7:  ['Organização e gerenciamento de informações, arquivos, pastas e programas'],
    9:  ['Certificação e assinatura digital'],
    11: ['Segurança da Informação'],
    13: ['Revisão: Microsoft Office / BR Office', 'Revisão: Sistemas operacionais Windows e LINUX', 'Revisão: Internet e intranet'],
    15: ['Revisão: Gerenciamento de arquivos, pastas e programas', 'Revisão: Certificação e assinatura digital', 'Revisão: Segurança da Informação'],
  },
  'Conhecimentos Gerais / Atualidades': {
    1:  ['Vida econômica, social, política, tecnológica, relações exteriores, segurança e ecologia – nacional e internacional'],
    3:  ['Descobertas e inovações científicas na atualidade e seus impactos na sociedade contemporânea'],
    5:  ['Desenvolvimento urbano brasileiro'],
    7:  ['Cultura e sociedade brasileira: artes, arquitetura, cinema, jornais, revistas, televisão, música e teatro'],
    9:  ['História, Cultura, Turismo e Geografia da Bahia e de Vitória da Conquista'],
    11: ['Revisão: Vida econômica, social e política', 'Revisão: Descobertas e inovações científicas', 'Revisão: Desenvolvimento urbano brasileiro'],
    13: ['Revisão: Cultura e sociedade brasileira'],
    15: ['Revisão: História, Cultura e Geografia da Bahia e de Vitória da Conquista'],
  },
  'Contabilidade Geral': {
    2:  ['A Escrituração Contábil'],
    4:  ['Os registros das operações típicas de uma empresa'],
    6:  ['A avaliação dos ativos e passivos'],
    8:  ['A elaboração das demonstrações contábeis'],
    10: ['Revisão: A Escrituração Contábil'],
    12: ['Revisão: Os registros das operações típicas de uma empresa'],
    14: ['Revisão: A avaliação dos ativos e passivos'],
    16: ['Revisão: A elaboração das demonstrações contábeis'],
  },
  'Contabilidade Pública': {
    2:  ['Contabilidade Pública – conceitos e fundamentos'],
    4:  ['Plano de Contas'],
    6:  ['Orçamento Público'],
    8:  ['Receita e Despesa Pública'],
    10: ['Demonstrações Contábeis'],
    12: ['Balanço Geral'],
    14: ['Sistemas de Controle Interno e Externo'],
    16: ['Gestão Fiscal'],
  },
  'Auditoria Contábil': {
    2:  ['Normas brasileiras para o exercício da auditoria interna: independência, competência, âmbito, execução e administração', 'Finalidades e objetivos da auditoria. Abrangência de atuação', 'Normas e tipos. Normas relativas à execução dos trabalhos'],
    4:  ['Normas relativas à opinião do auditor', 'Relatórios, pareceres e certificados de auditoria', 'Operacionalidade', 'Objetivos, técnicas e procedimentos de auditoria'],
    6:  ['Planejamento dos trabalhos de auditoria', 'Programas de auditoria', 'Papéis de trabalho', 'Testes de auditoria'],
    8:  ['Amostragem estatística em auditoria', 'Eventos ou transações subsequentes', 'Revisão analítica'],
    10: ['Entrevista em auditoria', 'Conferência de cálculo', 'Confirmação'],
    12: ['Interpretação das informações e Observações', 'Procedimentos de auditoria em áreas específicas das demonstrações contábeis', 'Normas relativas ao Parecer'],
    14: ['Ética profissional e responsabilidade legal', 'Avaliação dos controles internos', 'Materialidade, relevância e risco em auditoria'],
    16: ['Evidência em auditoria', 'Função da Auditoria Interna', 'Sistemas de controle interno e externo e suas normas constitucionais e legais'],
  },
  'Noções de Direito Público e Privado': {
    2:  ['Fontes e Hierarquia da Norma', 'Estado e Constituição'],
    4:  ['Poderes do Estado', 'A Pessoa e seus Atributos'],
    6:  ['Tipos de Sociedades', 'Contratos'],
    8:  ['Crimes contra a ordem econômica', 'Tributos e suas espécies'],
    10: ['Créditos Tributários', 'Contratos de trabalho em relação aos empregos'],
    12: ['Direitos Trabalhistas', 'Conhecimentos de direito financeiro: Lei 4.320/64'],
    14: ['Processos de licitação: Lei nº 14.133/2021', 'Lei Complementar 101/00 – Finanças Públicas'],
    16: ['Constituição Federal de 1988', 'Imposto Territorial Rural – ITR'],
  },
  'Direito Tributário': {
    2:  ['Sistema Tributário Nacional – princípios gerais e constitucionais, limitações ao poder de tributar, imunidades'],
    4:  ['Competência tributária da União, Estados, Municípios e Distrito Federal. Competência residual', 'Tributo: conceito e espécies (impostos, taxas, contribuição de melhoria, empréstimo compulsório). Classificação e funções'],
    6:  ['Repartição de receitas tributárias', 'Legislação tributária: vigência, aplicação, interpretação e integração. Normas complementares', 'Obrigação tributária: conceito, natureza, espécies. Hipótese de incidência. Fato gerador'],
    8:  ['Sujeitos da obrigação tributária. Substituição tributária. Solidariedade. Capacidade tributária. Responsabilidade tributária'],
    10: ['Crédito tributário: lançamento, modalidades. Suspensão, extinção e exclusão do crédito tributário. Garantias e privilégios'],
    12: ['Sigilo fiscal', 'Administração tributária. Fiscalização. Certidões negativas. Dívida Ativa: liquidez, certeza, exigibilidade'],
    14: ['Regime Jurídico dos Impostos Municipais: IPTU, ISS e ITBI'],
    16: ['Execução fiscal – Lei 6.830/80. Medida Cautelar Fiscal – Lei 8.397/92', 'Mandado de Segurança, Ação Anulatória e demais ações em matéria tributária. Código Tributário Municipal'],
  },
}

// P1 = ciclos ímpares, P2 = ciclos pares
const DISCIPLINAS_P1 = ['Língua Portuguesa', 'Noções de Administração Pública', 'Noções de Informática', 'Conhecimentos Gerais / Atualidades']
const DISCIPLINAS_P2 = ['Contabilidade Geral', 'Contabilidade Pública', 'Auditoria Contábil', 'Noções de Direito Público e Privado', 'Direito Tributário']

// Mapeamento para disciplinas existentes no BD
const DISCIPLINA_MAP: Record<string, { id: string; cor: string } | null> = {
  'Língua Portuguesa':                { id: 'cmm7pugz8000wc90efel0b1pd', cor: '#3b82f6' },
  'Noções de Administração Pública':  { id: 'cmmchiy0m0004c9hog73uhrwf', cor: '#8b5cf6' },
  'Noções de Informática':            null, // criar
  'Conhecimentos Gerais / Atualidades': null, // criar
  'Contabilidade Geral':              { id: 'cmmchiy0m0006c9howx2nqr6a', cor: '#10b981' },
  'Contabilidade Pública':            { id: 'cmmchiy0m0007c9hoatfohcp3', cor: '#059669' },
  'Auditoria Contábil':               { id: 'cmmchiy0m0005c9hoorqnv0kd', cor: '#7c3aed' },
  'Noções de Direito Público e Privado': null, // criar
  'Direito Tributário':               { id: 'cmmchiy0m000ac9homz6rx9ba', cor: '#ea580c' },
}

const CRIAR_DISCIPLINAS = [
  { nome: 'Noções de Informática',               cor: '#06b6d4' },
  { nome: 'Conhecimentos Gerais / Atualidades',  cor: '#f59e0b' },
  { nome: 'Noções de Direito Público e Privado', cor: '#dc2626' },
]

// minutos planejados por disciplina por ciclo
const MIN_P1 = 300 // 5h cada disciplina P1
const MIN_P2 = 240 // 4h cada disciplina P2

async function main() {
  console.log('🚀 Criando Plano ISS Vitória da Conquista...\n')

  // ── 1. Criar disciplinas que faltam ────────────────────────────────────────
  for (const disc of CRIAR_DISCIPLINAS) {
    const existing = await prisma.disciplina.findFirst({ where: { nome: disc.nome, userId: null } })
    if (existing) {
      DISCIPLINA_MAP[disc.nome] = { id: existing.id, cor: disc.cor }
      console.log(`  ↩ Disciplina já existe: ${disc.nome}`)
    } else {
      const created = await prisma.disciplina.create({
        data: { nome: disc.nome, cor: disc.cor, userId: null },
      })
      DISCIPLINA_MAP[disc.nome] = { id: created.id, cor: disc.cor }
      console.log(`  ✅ Disciplina criada: ${disc.nome}`)
    }
  }

  // ── 2. Criar PlanoEstudo ────────────────────────────────────────────────────
  const inicio = nextMonday() // segunda 16/03/2026
  const fim = addDays(inicio, 16 * 7 - 1) // domingo após 16 semanas

  const plano = await prisma.planoEstudo.create({
    data: {
      userId: null,
      nome: 'ISS Vitória da Conquista – Auditor Fiscal',
      descricao: 'Plano de revisão baseado no CSC Mentoria CA – 16 ciclos semanais (seg→dom)',
      dataInicio: inicio,
      dataFim: fim,
      ativo: true,
    },
  })
  console.log(`\n✅ PlanoEstudo: ${plano.id}`)
  console.log(`   Início: ${inicio.toISOString().split('T')[0]}  Fim: ${fim.toISOString().split('T')[0]}\n`)

  // ── 3. Adicionar disciplinas ao pool do plano ───────────────────────────────
  const todasDisc = [...DISCIPLINAS_P1, ...DISCIPLINAS_P2]
  for (const nome of todasDisc) {
    const disc = DISCIPLINA_MAP[nome]
    if (!disc) { console.warn(`  ⚠ Disciplina não encontrada: ${nome}`); continue }
    await prisma.planoEstudoDisciplina.create({
      data: { planoId: plano.id, disciplinaId: disc.id },
    }).catch(() => {}) // ignora duplicata
  }
  console.log(`  ✅ Pool: ${todasDisc.length} disciplinas adicionadas`)

  // ── 4. Criar 16 SemanaEstudo + DisciplinaSemana ────────────────────────────
  for (let ciclo = 1; ciclo <= 16; ciclo++) {
    const semanaInicio = addDays(inicio, (ciclo - 1) * 7)   // segunda
    const semanaFim    = addDays(semanaInicio, 6)            // domingo

    const semana = await prisma.semanaEstudo.create({
      data: {
        planoId: plano.id,
        numeroSemana: ciclo,
        dataInicio: semanaInicio,
        dataFim: semanaFim,
        observacoes: `Ciclo ${ciclo} – ${ciclo % 2 !== 0 ? 'P1 (ímpares)' : 'P2 (pares)'}`,
      },
    })

    const disciplinasCiclo = ciclo % 2 !== 0 ? DISCIPLINAS_P1 : DISCIPLINAS_P2
    const minutos = ciclo % 2 !== 0 ? MIN_P1 : MIN_P2

    for (const nome of disciplinasCiclo) {
      const disc = DISCIPLINA_MAP[nome]
      if (!disc) continue

      const assuntos: string[] = ASSUNTOS[nome]?.[ciclo] ?? []

      await prisma.disciplinaSemana.create({
        data: {
          semanaId: semana.id,
          disciplinaId: disc.id,
          minutosPlanejados: minutos,
          assuntos: assuntos.length ? assuntos.join('\n') : null,
          diasEstudo: ciclo % 2 !== 0
            ? JSON.stringify(['segunda', 'terça', 'quarta', 'quinta'])
            : JSON.stringify(['segunda', 'terça', 'quarta', 'quinta', 'sexta']),
        },
      })
    }

    const dataStr = `${semanaInicio.toISOString().split('T')[0]} → ${semanaFim.toISOString().split('T')[0]}`
    console.log(`  Ciclo ${String(ciclo).padStart(2, '0')} [${ciclo % 2 !== 0 ? 'P1' : 'P2'}]  ${dataStr}  (${disciplinasCiclo.length} disciplinas)`)
  }

  console.log('\n✅ Plano criado com sucesso!')
  console.log(`   → /admin/plano-estudos/${plano.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
