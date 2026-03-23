"use server"

import { EditalService } from "@/application/services/edital.service"
import { requireAuth } from "@/lib/auth-helpers"

export async function adicionarDisciplinaAoEdital(editalId: string, disciplinaId: string) {
  try {
    const { userId } = await requireAuth()
    const resultado = await EditalService.adicionarDisciplina(userId, editalId, disciplinaId)
    return { success: true, data: resultado }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function removerDisciplinaDoEdital(editalId: string, disciplinaId: string) {
  try {
    const { userId } = await requireAuth()
    await EditalService.removerDisciplina(userId, editalId, disciplinaId)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
