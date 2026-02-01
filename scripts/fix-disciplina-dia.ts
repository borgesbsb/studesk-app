/**
 * Script para corrigir registros DisciplinaDia faltantes
 *
 * Problema: Disciplinas têm o campo diasEstudo preenchido (ex: "dia1,dia3"),
 * mas não têm os registros correspondentes na tabela DisciplinaDia.
 *
 * Solução: Para cada DisciplinaSemana, criar os registros DisciplinaDia
 * baseado no campo diasEstudo.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixDisciplinaDia() {
  console.log('🔧 Iniciando correção de DisciplinaDia...\n')

  try {
    // Buscar todas as DisciplinaSemana com diasEstudo preenchido
    const disciplinasSemana = await prisma.disciplinaSemana.findMany({
      where: {
        diasEstudo: {
          not: null
        }
      },
      include: {
        dias: true,
        disciplina: true,
        semana: {
          include: {
            plano: true
          }
        }
      }
    })

    console.log(`📊 Encontradas ${disciplinasSemana.length} disciplinas com diasEstudo\n`)

    let totalCriados = 0
    let totalPulados = 0

    for (const discSemana of disciplinasSemana) {
      const diasEstudo = discSemana.diasEstudo?.split(',').map(d => d.trim()).filter(d => d) || []
      const diasExistentes = discSemana.dias.map(d => d.dia)
      const diasFaltando = diasEstudo.filter(d => !diasExistentes.includes(d))

      if (diasFaltando.length === 0) {
        totalPulados++
        continue
      }

      console.log(`📝 ${discSemana.disciplina.nome} (Plano: ${discSemana.semana.plano.nome})`)
      console.log(`   diasEstudo: ${discSemana.diasEstudo}`)
      console.log(`   Dias existentes: [${diasExistentes.join(', ')}]`)
      console.log(`   Dias faltando: [${diasFaltando.join(', ')}]`)

      // Criar registros DisciplinaDia faltantes
      const criados = await prisma.disciplinaDia.createMany({
        data: diasFaltando.map(dia => ({
          disciplinaSemanaId: discSemana.id,
          dia,
          horasPlanejadas: 1, // Valor padrão
          horasRealizadas: 0,
          questoesPlanejadas: 0,
          questoesRealizadas: 0
        })),
        skipDuplicates: true
      })

      console.log(`   ✅ Criados ${criados.count} registros DisciplinaDia\n`)
      totalCriados += criados.count
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`✅ Correção concluída!`)
    console.log(`   Total de registros criados: ${totalCriados}`)
    console.log(`   Total de disciplinas já corretas: ${totalPulados}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  } catch (error) {
    console.error('❌ Erro ao corrigir DisciplinaDia:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

fixDisciplinaDia()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
