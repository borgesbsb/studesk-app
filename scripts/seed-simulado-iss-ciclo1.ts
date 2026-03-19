import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// IDs confirmados em produção
const DISC_IDS = {
  conhecimentosGerais:   'cmms4dy4i0003kxj5gcfabc6n', // Conhecimentos Gerais / Atualidades
  admPublica:            'cmmchiy0m0004c9hog73uhrwf',  // Administração Pública (= Noções de Adm. Pública)
  informatica:           'cmms4dy4c0001kxj5x8ju27kd',  // Noções de Informática
  linguaPortuguesa:      'cmm7pugz8000wc90efel0b1pd',  // Português (= Língua Portuguesa)
}

const PLANO_ID = 'cmms4dy4m0007kxj5kxiyxmbt' // ISS Vitória da Conquista – Auditor Fiscal

async function main() {
  console.log('🚀 Criando 1º Simulado ISS Vitória da Conquista...\n')

  // ─── Buscar Ciclo 1 ──────────────────────────────────────────────────────
  const semana1 = await prisma.semanaEstudo.findFirst({
    where: { planoId: PLANO_ID, numeroSemana: 1 },
  })
  if (!semana1) throw new Error('Ciclo 1 não encontrado!')
  console.log(`✅ Ciclo 1: ${semana1.id}`)
  console.log(`   ${semana1.dataInicio.toISOString().split('T')[0]} → ${semana1.dataFim.toISOString().split('T')[0]}`)

  if (semana1.simuladoId) {
    console.log(`  ↩ Simulado já associado: ${semana1.simuladoId}`)
    return
  }

  // ─── Criar ConfigSimulado ────────────────────────────────────────────────
  const config = await prisma.configSimulado.create({
    data: {
      nome: '1º Simulado ISS Vitória da Conquista – Mentoria CA (50 questões)',
      totalQuestoes: 50,
      ativo: true,
      disciplinas: {
        createMany: {
          data: [
            { disciplinaId: DISC_IDS.conhecimentosGerais, totalQuestoes: 10 }, // Q1-10
            { disciplinaId: DISC_IDS.admPublica,          totalQuestoes: 15 }, // Q11-25
            { disciplinaId: DISC_IDS.informatica,         totalQuestoes: 10 }, // Q26-35
            { disciplinaId: DISC_IDS.linguaPortuguesa,    totalQuestoes: 15 }, // Q36-50
          ],
        },
      },
    },
  })
  console.log(`\n✅ ConfigSimulado criado: ${config.id}`)

  // ─── Criar Simulado ──────────────────────────────────────────────────────
  const simulado = await prisma.simulado.create({
    data: {
      configSimuladoId: config.id,
      nome: '1º Simulado Mentoria CA – ISS Vitória da Conquista',
      dataRealizacao: semana1.dataFim, // domingo 22/03/2026
      ativo: true,
    },
  })
  console.log(`✅ Simulado criado: ${simulado.id}`)
  console.log(`   Nome: ${simulado.nome}`)
  console.log(`   Data de realização: ${simulado.dataRealizacao.toISOString().split('T')[0]}`)

  // ─── Associar ao Ciclo 1 ─────────────────────────────────────────────────
  await prisma.semanaEstudo.update({
    where: { id: semana1.id },
    data: { simuladoId: simulado.id },
  })
  console.log(`\n✅ Simulado associado ao Ciclo 1 com sucesso!`)
  console.log(`   → /admin/simulados/${simulado.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
