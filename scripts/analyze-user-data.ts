import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzeUser() {
  const email = 'borgesbsb.dev@gmail.com'

  console.log('='.repeat(80))
  console.log('1. DADOS DO USUÁRIO')
  console.log('='.repeat(80))
  const user = await prisma.user.findUnique({ where: { email } })
  console.log(JSON.stringify(user, null, 2))

  if (!user) {
    console.log('Usuário não encontrado!')
    return
  }

  console.log('\n' + '='.repeat(80))
  console.log('2. PLANOS DE ESTUDO')
  console.log('='.repeat(80))
  const planos = await prisma.planoEstudo.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  })
  console.log(JSON.stringify(planos, null, 2))

  console.log('\n' + '='.repeat(80))
  console.log('3. SEMANAS DO PLANO ATIVO')
  console.log('='.repeat(80))
  const semanas = await prisma.semanaEstudo.findMany({
    where: {
      plano: { userId: user.id, ativo: true }
    },
    orderBy: { numeroSemana: 'desc' },
    take: 3
  })
  console.log(JSON.stringify(semanas, null, 2))

  console.log('\n' + '='.repeat(80))
  console.log('4. DISCIPLINAS DA SEMANA')
  console.log('='.repeat(80))
  const disciplinasSemana = await prisma.disciplinaSemana.findMany({
    where: {
      semana: {
        plano: { userId: user.id, ativo: true }
      }
    },
    include: {
      disciplina: { select: { nome: true, cor: true } }
    },
    orderBy: { prioridade: 'asc' },
    take: 10
  })
  console.log(JSON.stringify(disciplinasSemana, null, 2))

  console.log('\n' + '='.repeat(80))
  console.log('5. DIAS DA DISCIPLINA (com horas e questões realizadas)')
  console.log('='.repeat(80))
  const disciplinaDias = await prisma.disciplinaDia.findMany({
    where: {
      disciplinaSemana: {
        semana: {
          plano: { userId: user.id, ativo: true }
        }
      }
    },
    include: {
      disciplinaSemana: {
        include: {
          disciplina: { select: { nome: true } }
        }
      }
    },
    orderBy: { dia: 'asc' },
    take: 20
  })
  console.log(JSON.stringify(disciplinaDias.map(d => ({
    dia: d.dia,
    disciplina: d.disciplinaSemana.disciplina.nome,
    minutosPlanejados: d.minutosPlanejados,
    horasRealizadas: d.horasRealizadas,
    questoesPlanejadas: d.questoesPlanejadas,
    questoesRealizadas: d.questoesRealizadas
  })), null, 2))

  console.log('\n' + '='.repeat(80))
  console.log('6. MATERIAIS DE ESTUDO')
  console.log('='.repeat(80))
  const materiais = await prisma.materialEstudo.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    take: 10
  })
  console.log(JSON.stringify(materiais.map(m => ({
    id: m.id,
    nome: m.nome,
    tipo: m.tipo,
    totalPaginas: m.totalPaginas,
    paginasLidas: m.paginasLidas,
    duracaoSegundos: m.duracaoSegundos,
    tempoAssistido: m.tempoAssistido
  })), null, 2))

  console.log('\n' + '='.repeat(80))
  console.log('7. HISTÓRICO DE LEITURA (Sessões Reais)')
  console.log('='.repeat(80))
  const historicoLeitura = await prisma.historicoLeitura.findMany({
    where: {
      material: { userId: user.id },
      nomeSessao: { not: null },
      assuntosEstudados: { not: null },
      NOT: {
        assuntosEstudados: { contains: '[TEMPO TRANSFERIDO]' }
      }
    },
    include: {
      material: { select: { nome: true } }
    },
    orderBy: { dataLeitura: 'desc' },
    take: 10
  })
  console.log(JSON.stringify(historicoLeitura.map(h => ({
    material: h.material.nome,
    nomeSessao: h.nomeSessao,
    paginaInicial: h.paginaInicial,
    paginaAtual: h.paginaAtual,
    tempoLeituraSegundos: h.tempoLeituraSegundos,
    dataLeitura: h.dataLeitura,
    assuntosPreview: h.assuntosEstudados?.substring(0, 50)
  })), null, 2))

  console.log('\n' + '='.repeat(80))
  console.log('8. SIMULADOS')
  console.log('='.repeat(80))
  const resultadosSimulado = await prisma.simuladoResultado.findMany({
    where: { userId: user.id },
    include: {
      simulado: { select: { id: true, nome: true, dataRealizacao: true } },
      disciplinas: { select: { disciplinaId: true, totalQuestoes: true, acertos: true, percentual: true } }
    },
    orderBy: { simulado: { dataRealizacao: 'desc' } },
    take: 5
  })
  console.log(JSON.stringify(resultadosSimulado.map(r => ({
    id: r.simulado.id,
    nome: r.simulado.nome,
    dataRealizacao: r.simulado.dataRealizacao,
    totalQuestoes: r.totalQuestoes,
    totalAcertos: r.totalAcertos,
    percentualGeral: r.percentualGeral
  })), null, 2))

  console.log('\n' + '='.repeat(80))
  console.log('9. DISCIPLINAS CADASTRADAS')
  console.log('='.repeat(80))
  const disciplinas = await prisma.disciplina.findMany({
    where: { userId: user.id },
    orderBy: { nome: 'asc' },
    take: 15
  })
  console.log(JSON.stringify(disciplinas.map(d => ({
    id: d.id,
    nome: d.nome,
    cor: d.cor
  })), null, 2))

  await prisma.$disconnect()
}

analyzeUser().catch(console.error)
