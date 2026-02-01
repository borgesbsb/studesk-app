'use server'

import { GabaritoService, type IntervaloQuestao, type GabaritoExtraido } from '@/application/services/gabarito.service'
import { z } from 'zod'

const extrairGabaritosSchema = z.object({
  gabaritoOficial: z.instanceof(File),
  gabaritoUsuario: z.instanceof(File),
  intervalos: z.array(z.object({
    questaoInicio: z.number(),
    questaoFim: z.number()
  }))
})

/**
 * Extrai APENAS o gabarito oficial - usuário preencherá manualmente
 */
export async function extrairGabaritoOficialAction(formData: FormData) {
  console.log('[Action] extrairGabaritoOficialAction iniciada')

  try {
    const gabaritoOficial = formData.get('gabaritoOficial') as File
    const intervalosJson = formData.get('intervalos') as string

    if (!gabaritoOficial || !intervalosJson) {
      throw new Error('Gabarito oficial ou intervalos não fornecidos')
    }

    const intervalos: IntervaloQuestao[] = JSON.parse(intervalosJson)

    console.log('[Action] Arquivo recebido:', gabaritoOficial.name)
    console.log('[Action] Intervalos:', intervalos)

    const gabaritoService = new GabaritoService()

    // Extrair apenas o gabarito oficial
    const gabaritoOficialExtraido = await gabaritoService.extrairGabaritoOficial(
      gabaritoOficial,
      intervalos
    )

    // Criar gabarito do usuário vazio (todas respostas "N" - não marcado)
    const gabaritoUsuarioVazio: GabaritoExtraido = {
      questoes: []
    }

    for (const intervalo of intervalos) {
      for (let num = intervalo.questaoInicio; num <= intervalo.questaoFim; num++) {
        gabaritoUsuarioVazio.questoes.push({
          numero: num,
          resposta: 'N'  // Não marcado - usuário preencherá manualmente
        })
      }
    }

    console.log('[Action] ✅ Extração concluída')
    console.log('[Action] Oficial:', gabaritoOficialExtraido.questoes.length, 'questões')
    console.log('[Action] Usuário:', gabaritoUsuarioVazio.questoes.length, 'questões (vazias)')

    return {
      success: true,
      data: {
        oficial: gabaritoOficialExtraido,
        usuario: gabaritoUsuarioVazio
      }
    }

  } catch (error) {
    console.error('[Action] ❌ Erro:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao extrair gabarito oficial'
    }
  }
}

/**
 * Extrai gabaritos SEM comparar - para permitir edição pelo usuário
 */
export async function extrairGabaritosAction(formData: FormData) {
  console.log('[Action] extrairGabaritosAction iniciada')

  try {
    const gabaritoOficial = formData.get('gabaritoOficial') as File
    const gabaritoUsuario = formData.get('gabaritoUsuario') as File
    const intervalosJson = formData.get('intervalos') as string

    if (!gabaritoOficial || !gabaritoUsuario || !intervalosJson) {
      throw new Error('Arquivos ou intervalos não fornecidos')
    }

    const intervalos: IntervaloQuestao[] = JSON.parse(intervalosJson)

    console.log('[Action] Arquivos recebidos:')
    console.log('[Action]   Oficial:', gabaritoOficial.name)
    console.log('[Action]   Usuário:', gabaritoUsuario.name)
    console.log('[Action] Intervalos:', intervalos)

    const gabaritoService = new GabaritoService()

    const resultado = await gabaritoService.extrairGabaritosSemComparar(
      gabaritoOficial,
      gabaritoUsuario,
      intervalos
    )

    console.log('[Action] ✅ Extração concluída')
    console.log('[Action] Oficial:', resultado.oficial.questoes.length, 'questões')
    console.log('[Action] Usuário:', resultado.usuario.questoes.length, 'questões')

    return {
      success: true,
      data: resultado
    }

  } catch (error) {
    console.error('[Action] ❌ Erro:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao extrair gabaritos'
    }
  }
}

/**
 * Processa gabaritos já editados pelo usuário
 */
export async function processarGabaritosEditadosAction(
  oficial: GabaritoExtraido,
  usuario: GabaritoExtraido
) {
  console.log('[Action] processarGabaritosEditadosAction iniciada')

  try {
    const gabaritoService = new GabaritoService()

    const resultado = await gabaritoService.processarGabaritosEditados(oficial, usuario)

    console.log('[Action] ✅ Processamento concluído')
    console.log('[Action] Total questões:', resultado.questoes.length)

    return {
      success: true,
      data: resultado
    }

  } catch (error) {
    console.error('[Action] ❌ Erro:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao processar gabaritos'
    }
  }
}
