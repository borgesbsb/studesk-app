"use server"

import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { GabaritoService } from "@/application/services/gabarito.service"

interface DisciplinaIntervalo {
  disciplinaId: string
  questaoInicio: number
  questaoFim: number
}

interface ProcessarSimuladoData {
  simuladoId: string
  gabaritoOficial: File
  gabaritoUsuario: File
  disciplinas: DisciplinaIntervalo[]
}

export async function processarSimulado(data: ProcessarSimuladoData) {
  try {
    const { userId } = await requireAuth()

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

    // TODO: Implementar upload dos arquivos para storage

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("[Processar] RECEBENDO ARQUIVOS NA ACTION:")
    console.log("[Processar] 1º Arquivo (OFICIAL):", data.gabaritoOficial.name, data.gabaritoOficial.type)
    console.log("[Processar] 2º Arquivo (USUÁRIO):", data.gabaritoUsuario.name, data.gabaritoUsuario.type)
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    // Inicializar serviço de gabarito
    const gabaritoService = new GabaritoService()

    // Processar gabaritos e criar disciplinas
    const disciplinasCriadas = []

    // OPÇÃO 1: Processar TODAS as disciplinas em uma única chamada (OTIMIZADO - usa menos tokens)
    // Se tiver muitas disciplinas e estourar rate limit, use OPÇÃO 2 abaixo
    const USE_BATCH_MODE = data.disciplinas.length > 1 // Se tiver mais de 1 disciplina, usar batch

    if (USE_BATCH_MODE) {
      console.log(`[Processar] Modo BATCH ativado - processando ${data.disciplinas.length} disciplinas em uma única chamada`)

      // Criar todas as SimuladoDisciplinas primeiro
      for (const discIntervalo of data.disciplinas) {
        const simuladoDisciplina = await prisma.simuladoDisciplina.create({
          data: {
            simuladoId: data.simuladoId,
            disciplinaId: discIntervalo.disciplinaId,
            questaoInicio: discIntervalo.questaoInicio,
            questaoFim: discIntervalo.questaoFim,
            limiteVermelho: 50.0,
            limiteAmarelo: 70.0
          }
        })
        disciplinasCriadas.push(simuladoDisciplina)
      }

      // Processar TODAS as disciplinas em batch
      try {
        const intervalos = data.disciplinas.map(d => ({
          questaoInicio: d.questaoInicio,
          questaoFim: d.questaoFim
        }))

        console.log('[Processar] Chamando IA em modo batch...')
        console.log('[Processar] ENVIANDO PARA SERVICE:')
        console.log('[Processar]   1º param (gabaritoOficial):', data.gabaritoOficial.name)
        console.log('[Processar]   2º param (gabaritoUsuario):', data.gabaritoUsuario.name)

        const resultado = await gabaritoService.processarGabaritosBatch(
          data.gabaritoOficial,   // ← OFICIAL (primeiro)
          data.gabaritoUsuario,   // ← USUÁRIO (segundo)
          intervalos
        )

        console.log(`[Processar] IA retornou ${resultado.questoes.length} questões no total`)

        // Distribuir questões entre as disciplinas
        for (let i = 0; i < data.disciplinas.length; i++) {
          const discIntervalo = data.disciplinas[i]
          const simuladoDisciplina = disciplinasCriadas[i]

          // Filtrar questões desse intervalo
          const questoesDisciplina = resultado.questoes.filter(
            q => q.numero >= discIntervalo.questaoInicio && q.numero <= discIntervalo.questaoFim
          )

          console.log(`[Processar] Inserindo ${questoesDisciplina.length} questões para disciplina ${discIntervalo.disciplinaId}`)

          // Criar questões no banco de dados
          for (const questao of questoesDisciplina) {
            await prisma.questaoSimulado.create({
              data: {
                simuladoId: data.simuladoId,
                simuladoDisciplinaId: simuladoDisciplina.id,
                enunciado: `Questão ${questao.numero}`,
                alternativaA: "A",
                alternativaB: "B",
                alternativaC: "C",
                alternativaD: "D",
                alternativaE: "E",
                respostaCorreta: questao.respostaOficial,
                respostaUsuario: questao.respostaUsuario === "N" ? null : questao.respostaUsuario,
                acertou: questao.respostaUsuario === "N" ? null : questao.acertou,
                nivel: "medio",
                ordem: questao.numero
              }
            })
          }
        }

        console.log(`[Processar] Todas as ${resultado.questoes.length} questões foram inseridas no banco`)

      } catch (error) {
        console.error('[Processar] Erro ao processar em modo batch:', error)
        throw new Error(`Erro ao processar gabaritos com IA: ${(error as Error).message}`)
      }

    } else {
      // OPÇÃO 2: Processar cada disciplina individualmente (com throttling)
      console.log(`[Processar] Modo INDIVIDUAL ativado`)
      const DELAY_BETWEEN_REQUESTS = 2000 // 2 segundos entre cada disciplina

      for (let i = 0; i < data.disciplinas.length; i++) {
        const discIntervalo = data.disciplinas[i]

        console.log(`[Processar] Processando disciplina ${i + 1}/${data.disciplinas.length}: ${discIntervalo.disciplinaId}`)
        console.log(`[Processar] Intervalo: ${discIntervalo.questaoInicio} até ${discIntervalo.questaoFim}`)

        // Criar SimuladoDisciplina
        const simuladoDisciplina = await prisma.simuladoDisciplina.create({
          data: {
            simuladoId: data.simuladoId,
            disciplinaId: discIntervalo.disciplinaId,
            questaoInicio: discIntervalo.questaoInicio,
            questaoFim: discIntervalo.questaoFim,
            limiteVermelho: 50.0,
            limiteAmarelo: 70.0
          }
        })

        disciplinasCriadas.push(simuladoDisciplina)

        // Processar gabaritos com IA (passando os arquivos diretamente)
        try {
          const resultado = await gabaritoService.processarGabaritos(
            data.gabaritoOficial,
            data.gabaritoUsuario,
            discIntervalo.questaoInicio,
            discIntervalo.questaoFim
          )

          console.log(`[Processar] IA retornou ${resultado.questoes.length} questões`)

          // Criar questões no banco de dados
          for (const questao of resultado.questoes) {
            await prisma.questaoSimulado.create({
              data: {
                simuladoId: data.simuladoId,
                simuladoDisciplinaId: simuladoDisciplina.id,
                enunciado: `Questão ${questao.numero}`,
                alternativaA: "A",
                alternativaB: "B",
                alternativaC: "C",
                alternativaD: "D",
                alternativaE: "E",
                respostaCorreta: questao.respostaOficial,
                respostaUsuario: questao.respostaUsuario === "N" ? null : questao.respostaUsuario,
                acertou: questao.respostaUsuario === "N" ? null : questao.acertou,
                nivel: "medio",
                ordem: questao.numero
              }
            })
          }

          console.log(`[Processar] ${resultado.questoes.length} questões inseridas no banco`)

          // Aguardar antes de processar a próxima disciplina (exceto na última)
          if (i < data.disciplinas.length - 1) {
            console.log(`[Processar] Aguardando ${DELAY_BETWEEN_REQUESTS}ms antes da próxima disciplina...`)
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS))
          }

        } catch (error) {
          console.error(`[Processar] Erro ao processar disciplina ${discIntervalo.disciplinaId}:`, error)
          throw new Error(`Erro ao processar gabaritos com IA: ${(error as Error).message}`)
        }
      }
    }

    // Atualizar status do simulado
    await prisma.simulado.update({
      where: { id: data.simuladoId },
      data: {
        status: "finalizado",
        // TODO: Salvar URLs dos gabaritos quando implementar upload
        // gabaritoOficialUrl: "...",
        // gabaritoUsuarioUrl: "..."
      }
    })

    return {
      success: true,
      message: `Simulado processado com sucesso! ${disciplinasCriadas.length} disciplinas criadas.`
    }
  } catch (error) {
    console.error("Erro ao processar simulado:", error)
    return {
      success: false,
      error: "Erro ao processar simulado: " + (error as Error).message
    }
  }
}
