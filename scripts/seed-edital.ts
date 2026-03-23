import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Disciplinas do concurso AFRFB 2022 (FGV) - Auditor-Fiscal da Receita Federal
const DISCIPLINAS = [
  // Conhecimentos Básicos
  { nome: 'Língua Portuguesa',                          cor: '#3b82f6' },
  { nome: 'Língua Inglesa',                             cor: '#06b6d4' },
  { nome: 'Raciocínio Lógico-Matemático',               cor: '#f59e0b' },
  { nome: 'Estatística',                                cor: '#f97316' },
  { nome: 'Economia e Finanças Públicas',               cor: '#8b5cf6' },
  { nome: 'Administração Geral',                        cor: '#ec4899' },
  { nome: 'Administração Pública',                      cor: '#14b8a6' },
  { nome: 'Auditoria',                                  cor: '#6366f1' },
  { nome: 'Contabilidade Geral',                        cor: '#22c55e' },
  { nome: 'Contabilidade Aplicada ao Setor Público',    cor: '#84cc16' },
  { nome: 'Fluência em Dados',                          cor: '#0ea5e9' },
  // Conhecimentos Específicos
  { nome: 'Direito Constitucional',                     cor: '#ef4444' },
  { nome: 'Direito Administrativo',                     cor: '#dc2626' },
  { nome: 'Direito Tributário',                         cor: '#b91c1c' },
  { nome: 'Legislação Tributária',                      cor: '#991b1b' },
  { nome: 'Legislação Aduaneira e Comércio Internacional', cor: '#7f1d1d' },
  { nome: 'Direito Previdenciário',                     cor: '#a16207' },
]

async function main() {
  console.log('🚀 Seed: Edital AFRFB 2022 – Auditor-Fiscal da Receita Federal')

  // Upsert disciplinas admin (userId: null)
  const disciplinasCriadas = []

  for (const disc of DISCIPLINAS) {
    const existente = await prisma.disciplina.findFirst({
      where: { nome: disc.nome, userId: null },
    })

    if (existente) {
      console.log(`  ↩ Disciplina já existe: ${disc.nome}`)
      disciplinasCriadas.push(existente)
    } else {
      const nova = await prisma.disciplina.create({
        data: { nome: disc.nome, cor: disc.cor, userId: null, cargaHoraria: 0, peso: 1 },
      })
      console.log(`  ✅ Disciplina criada: ${nova.nome}`)
      disciplinasCriadas.push(nova)
    }
  }

  // Cria o edital
  const edital = await prisma.edital.create({
    data: {
      userId: null,
      nome: 'Auditor-Fiscal da Receita Federal do Brasil – AFRFB 2022',
      orgao: 'FGV',
      cargo: 'Auditor-Fiscal da Receita Federal do Brasil',
      ano: 2022,
      link: 'https://conhecimento.fgv.br/concursos/rfb22',
      descricao: '699 vagas (230 AFRFB + 469 ATRFB). Provas realizadas em março de 2023. 140 questões objetivas em 16 disciplinas + prova discursiva.',
    },
  })

  console.log(`\n✅ Edital criado: ${edital.nome}`)

  // Associa todas as disciplinas ao edital
  const associacoes = await prisma.editalDisciplina.createMany({
    data: disciplinasCriadas.map(d => ({
      editalId: edital.id,
      disciplinaId: d.id,
    })),
    skipDuplicates: true,
  })

  console.log(`🔗 ${associacoes.count} disciplinas associadas ao edital`)
  console.log('\n✅ Seed concluído!')
}

main()
  .catch(e => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
