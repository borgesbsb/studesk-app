"use server"

import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { type GabaritoProcessado } from "@/application/services/gabarito.service"

interface DisciplinaIntervalo {
  disciplinaId: string
  questaoInicio: number
  questaoFim: number
}

interface SalvarResultadoData {
  simuladoId: string
  resultado: GabaritoProcessado
  disciplinas: DisciplinaIntervalo[]
}

/**
 * Salva o resultado já processado de um simulado no banco de dados
 * (Não faz extração de IA, apenas persiste dados já calculados)
 */
export async function salvarResultadoSimulado(data: SalvarResultadoData) {
  try {
    const { userId } = await requireAuth()

    console.log("[SalvarResultado] Iniciando salvamento...")
    console.log("[SalvarResultado] Simulado ID:", data.simuladoId)
    console.log("[SalvarResultado] Total de questões:", data.resultado.questoes.length)
    console.log("[SalvarResultado] Disciplinas:", data.disciplinas.length)

    // Verificar se o simulado pertence ao usuário
    const simulado = await prisma.simulado.findFirst({
      where: {
        id: data.simuladoId,
        userId
      }
    })

    if (!simulado) {
      return {
        success: false,
        error: "Simulado não encontrado"
      }
    }

    // Processar cada disciplina
    for (const discIntervalo of data.disciplinas) {
      console.log(`[SalvarResultado] Processando disciplina ${discIntervalo.disciplinaId}...`)

      // Filtrar questões desta disciplina
      const questoesDaDisciplina = data.resultado.questoes.filter(
        q => q.numero >= discIntervalo.questaoInicio && q.numero <= discIntervalo.questaoFim
      )

      console.log(`[SalvarResultado]   Questões: ${questoesDaDisciplina.length}`)

      // Calcular estatísticas (para log)
      const totalQuestoes = questoesDaDisciplina.length
      const acertos = questoesDaDisciplina.filter(q => q.acertou === true).length
      const erros = questoesDaDisciplina.filter(q => q.acertou === false).length
      const naoRespondidas = questoesDaDisciplina.filter(q => q.acertou === null).length
      const percentualAcerto = totalQuestoes > 0 ? (acertos / totalQuestoes) * 100 : 0

      console.log(`[SalvarResultado]   Acertos: ${acertos}, Erros: ${erros}, Não respondidas: ${naoRespondidas}, ${percentualAcerto.toFixed(1)}%`)

      // Criar registro SimuladoDisciplina (apenas com intervalo de questões)
      const simuladoDisciplina = await prisma.simuladoDisciplina.create({
        data: {
          simuladoId: data.simuladoId,
          disciplinaId: discIntervalo.disciplinaId,
          questaoInicio: discIntervalo.questaoInicio,
          questaoFim: discIntervalo.questaoFim,
        }
      })

      console.log(`[SalvarResultado]   SimuladoDisciplina criado: ${simuladoDisciplina.id}`)

      // Criar registros QuestaoSimulado para cada questão
      for (const questao of questoesDaDisciplina) {
        await prisma.questaoSimulado.create({
          data: {
            simuladoId: data.simuladoId,
            simuladoDisciplinaId: simuladoDisciplina.id,
            ordem: questao.numero, // Número da questão
            enunciado: `Questão ${questao.numero}`, // Enunciado mínimo (não temos o texto real)
            alternativaA: "A",
            alternativaB: "B",
            alternativaC: "C",
            alternativaD: "D",
            alternativaE: "E",
            respostaCorreta: questao.respostaOficial,
            respostaUsuario: questao.respostaUsuario === 'N' ? null : questao.respostaUsuario,
            acertou: questao.acertou
          }
        })
      }

      console.log(`[SalvarResultado]   ${questoesDaDisciplina.length} questões salvas`)
    }

    // Calcular estatísticas gerais para o retorno
    const todasQuestoes = data.resultado.questoes
    const totalGeralAcertos = todasQuestoes.filter(q => q.acertou === true).length
    const totalGeralErros = todasQuestoes.filter(q => q.acertou === false).length
    const totalGeralNaoRespondidas = todasQuestoes.filter(q => q.acertou === null).length
    const percentualGeralAcerto = todasQuestoes.length > 0
      ? (totalGeralAcertos / todasQuestoes.length) * 100
      : 0

    // Marcar simulado como finalizado
    await prisma.simulado.update({
      where: { id: data.simuladoId },
      data: {
        status: 'finalizado'
      }
    })

    console.log("[SalvarResultado] ✅ Simulado salvo com sucesso!")
    console.log(`[SalvarResultado] Totais: ${totalGeralAcertos} acertos, ${totalGeralErros} erros, ${totalGeralNaoRespondidas} não respondidas`)
    console.log(`[SalvarResultado] Percentual: ${percentualGeralAcerto.toFixed(1)}%`)

    return {
      success: true,
      data: {
        totalQuestoes: todasQuestoes.length,
        acertos: totalGeralAcertos,
        erros: totalGeralErros,
        percentualAcerto: percentualGeralAcerto
      }
    }

  } catch (error) {
    console.error("[SalvarResultado] ❌ Erro:", error)

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido ao salvar simulado"
    }
  }
}
