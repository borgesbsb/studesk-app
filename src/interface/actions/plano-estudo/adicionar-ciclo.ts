'use server'

import { PlanoEstudoService } from '@/application/services/plano-estudo.service'
import { DisciplinaPlanejada } from '@/components/plano-estudos/planejamento-disciplinas'
import { revalidatePath } from 'next/cache'

export async function adicionarCicloAoPlano(
  planoId: string, 
  numeroSemana: number, 
  disciplinas: DisciplinaPlanejada[]
) {
  try {
    // Converter disciplinas para o formato esperado pelo service
    const semanaData = {
      numeroSemana,
      dataInicio: new Date(), // Você pode calcular as datas baseado no plano
      dataFim: new Date(),
      totalHoras: Math.round(disciplinas.reduce((total, d) => total + (d.horasPlanejadas || 0), 0)),
      disciplinas: disciplinas.map(d => ({
        disciplinaId: d.disciplinaId,
        horasPlanejadas: Math.round(d.horasPlanejadas || 0),
        tipoVeiculo: d.tipoVeiculo,
        materialNome: d.materialNome,
        questoesPlanejadas: d.questoesPlanejadas || 0,
        tempoVideoPlanejado: d.tempoVideoPlanejado || 0,
        parametro: d.parametro,
        diasEstudo: (d.diasEstudo || []).join(',')
      }))
    }

    const resultado = await PlanoEstudoService.adicionarSemana(planoId, semanaData)
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