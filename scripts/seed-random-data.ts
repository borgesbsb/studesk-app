import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Nomes de disciplinas para gerar dados
const disciplinasBase = [
  { nome: 'Administração Geral e Pública', cor: '#8e91e6' },
  { nome: 'Direito Constitucional', cor: '#3ef73b' },
  { nome: 'Direito Administrativo', cor: '#f79f3b' },
  { nome: 'Direito Tributário', cor: '#f7de3b' },
  { nome: 'Contabilidade Geral', cor: '#485b7a' },
  { nome: 'Economia e Finanças Públicas', cor: '#3bf748' },
  { nome: 'Estatística', cor: '#c5f73b' },
  { nome: 'Português', cor: '#3b82f6' },
  { nome: 'Informática', cor: '#acf73b' },
  { nome: 'Auditoria', cor: '#e1f73b' },
  { nome: 'Geografia', cor: '#806e14' },
  { nome: 'História', cor: '#f73bd4' },
  { nome: 'Matemática', cor: '#eaf73b' },
  { nome: 'Inglês', cor: '#f7a93b' }
]

// Nomes de materiais
const materiaisNomes = [
  'Apostila Completa - Aula 00',
  'Teoria e Exercícios - Parte 1',
  'Resumo Esquematizado',
  'Questões Comentadas ESAF',
  'Questões Comentadas FCC',
  'Lei Seca Comentada',
  'Curso Completo - Módulo 1',
  'Videoaulas - Parte 2',
  'Mapas Mentais',
  'Súmulas e Informativos'
]

// Nomes de sessões de estudo
const sessoesNomes = [
  'Revisão Matinal',
  'Estudo Intensivo',
  'Revisão Noturna',
  'Estudo Rápido',
  'Leitura Focada',
  'Aprofundamento'
]

