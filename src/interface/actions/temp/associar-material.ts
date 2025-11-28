"use server"

import { prisma } from '@/lib/prisma'

export async function associarMaterialADisciplina() {
  try {
    // Verificar se a associação já existe
    const associacaoExistente = await prisma.disciplinaMaterial.findFirst({
      where: {
        disciplinaId: 'cmeaexhgn000jc9lgpxmnn6zk', // Administração Pública
        materialId: 'cmeafh2n2001ac9lgx4b2ic8s'   // MODELOS TEORICOS
      }
    })

    if (associacaoExistente) {
      return { success: true, message: 'Associação já existe', associacao: associacaoExistente }
    }

    // Criar nova associação
    const novaAssociacao = await prisma.disciplinaMaterial.create({
      data: {
        disciplinaId: 'cmeaexhgn000jc9lgpxmnn6zk', // Administração Pública  
        materialId: 'cmeafh2n2001ac9lgx4b2ic8s'   // MODELOS TEORICOS
      },
      include: {
        disciplina: {
          select: { nome: true }
        },
        material: {
          select: { nome: true }
        }
      }
    })

    return { 
      success: true, 
      message: 'Associação criada com sucesso', 
      associacao: novaAssociacao 
    }
  } catch (error) {
    console.error('Erro ao associar material à disciplina:', error)
    return { 
      success: false, 
      message: 'Erro ao criar associação', 
      error: error 
    }
  }
}