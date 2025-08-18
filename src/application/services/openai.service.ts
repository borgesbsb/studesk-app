import { prisma } from "@/lib/db"

export interface OpenAIConfigInput {
  model?: string
  temperature?: number
  maxTokens?: number
  apiKey?: string
}

export class OpenAIService {
  static async getConfig() {
    try {
      const config = await prisma.openAIConfig.findFirst()
      
      if (!config) {
        return await prisma.openAIConfig.create({
          data: {
            model: "gpt-4-turbo-preview",
            temperature: 0.7,
            maxTokens: 2000
          }
        })
      }
      
      return config
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      throw error
    }
  }

  static async updateConfig(data: OpenAIConfigInput) {
    try {
      const config = await this.getConfig()
      return await prisma.openAIConfig.update({
        where: { id: config.id },
        data
      })
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      throw error
    }
  }
} 