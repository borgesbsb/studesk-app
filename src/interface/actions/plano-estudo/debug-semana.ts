'use server'

import { prisma } from '@/lib/prisma'

export async function debugSemana(semanaId: string, disciplinaId: string) {
  try {
    console.log('🔍 DEBUG: Verificando disciplinas na semana:', { semanaId, disciplinaId })
    
    // Listar todas as disciplinas da semana
    const disciplinasSemana = await prisma.disciplinaSemana.findMany({
      where: {
        semanaId: semanaId
      },
      include: {
        disciplina: true
      },
      orderBy: {
        prioridade: 'asc'
      }
    })

    console.log('📋 Disciplinas encontradas na semana:', disciplinasSemana.map(d => ({
      id: d.id,
      disciplinaId: d.disciplinaId,
      disciplinaNome: d.disciplina.nome,
      prioridade: d.prioridade
    })))

    // Verificar se existe a disciplina específica
    const disciplinaEspecifica = disciplinasSemana.find(d => d.disciplinaId === disciplinaId)
    
    if (disciplinaEspecifica) {
      console.log('⚠️ Disciplina já existe:', {
        id: disciplinaEspecifica.id,
        disciplinaId: disciplinaEspecifica.disciplinaId,
        nome: disciplinaEspecifica.disciplina.nome
      })
    } else {
      console.log('✅ Disciplina não existe na semana, pode ser adicionada')
    }

    return { 
      success: true, 
      data: {
        disciplinasNaSemana: disciplinasSemana.length,
        disciplinaJaExiste: !!disciplinaEspecifica,
        disciplinas: disciplinasSemana.map(d => ({
          id: d.id,
          disciplinaId: d.disciplinaId,
          nome: d.disciplina.nome,
          prioridade: d.prioridade
        }))
      }
    }
  } catch (error) {
    console.error('❌ DEBUG: Erro ao verificar semana:', error)
    return { 
      success: false, 
      error: `Erro ao verificar semana: ${(error as Error).message}` 
    }
  }
}

export async function limparDisciplinasOrfas(semanaId: string) {
  try {
    console.log('🧹 Limpando possíveis disciplinas órfãs na semana:', semanaId)
    
    // Buscar disciplinas com disciplinaId inválido
    const todasDisciplinas = await prisma.disciplinaSemana.findMany({
      where: {
        semanaId: semanaId
      },
      include: {
        disciplina: true
      }
    })

    // Filtrar disciplinas órfãs (sem disciplina válida)
    const disciplinasOrfas = todasDisciplinas.filter(d => !d.disciplina)

    if (disciplinasOrfas.length > 0) {
      console.log('🗑️ Encontradas disciplinas órfãs:', disciplinasOrfas.length)
      
      // Excluir disciplinas órfãs
      const resultado = await prisma.disciplinaSemana.deleteMany({
        where: {
          id: {
            in: disciplinasOrfas.map(d => d.id)
          }
        }
      })

      console.log('✅ Disciplinas órfãs removidas:', resultado.count)
      return { success: true, removidas: resultado.count }
    } else {
      console.log('✅ Nenhuma disciplina órfã encontrada')
      return { success: true, removidas: 0 }
    }
  } catch (error) {
    console.error('❌ Erro ao limpar disciplinas órfãs:', error)
    return { 
      success: false, 
      error: `Erro ao limpar disciplinas órfãs: ${(error as Error).message}` 
    }
  }
}