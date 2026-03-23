import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── IDs das Disciplinas (produção) ─────────────────────────────────────────
const DISC = {
  admGeral:       'cmmchiy0m0003c9hofd8ijjf7', // Administração Geral
  admPublica:     'cmmchiy0m0004c9hog73uhrwf', // Administração Pública
  contabPublica:  'cmmchiy0m0007c9hoatfohcp3', // Contabilidade Pública
  contabGeral:    'cmmchiy0m0006c9howx2nqr6a', // Contabilidade Geral
  auditoria:      'cmmchiy0m0005c9hoorqnv0kd', // Auditoria
  economia:       'cmmchiy0m0002c9ho4nnq6fb6', // Economia e Finanças Públicas
  estatistica:    'cmm7pusmg000xc90erjy1tmfc', // Estatística
  ingles:         'cmn0r2f410003c98b9ktv8zvz', // Língua Inglesa
  portugues:      'cmm7pugz8000wc90efel0b1pd', // Português
  racLogico:      'cmmchiy0m0001c9hoyls8k2cc', // Raciocínio Lógico (Matemática)
  fluenciaDados:  'cmmchiy0m0008c9hokmynwtdm', // Fluência em Dados (TI/IA)
}

const PLANO_RFB_ID  = 'cmm7psw7f000tc90ege3kpbi2' // Receita Federal 2026
const CICLO3_ID     = 'cmmchyj3y0005c913fl9whp5r' // Semana 3 (16-22/03/2026)

// ─── Gabarito completo (80 questões) ────────────────────────────────────────
// Q1-5: Adm Pública – Accountability
// Q6-16: Adm Geral – Planejamento Estratégico/Tático/Operacional/Gestão
// Q17-26: Contabilidade Pública – AFO, Balanço, DVP, MCASP
// Q27-29: Contabilidade Geral – Análise Demonstrações (vertical/horizontal)
// Q30-34: Auditoria – Fraude e Erro
// Q35-38: Contabilidade Geral – Escrituração/Apuração do Resultado
// Q39-43: Economia e Finanças Públicas – Preferências/Equilíbrio/Mercado
// Q44-49: Estatística – Probabilidade/Combinatória
// Q50-57: Língua Inglesa – Interpretação de Textos
// Q58-67: Português – Semântica
// Q68-75: Raciocínio Lógico – Matemática + Matemática Financeira
// Q76-80: Fluência em Dados – Ciência de Dados/IA/Linguagem R
const GABARITO: Record<number, string> = {
   1: 'B',  2: 'A',  3: 'D',  4: 'E',  5: 'A',
   6: 'D',  7: 'C',  8: 'B',  9: 'D', 10: 'D',
  11: 'D', 12: 'A', 13: 'A', 14: 'C', 15: 'A',
  16: 'A', 17: 'A', 18: 'E', 19: 'B', 20: 'D',
  21: 'B', 22: 'A', 23: 'D', 24: 'B', 25: 'A',
  26: 'E', 27: 'E', 28: 'D', 29: 'E', 30: 'D',
  31: 'A', 32: 'B', 33: 'A', 34: 'C', 35: 'C',
  36: 'B', 37: 'B', 38: 'D', 39: 'E', 40: 'C',
  41: 'D', 42: 'D', 43: 'B', 44: 'D', 45: 'A',
  46: 'D', 47: 'C', 48: 'C', 49: 'E', 50: 'C',
  51: 'A', 52: 'B', 53: 'B', 54: 'A', 55: 'E',
  56: 'A', 57: 'D', 58: 'E', 59: 'B', 60: 'A',
  61: 'B', 62: 'A', 63: 'E', 64: 'B', 65: 'A',
  66: 'C', 67: 'C', 68: 'A', 69: 'B', 70: 'B',
  71: 'A', 72: 'E', 73: 'B', 74: 'B', 75: 'B',  // Q73-75: Juros Compostos → Q73=B
  76: 'Certo', 77: 'Errado', 78: 'Errado', 79: 'Errado', 80: 'E',
}

