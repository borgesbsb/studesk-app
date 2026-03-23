"use server"

import { EditalService } from "@/application/services/edital.service"
import { requireAuth } from "@/lib/auth-helpers"

export async function deletarEdital(id: string) {
  try {
    const { userId } = await requireAuth()
    await EditalService.deletarEdital(userId, id)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