// Assuntos estudados
const assuntos = [
  'Princípios fundamentais, organização do Estado',
  'Direitos e garantias fundamentais',
  'Organização político-administrativa',
  'Administração pública direta e indireta',
  'Atos administrativos, discricionários e vinculados',
  'Sistema Tributário Nacional, impostos e taxas',
  'Contabilidade pública, orçamento',
  'Matemática financeira, juros simples e compostos',
  'Interpretação de texto, ortografia',
  'Análise sintática, concordância'
]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function generateHash(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let hash = ''
  for (let i = 0; i < 10; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return hash
}

async function createUserWithData(
  name: string,
  email: string,
  numDisciplinas: number,
  hasMateriais: boolean,
  hasHistorico: boolean,
  hasSimulados: boolean
) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`Criando usuário: ${name} (${email})`)
  console.log('='.repeat(80))

  // 1. Criar usuário
  const hashedPassword = await bcrypt.hash('123456', 10)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      hash: generateHash()
    }
  })
  console.log(`✓ Usuário criado: ${user.id}`)

  // 2. Criar disciplinas
  const disciplinas = []
  const selectedDisciplinas = disciplinasBase
    .sort(() => Math.random() - 0.5)
    .slice(0, numDisciplinas)

  for (const disc of selectedDisciplinas) {
    const disciplina = await prisma.disciplina.create({
      data: {
        userId: user.id,
        nome: disc.nome,
        cor: disc.cor
      }
    })
    disciplinas.push(disciplina)
  }
  console.log(`✓ ${disciplinas.length} disciplinas criadas`)

  // 3. Criar Plano de Estudo
  const dataInicio = new Date()
  dataInicio.setDate(dataInicio.getDate() - 15) // Começou há 15 dias
  const dataFim = new Date(dataInicio)
  dataFim.setDate(dataFim.getDate() + 60) // Duração de 60 dias

  const plano = await prisma.planoEstudo.create({
    data: {
      userId: user.id,
      nome: `Preparação para Concurso ${new Date().getFullYear()}`,
      dataInicio,
      dataFim,
      ativo: true
    }
  })
  console.log(`✓ Plano de estudo criado: ${plano.nome}`)

  // 4. Criar semanas (3 semanas - passada, atual, próxima)
  const semanas = []
  for (let i = 0; i < 3; i++) {
    const semanaInicio = new Date(dataInicio)
    semanaInicio.setDate(semanaInicio.getDate() + (i * 7))
    const semanaFim = new Date(semanaInicio)
    semanaFim.setDate(semanaFim.getDate() + 6)

    const semana = await prisma.semanaEstudo.create({
      data: {
        planoId: plano.id,
        numeroSemana: i + 1,
        dataInicio: semanaInicio,
        dataFim: semanaFim,
        totalHoras: disciplinas.length * 2,
        horasRealizadas: i === 0 ? randomInt(8, 12) : i === 1 ? randomInt(3, 7) : 0
      }
    })
    semanas.push(semana)
  }
  console.log(`✓ ${semanas.length} semanas criadas`)

  // 5. Criar DisciplinaSemana e DisciplinaDia para cada semana
  let totalDisciplinasDia = 0
  for (const semana of semanas) {
    for (let i = 0; i < disciplinas.length; i++) {
      const disciplina = disciplinas[i]

      // Determinar quais dias da semana (1-7) - usar Set para evitar duplicatas
      const numDias = randomInt(2, 3)
      const diasSet = new Set<string>()
      while (diasSet.size < numDias) {
        const diaNum = randomInt(1, 7)
        diasSet.add(`dia${diaNum}`)
      }
      const diasArray = Array.from(diasSet)

      const horasPlanejadas = randomInt(1, 3)
      const questoesPlanejadas = randomInt(5, 20)

      // Para semanas passadas, adicionar progresso realizado
      let horasRealizadas = 0
      let questoesRealizadas = 0

      if (semana.numeroSemana === 1) {
        // Semana passada - completou a maior parte
        horasRealizadas = Math.floor(horasPlanejadas * (0.7 + Math.random() * 0.3))
        questoesRealizadas = Math.floor(questoesPlanejadas * (0.6 + Math.random() * 0.4))
      } else if (semana.numeroSemana === 2) {
        // Semana atual - progresso parcial
        horasRealizadas = Math.floor(horasPlanejadas * Math.random() * 0.6)
        questoesRealizadas = Math.floor(questoesPlanejadas * Math.random() * 0.5)
      }

      const disciplinaSemana = await prisma.disciplinaSemana.create({
        data: {
          semanaId: semana.id,
          disciplinaId: disciplina.id,
          horasPlanejadas,
          horasRealizadas,
          questoesPlanejadas,
          questoesRealizadas,
          prioridade: i + 1,
          diasEstudo: diasArray.join(','),
          concluida: semana.numeroSemana === 1 && horasRealizadas >= horasPlanejadas
        }
      })

      // Criar DisciplinaDia para cada dia
      for (const dia of diasArray) {
        const horasPorDia = Math.ceil(horasPlanejadas / diasArray.length)
        const questoesPorDia = Math.ceil(questoesPlanejadas / diasArray.length)

        let horasRealizadasDia = 0
        let questoesRealizadasDia = 0

        if (semana.numeroSemana === 1) {
          horasRealizadasDia = randomInt(0, horasPorDia)
          questoesRealizadasDia = randomInt(0, questoesPorDia)
        } else if (semana.numeroSemana === 2 && parseInt(dia.replace('dia', '')) <= 3) {
          horasRealizadasDia = randomInt(0, horasPorDia)
          questoesRealizadasDia = randomInt(0, questoesPorDia)
        }

        await prisma.disciplinaDia.create({
          data: {
            disciplinaSemanaId: disciplinaSemana.id,
            dia,
            horasPlanejadas: horasPorDia,
            horasRealizadas: horasRealizadasDia,
            questoesPlanejadas: questoesPorDia,
            questoesRealizadas: questoesRealizadasDia
          }
        })
        totalDisciplinasDia++
      }
    }
  }
  console.log(`✓ Disciplinas da semana e ${totalDisciplinasDia} dias criados`)

  // 6. Criar Materiais de Estudo
  if (hasMateriais) {
    const numMateriais = randomInt(5, 10)
    for (let i = 0; i < numMateriais; i++) {
      const tipo = Math.random() > 0.3 ? 'PDF' : 'VIDEO'
      const totalPaginas = tipo === 'PDF' ? randomInt(50, 300) : 0
      const paginasLidas = tipo === 'PDF' ? randomInt(0, Math.floor(totalPaginas * 0.7)) : 0
      const duracaoSegundos = tipo === 'VIDEO' ? randomInt(600, 3600) : null
      const tempoAssistido = tipo === 'VIDEO' ? randomInt(0, duracaoSegundos || 0) : 0

      const material = await prisma.materialEstudo.create({
        data: {
          userId: user.id,
          nome: `${randomItem(materiaisNomes)} - ${randomItem(disciplinas).nome}`,
          tipo,
          totalPaginas,
          paginasLidas,
          duracaoSegundos,
          tempoAssistido
        }
      })

      // Associar material com disciplina
      await prisma.disciplinaMaterial.create({
        data: {
          disciplinaId: randomItem(disciplinas).id,
          materialId: material.id
        }
      })
    }
    console.log(`✓ ${numMateriais} materiais de estudo criados`)
  }

  // 7. Criar Histórico de Leitura
  if (hasHistorico) {
    const materiais = await prisma.materialEstudo.findMany({
      where: { userId: user.id, tipo: 'PDF' }
    })

    if (materiais.length > 0) {
      const numSessoes = randomInt(10, 30)
      for (let i = 0; i < numSessoes; i++) {
        const material = randomItem(materiais)
        const dataLeitura = randomDate(dataInicio, new Date())
        const paginaAtual = randomInt(1, material.totalPaginas)
        const tempoLeituraSegundos = randomInt(300, 3600)

        await prisma.historicoLeitura.create({
          data: {
            materialId: material.id,
            nomeSessao: randomItem(sessoesNomes),
            paginaAtual,
            tempoLeituraSegundos,
            dataLeitura,
            assuntosEstudados: `${randomItem(assuntos)}, ${randomItem(assuntos)}`
          }
        })
      }
      console.log(`✓ ${numSessoes} sessões de leitura criadas`)
    }
  }

  // 8. Criar Simulados
  if (hasSimulados) {
    const numSimulados = randomInt(2, 5)
    for (let i = 0; i < numSimulados; i++) {
      const dataRealizacao = randomDate(dataInicio, new Date())
      const numQuestoes = randomInt(20, 50)
      const taxaAcerto = 0.5 + Math.random() * 0.4 // Entre 50% e 90%

      // Criar disciplinas do simulado
      const numDisciplinasSimulado = Math.min(randomInt(3, 6), disciplinas.length)
      const disciplinasSimulado = disciplinas
        .sort(() => Math.random() - 0.5)
        .slice(0, numDisciplinasSimulado)

      const questoesPorDisciplina = Math.floor(numQuestoes / numDisciplinasSimulado)
      let totalAcertosSim = 0
      const discData = disciplinasSimulado.map(disc => {
        const acertos = Math.round(questoesPorDisciplina * taxaAcerto)
        totalAcertosSim += acertos
        return {
          disciplinaId: disc.id,
          totalQuestoes: questoesPorDisciplina,
          acertos,
          percentual: Math.round((acertos / questoesPorDisciplina) * 1000) / 10
        }
      })

      const totalQuestoesSim = questoesPorDisciplina * numDisciplinasSimulado
      const percentualGeralSim = Math.round((totalAcertosSim / totalQuestoesSim) * 1000) / 10

      await prisma.simulado.create({
        data: {
          userId: user.id,
          nome: `Simulado ${i + 1} - ${randomDate(dataInicio, new Date()).toLocaleDateString('pt-BR')}`,
          dataRealizacao,
          totalQuestoes: totalQuestoesSim,
          totalAcertos: totalAcertosSim,
          percentualGeral: percentualGeralSim,
          disciplinas: { create: discData }
        }
      })
    }
    console.log(`✓ ${numSimulados} simulados criados`)
  }

  console.log(`\n✅ Usuário ${name} criado com sucesso!\n`)
  return user
}

