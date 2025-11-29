'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// DEPRECATED: Adobe annotations removido do schema
// export async function saveAdobeAnnotations(materialId: string, annotations: any) {
//     try {
//         await prisma.materialEstudo.update({
//             where: { id: materialId },
//             data: {
//                 adobeAnnotations: annotations
//             }
//         })
//         revalidatePath(`/material/${materialId}/adobe`)
//         return { success: true }
//     } catch (error) {
//         console.error("Erro ao salvar anotações Adobe:", error)
//         return { success: false, error: "Erro ao salvar anotações" }
//     }
// }

// DEPRECATED: Adobe annotations removido do schema
// export async function getAdobeAnnotations(materialId: string) {
//     try {
//         const material = await prisma.materialEstudo.findUnique({
//             where: { id: materialId },
//             select: { adobeAnnotations: true }
//         })
//         return { success: true, data: material?.adobeAnnotations }
//     } catch (error) {
//         console.error("Erro ao buscar anotações Adobe:", error)
//         return { success: false, error: "Erro ao buscar anotações" }
//     }
// }
