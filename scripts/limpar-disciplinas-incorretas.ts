/**
 * Script para limpar disciplinas criadas incorretamente pela cópia
 * Remove DisciplinaSemana que foram criadas sem o campo diasEstudo preenchido corretamente
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function limparDisciplinasIncorretas() {
  try {
    console.log('🔍 Iniciando limpeza de disciplinas incorretas...\n')

    // Buscar todas as disciplinas da semana específica
    const semanaId = 'cmk5xvtq30001c969buzh4z6h' // ID da semana que você estava testando

    const disciplinas = await prisma.disciplinaSemana.findMany({
      where: {
        semanaId: semanaId
      },
      include: {
        disciplina: true,
        dias: true
      }
    })

    console.log(`📊 Total de disciplinas na semana: ${disciplinas.length}\n`)

    // Filtrar disciplinas que foram criadas recentemente e têm problema
    const disciplinasProblematicas = disciplinas.filter(disc => {
      // Disciplinas com diasEstudo vazio ou null
      const diasEstudoVazio = !disc.diasEstudo || disc.diasEstudo === ''

      // Disciplinas criadas muito recentemente (últimas 2 horas)
      const criadaRecentemente = new Date(disc.createdAt) > new Date(Date.now() - 2 * 60 * 60 * 1000)

      return diasEstudoVazio && criadaRecentemente
    })

    console.log(`⚠️  Disciplinas problemáticas encontradas: ${disciplinasProblematicas.length}\n`)

    if (disciplinasProblematicas.length === 0) {
      console.log('✅ Nenhuma disciplina problemática encontrada!')
      return
    }

    // Mostrar quais serão deletadas
    console.log('📋 Disciplinas que serão removidas:')
    disciplinasProblematicas.forEach((disc, index) => {
      console.log(`  ${index + 1}. ${disc.disciplina.nome}`)
      console.log(`     - ID: ${disc.id}`)
      console.log(`     - diasEstudo: "${disc.diasEstudo}"`)
      console.log(`     - Criada em: ${disc.createdAt.toLocaleString('pt-BR')}`)
      console.log(`     - DisciplinaDia vinculados: ${disc.dias.length}`)
    })

    console.log('\n⏳ Aguarde 5 segundos antes de deletar...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Deletar as disciplinas problemáticas
    let deletados = 0
    for (const disc of disciplinasProblematicas) {
      await prisma.disciplinaSemana.delete({
        where: { id: disc.id }
      })
      deletados++
      console.log(`  ✅ Deletada: ${disc.disciplina.nome} (${disc.id})`)
    }

    console.log(`\n✅ Limpeza concluída! ${deletados} disciplina(s) removida(s).`)

  } catch (error) {
    console.error('❌ Erro ao limpar disciplinas:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar o script
limparDisciplinasIncorretas()
  .then(() => {
    console.log('\n🎉 Script finalizado com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error)
    process.exit(1)
  })
