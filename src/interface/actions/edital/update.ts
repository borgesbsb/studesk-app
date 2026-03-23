"use server"

import { EditalService } from "@/application/services/edital.service"
import { requireAuth } from "@/lib/auth-helpers"

export interface UpdateEditalData {
  nome?: string
  descricao?: string
  orgao?: string
  cargo?: string
  ano?: number
  link?: string
}

export async function atualizarEdital(id: string, data: UpdateEditalData) {
  try {
    const { userId } = await requireAuth()
    const edital = await EditalService.atualizarEdital(userId, id, data)
    return { success: true, data: edital }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
