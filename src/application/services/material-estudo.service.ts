import { prisma } from "@/lib/db"
import { MaterialEstudo, CreateMaterialEstudoDTO, UpdateMaterialEstudoDTO } from "@/domain/entities/MaterialEstudo"
import { logError, formatPrismaError } from "@/lib/error-handler"
import { PdfBackgroundProcessorService } from "./pdf-background-processor.service"

export class MaterialEstudoService {
  static async criarMaterialEstudo(userId: string, data: CreateMaterialEstudoDTO) {
    try {
      const { disciplinaIds, ...materialData } = data

      const material = await prisma.materialEstudo.create({
        data: {
          ...materialData,
          userId,
          disciplinas: {
            create: disciplinaIds.map(disciplinaId => ({
              disciplinaId
            }))
          }
        },
        include: {
          disciplinas: {
            include: {
              disciplina: true
            }
          }
        }
      })

      // Se for PDF, iniciar processamento em background automaticamente
      if (material.tipo === 'PDF' && material.arquivoPdfUrl) {
        console.log(`🚀 Material PDF criado (${material.id}), iniciando processamento em background...`)

        // Chamar serviço diretamente (não aguarda conclusão)
        const processor = new PdfBackgroundProcessorService()
        processor.processFullPdf(material.id).catch((error) => {
          console.error('❌ Erro ao processar PDF em background:', error)
        })
      }

      return material
    } catch (error) {
      const errorLog = logError(error, 'criarMaterialEstudo')
      throw new Error(formatPrismaError(error))
    }
  }

