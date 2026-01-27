/**
 * Script para debugar e visualizar todas as disciplinas de uma semana
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugDisciplinas() {
  try {
    console.log('🔍 Buscando disciplinas da semana...\n')

    const semanaId = 'cmk5xvtq30001c969buzh4z6h'

    const disciplinas = await prisma.disciplinaSemana.findMany({
      where: {
        semanaId: semanaId
      },
      include: {
        disciplina: true,
        dias: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📊 Total de disciplinas: ${disciplinas.length}\n`)

    disciplinas.forEach((disc, index) => {
      console.log(`\n${index + 1}. ${disc.disciplina.nome}`)
      console.log(`   ID: ${disc.id}`)
      console.log(`   diasEstudo: "${disc.diasEstudo}"`)
      console.log(`   Horas planejadas: ${disc.horasPlanejadas}`)
      console.log(`   Questões planejadas: ${disc.questoesPlanejadas}`)
      console.log(`   Criada em: ${disc.createdAt.toLocaleString('pt-BR')}`)
      console.log(`   Atualizada em: ${disc.updatedAt.toLocaleString('pt-BR')}`)

      if (disc.dias && disc.dias.length > 0) {
        console.log(`   DisciplinaDia (${disc.dias.length}):`)
        disc.dias.forEach(dia => {
          console.log(`     - ${dia.dia}: ${dia.horasPlanejadas}h, ${dia.questoesPlanejadas}q`)
        })
      } else {
        console.log(`   DisciplinaDia: (nenhum)`)
      }
    })

    console.log('\n')

    // Agrupar por dia usando diasEstudo
    const disciplinasPorDia: Record<string, any[]> = {}

    disciplinas.forEach(disc => {
      const dias = disc.diasEstudo?.split(',').map(d => d.trim()).filter(d => d) || []
      dias.forEach(dia => {
        if (!disciplinasPorDia[dia]) {
          disciplinasPorDia[dia] = []
        }
        disciplinasPorDia[dia].push(disc)
      })
    })

    console.log('📅 Disciplinas agrupadas por dia (usando campo diasEstudo):')
    Object.keys(disciplinasPorDia).sort().forEach(dia => {
      console.log(`\n  ${dia}: ${disciplinasPorDia[dia].length} disciplina(s)`)
      disciplinasPorDia[dia].forEach(disc => {
        console.log(`    - ${disc.disciplina.nome}`)
      })
    })

  } catch (error) {
    console.error('❌ Erro:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

debugDisciplinas()
  .then(() => {
    console.log('\n✅ Debug finalizado!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error)
    process.exit(1)
  })