async function main() {
  console.log('🚀 Criando 3º Simulado RFB – Mentoria CA (Ciclo 3)...\n')

  // ─── Verificar Ciclo 3 ───────────────────────────────────────────────────
  const semana3 = await prisma.semanaEstudo.findFirst({
    where: { id: CICLO3_ID, planoId: PLANO_RFB_ID },
  })
  if (!semana3) throw new Error('Ciclo 3 RFB não encontrado!')
  console.log(`✅ Ciclo 3: ${semana3.id}`)
  console.log(`   ${semana3.dataInicio.toISOString().split('T')[0]} → ${semana3.dataFim.toISOString().split('T')[0]}`)

  if (semana3.simuladoId) {
    console.log(`  ↩ Simulado já associado: ${semana3.simuladoId}`)
    return
  }

  // ─── Criar ConfigSimulado ────────────────────────────────────────────────
  const config = await prisma.configSimulado.create({
    data: {
      nome: '3º Simulado RFB – Mentoria CA (80 questões)',
      totalQuestoes: 80,
      ativo: true,
      disciplinas: {
        createMany: {
          data: [
            { disciplinaId: DISC.admPublica,    totalQuestoes:  5 }, // Q1-5
            { disciplinaId: DISC.admGeral,       totalQuestoes: 11 }, // Q6-16
            { disciplinaId: DISC.contabPublica,  totalQuestoes: 10 }, // Q17-26
            { disciplinaId: DISC.contabGeral,    totalQuestoes:  7 }, // Q27-29 + Q35-38
            { disciplinaId: DISC.auditoria,      totalQuestoes:  5 }, // Q30-34
            { disciplinaId: DISC.economia,       totalQuestoes:  5 }, // Q39-43
            { disciplinaId: DISC.estatistica,    totalQuestoes:  6 }, // Q44-49
            { disciplinaId: DISC.ingles,         totalQuestoes:  8 }, // Q50-57
            { disciplinaId: DISC.portugues,      totalQuestoes: 10 }, // Q58-67
            { disciplinaId: DISC.racLogico,      totalQuestoes:  8 }, // Q68-75
            { disciplinaId: DISC.fluenciaDados,  totalQuestoes:  5 }, // Q76-80
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
      nome: '3º Simulado Mentoria CA – RFB Auditor Fiscal',
      dataRealizacao: semana3.dataFim, // domingo 22/03/2026
      ativo: true,
    },
  })
  console.log(`✅ Simulado criado: ${simulado.id}`)
  console.log(`   Nome: ${simulado.nome}`)
  console.log(`   Data: ${simulado.dataRealizacao.toISOString().split('T')[0]}`)

  // ─── Inserir Gabarito (80 questões) ──────────────────────────────────────
  const gabaritoData = Object.entries(GABARITO).map(([num, resp]) => ({
    simuladoId: simulado.id,
    numero: parseInt(num),
    resposta: resp,
  }))

  await prisma.simuladoQuestao.createMany({ data: gabaritoData })
  console.log(`✅ Gabarito inserido: ${gabaritoData.length} questões`)

  // ─── Associar ao Ciclo 3 ──────────────────────────────────────────────────
  await prisma.semanaEstudo.update({
    where: { id: semana3.id },
    data: { simuladoId: simulado.id },
  })
  console.log(`\n✅ Simulado associado ao Ciclo 3 com sucesso!`)
  console.log(`   → /admin/simulados/${simulado.id}`)

  // ─── Resumo ───────────────────────────────────────────────────────────────
  console.log('\n📊 Distribuição de questões:')
  console.log('   Adm. Pública              Q1-5     →  5q  (gabarito: B,A,D,E,A)')
  console.log('   Adm. Geral                Q6-16    → 11q  (gabarito: D,C,B,D,D,D,A,A,C,A,A)')
  console.log('   Contabilidade Pública     Q17-26   → 10q  (gabarito: A,E,B,D,B,A,E,E,D,E)')
  console.log('   Contabilidade Geral       Q27-29+35-38 → 7q')
  console.log('   Auditoria                 Q30-34   →  5q  (gabarito: D,A,B,A,C)')
  console.log('   Economia e Fin. Públicas  Q39-43   →  5q  (gabarito: E,C,D,D,B)')
  console.log('   Estatística               Q44-49   →  6q  (gabarito: D,A,D,C,C,E)')
  console.log('   Língua Inglesa            Q50-57   →  8q  (gabarito: C,A,B,B,A,E,A,D)')
  console.log('   Português                 Q58-67   → 10q  (gabarito: E,B,A,B,A,B,A,E,B,A)')
  console.log('   Raciocínio Lógico (Mat.)  Q68-75   →  8q  (gabarito: A,B,B,A,E,B,B,B)')
  console.log('   Fluência em Dados         Q76-80   →  5q  (gabarito: Certo,Errado,Errado,Errado,E)')
  console.log('\n   TOTAL: 80 questões')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
