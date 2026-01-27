/**
 * Script para corrigir o campo diasEstudo baseado nos registros DisciplinaDia existentes
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function corrigirDiasEstudo() {
  try {
    console.log('🔍 Buscando disciplinas para corrigir...\n')

    const semanaId = 'cmk5xvtq30001c969buzh4z6h'

    const disciplinas = await prisma.disciplinaSemana.findMany({
      where: {
        semanaId: semanaId
      },
      include: {
        disciplina: true,
        dias: {
          orderBy: { dia: 'asc' }
        }
      }
    })

    console.log(`📊 Total de disciplinas: ${disciplinas.length}\n`)

    let corrigidas = 0

    for (const disc of disciplinas) {
      // Obter dias do campo diasEstudo
      const diasAtuais = disc.diasEstudo?.split(',').map(d => d.trim()).filter(d => d) || []

      // Obter dias da tabela DisciplinaDia
      const diasReais = disc.dias.map(d => d.dia).sort()

      // Comparar
      const diasAtuaisOrdenados = [...diasAtuais].sort()
      const saoIguais = JSON.stringify(diasAtuaisOrdenados) === JSON.stringify(diasReais)

      if (!saoIguais) {
        console.log(`⚠️  ${disc.disciplina.nome}`)
        console.log(`   diasEstudo atual: [${diasAtuais.join(', ')}]`)
        console.log(`   dias reais (DisciplinaDia): [${diasReais.join(', ')}]`)
        console.log(`   → Atualizando para: [${diasReais.join(', ')}]`)

        // Atualizar
        await prisma.disciplinaSemana.update({
          where: { id: disc.id },
          data: {
            diasEstudo: diasReais.join(',')
          }
        })

        corrigidas++
        console.log(`   ✅ Corrigida!\n`)
      } else {
        console.log(`✅ ${disc.disciplina.nome} - OK (diasEstudo correto)`)
      }
    }

    console.log(`\n🎉 Correção finalizada! ${corrigidas} disciplina(s) corrigida(s).`)

  } catch (error) {
    console.error('❌ Erro:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

corrigirDiasEstudo()
  .then(() => {
    console.log('\n✅ Script finalizado!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error)
    process.exit(1)
  })