async function main() {
  console.log('Iniciando seed de dados aleatórios...\n')

  // Buscar usuários existentes
  const existingUsers = await prisma.user.findMany({
    select: { email: true }
  })
  const existingEmails = existingUsers.map(u => u.email)

  // Criar 5 usuários com diferentes perfis
  const usuarios = [
    {
      name: 'Ana Silva',
      email: 'ana.silva@demo.com',
      numDisciplinas: 8,
      hasMateriais: true,
      hasHistorico: true,
      hasSimulados: true
    },
    {
      name: 'Carlos Santos',
      email: 'carlos.santos@demo.com',
      numDisciplinas: 12,
      hasMateriais: true,
      hasHistorico: true,
      hasSimulados: true
    },
    {
      name: 'Maria Oliveira',
      email: 'maria.oliveira@demo.com',
      numDisciplinas: 6,
      hasMateriais: true,
      hasHistorico: false,
      hasSimulados: true
    },
    {
      name: 'João Costa',
      email: 'joao.costa@demo.com',
      numDisciplinas: 10,
      hasMateriais: true,
      hasHistorico: true,
      hasSimulados: false
    },
    {
      name: 'Fernanda Lima',
      email: 'fernanda.lima@demo.com',
      numDisciplinas: 14,
      hasMateriais: true,
      hasHistorico: true,
      hasSimulados: true
    }
  ]

  for (const usuario of usuarios) {
    if (!existingEmails.includes(usuario.email)) {
      await createUserWithData(
        usuario.name,
        usuario.email,
        usuario.numDisciplinas,
        usuario.hasMateriais,
        usuario.hasHistorico,
        usuario.hasSimulados
      )
    } else {
      console.log(`⏭️  Usuário ${usuario.email} já existe, pulando...`)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ Seed concluído com sucesso!')
  console.log('='.repeat(80))
  console.log('\nCredenciais de acesso:')
  console.log('Email: <qualquer-um-dos-emails-acima>')
  console.log('Senha: 123456')
  console.log('\nAdmin:')
  console.log('Email: admin@studesk.com')
  console.log('Senha: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
