'use server'

import { PlanoEstudoService } from '@/application/services/plano-estudo.service'
import { DisciplinaPlanejada } from '@/components/plano-estudos/planejamento-disciplinas'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-helpers'

export async function adicionarCicloAoPlano(
  planoId: string,
  numeroSemana: number,
  disciplinas: DisciplinaPlanejada[],
  dataInicio?: string,
  dataFim?: string
) {
  try {
    const { userId } = await requireAuth()
    console.log('🔄 Iniciando adicionarCicloAoPlano:', { planoId, numeroSemana, disciplinas: disciplinas.length, dataInicio, dataFim })
    // Criar datas locais sem conversão de fuso horário
    let inicioDate: Date
    let fimDate: Date

    if (dataInicio) {
      const [ano, mes, dia] = dataInicio.split('-').map(Number)
      inicioDate = new Date(ano, mes - 1, dia, 12, 0, 0)
    } else {
      inicioDate = new Date()
    }

    if (dataFim) {
      const [ano, mes, dia] = dataFim.split('-').map(Number)
      fimDate = new Date(ano, mes - 1, dia, 12, 0, 0)
    } else if (dataInicio) {
      // Calcular 7 dias após início
      const [ano, mes, dia] = dataInicio.split('-').map(Number)
      fimDate = new Date(ano, mes - 1, dia + 6, 12, 0, 0) // +6 porque já conta o dia inicial
    } else {
      // Se não tem dataInicio nem dataFim, calcular 7 dias a partir de hoje
      fimDate = new Date()
      fimDate.setDate(fimDate.getDate() + 6)
    }

    // Converter disciplinas para o formato esperado pelo service
    const semanaData = {
      numeroSemana,
      dataInicio: inicioDate,
      dataFim: fimDate,
      totalHoras: Math.round(disciplinas.reduce((total, d) => total + (d.horasPlanejadas || 0), 0)),
      disciplinas: disciplinas.map(d => ({
        disciplinaId: d.disciplinaId,
        horasPlanejadas: d.horasPlanejadas || 0, // Manter em horas
        tipoVeiculo: d.tipoVeiculo,
        materialNome: d.materialNome,
        questoesPlanejadas: d.questoesPlanejadas || 0,
        tempoVideoPlanejado: d.tempoVideoPlanejado || 0,
        parametro: d.parametro,
        diasEstudo: (d.diasEstudo || []).join(',')
      }))
    }

    console.log('📋 Dados da semana preparados:', semanaData)
    const resultado = await PlanoEstudoService.adicionarSemana(userId, planoId, semanaData)
    console.log('✅ Semana adicionada com sucesso:', resultado.id)
    revalidatePath('/plano-estudos')
    return { success: true, data: resultado }
  } catch (error) {
    console.error('Erro ao adicionar ciclo:', error)
    return {
      success: false,
      error: 'Erro ao adicionar ciclo. Tente novamente.'
    }
  }
}