  static async listarMateriaisEstudo(userId: string): Promise<MaterialEstudo[]> {
    try {
      return await prisma.materialEstudo.findMany({
        where: { userId },
        orderBy: { nome: "asc" },
        include: {
          disciplinas: {
            include: {
              disciplina: true
            }
          }
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'listarMateriaisEstudo')
      throw new Error(formatPrismaError(error))
    }
  }

  static async buscarMaterialEstudoPorId(userId: string, id: string): Promise<MaterialEstudo | null> {
    try {
      return await prisma.materialEstudo.findUnique({
        where: {
          id,
          userId
        },
        include: {
          disciplinas: {
            include: {
              disciplina: true
            }
          }
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'buscarMaterialEstudoPorId')
      throw new Error(formatPrismaError(error))
    }
  }

  static async listarMateriaisPorDisciplina(userId: string, disciplinaId: string): Promise<MaterialEstudo[]> {
    try {
      return await prisma.materialEstudo.findMany({
        where: {
          userId,
          disciplinas: {
            some: {
              disciplinaId
            }
          }
        },
        orderBy: { nome: "asc" },
        include: {
          disciplinas: {
            include: {
              disciplina: true
            }
          }
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'listarMateriaisPorDisciplina')
      throw new Error(formatPrismaError(error))
    }
  }

  static async atualizarMaterialEstudo(userId: string, id: string, data: UpdateMaterialEstudoDTO) {
    try {
      // Primeiro verifica se o material pertence ao usuário
      const material = await prisma.materialEstudo.findUnique({
        where: { id, userId }
      })

      if (!material) {
        throw new Error('Material não encontrado ou sem permissão')
      }

      const { disciplinaIds, ...materialData } = data

      // Se houver disciplinaIds, atualiza as relações
      if (disciplinaIds) {
        // Primeiro, remove todas as relações existentes
        await prisma.disciplinaMaterial.deleteMany({
          where: { materialId: id }
        })

        // Depois, cria as novas relações
        await prisma.disciplinaMaterial.createMany({
          data: disciplinaIds.map(disciplinaId => ({
            materialId: id,
            disciplinaId
          }))
        })
      }

      // Atualiza os dados do material
      return await prisma.materialEstudo.update({
        where: { id },
        data: materialData,
        include: {
          disciplinas: {
            include: {
              disciplina: true
            }
          }
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'atualizarMaterialEstudo')
      throw new Error(formatPrismaError(error))
    }
  }

  static async deletarMaterialEstudo(userId: string, id: string) {
    try {
      console.log('🗑️ Iniciando deleção do material:', id)

      // Verificar se o material existe e pertence ao usuário
      const material = await prisma.materialEstudo.findUnique({
        where: { id, userId },
        include: {
          disciplinas: true,
          historicoLeitura: true,
          anotacoes: true
        }
      })

      if (!material) {
        throw new Error('Material não encontrado ou sem permissão')
      }

      console.log('📊 Relações encontradas:', {
        disciplinas: material.disciplinas.length,
        historicoLeitura: material.historicoLeitura.length,
        anotacoes: material.anotacoes.length
      })

      // Remover relações que não têm cascade
      await prisma.disciplinaMaterial.deleteMany({
        where: { materialId: id }
      })

      console.log('✅ Relações removidas, deletando material...')

      // Deletar o material (as outras relações serão deletadas automaticamente por cascade)
      const materialDeletado = await prisma.materialEstudo.delete({
        where: { id }
      })

      console.log('✅ Material deletado com sucesso:', materialDeletado.nome)

      return materialDeletado
    } catch (error) {
      console.error('❌ Erro ao deletar material:', error)
      const errorLog = logError(error, 'deletarMaterialEstudo')
      throw new Error(formatPrismaError(error))
    }
  }

  // Métodos específicos para o relacionamento many-to-many
  static async adicionarMaterialADisciplina(disciplinaId: string, materialId: string) {
    try {
      return await prisma.disciplinaMaterial.create({
        data: {
          disciplinaId,
          materialId
        },
        include: {
          disciplina: true,
          material: true
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'adicionarMaterialADisciplina')
      throw new Error(formatPrismaError(error))
    }
  }

  static async removerMaterialDaDisciplina(disciplinaId: string, materialId: string) {
    try {
      return await prisma.disciplinaMaterial.delete({
        where: {
          disciplinaId_materialId: {
            disciplinaId,
            materialId
          }
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'removerMaterialDaDisciplina')
      throw new Error(formatPrismaError(error))
    }
  }

  static async listarMateriaisDaDisciplina(userId: string, disciplinaId: string) {
    try {
      return await prisma.disciplinaMaterial.findMany({
        where: {
          disciplinaId,
          disciplina: {
            userId
          }
        },
        include: {
          material: true
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    } catch (error) {
      const errorLog = logError(error, 'listarMateriaisDaDisciplina')
      throw new Error(formatPrismaError(error))
    }
  }

  static async atualizarProgressoLeitura(userId: string, id: string, paginasLidas: number) {
    try {
      console.log('📝 Service - Atualizando progresso:', { id, paginasLidas })

      // Primeiro verifica se o material existe e pertence ao usuário
      const materialExistente = await prisma.materialEstudo.findUnique({
        where: { id, userId },
        select: {
          id: true,
          totalPaginas: true,
          paginasLidas: true
        }
      })

      if (!materialExistente) {
        console.log('❌ Service - Material não encontrado ou sem permissão:', id)
        throw new Error('Material não encontrado ou sem permissão')
      }

      console.log('📚 Service - Material existente:', materialExistente)

      // Valida o número de páginas lidas
      if (paginasLidas < 0) {
        console.log('❌ Service - Páginas lidas inválidas:', paginasLidas)
        throw new Error('O número de páginas lidas não pode ser negativo')
      }

      if (paginasLidas > materialExistente.totalPaginas) {
        console.log('❌ Service - Páginas lidas maior que total:', { paginasLidas, total: materialExistente.totalPaginas })
        throw new Error('O número de páginas lidas não pode ser maior que o total de páginas')
      }

      // Atualiza o progresso
      const materialAtualizado = await prisma.materialEstudo.update({
        where: { id },
        data: { paginasLidas }
      })

      console.log('✅ Service - Material atualizado:', materialAtualizado)

      return materialAtualizado
    } catch (error) {
      console.error('❌ Service - Erro ao atualizar progresso:', error)
      const errorLog = logError(error, 'atualizarProgressoLeitura')
      throw error instanceof Error ? error : new Error(formatPrismaError(error))
    }
  }
} 