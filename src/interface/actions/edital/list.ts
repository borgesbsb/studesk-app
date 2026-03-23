"use server"

import { EditalService } from "@/application/services/edital.service"
import { requireAuth } from "@/lib/auth-helpers"

export async function listarEditais() {
  try {
    await requireAuth()
    const editais = await EditalService.listarEditais()
    return { success: true, data: editais }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function buscarEditalPorId(id: string) {
  try {
    await requireAuth()
    const edital = await EditalService.buscarEditalPorId(id)
    return { success: true, data: edital }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
