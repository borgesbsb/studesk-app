import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

export interface ParametrosProcessamento {
  model: string
  temperature: number
  maxTokens: number
  tipoProcessamento: 'limpar' | 'topicos' | 'questoes'
}

export interface ChunkProcessado {
  id: string
  textoOriginal: string
  textoProcessado: string
  parametros: ParametrosProcessamento
  tokens: number
  createdAt: Date
}

export class ChunkCacheService {
  /**
   * Gera hash SHA256 do texto + parâmetros para identificar chunks únicos
   */
  private static gerarHash(texto: string, parametros: ParametrosProcessamento): string {
    const dadosParaHash = texto + JSON.stringify(parametros)
    return createHash('sha256').update(dadosParaHash, 'utf8').digest('hex')
  }

  /**
   * Verifica se um chunk já foi processado com os mesmos parâmetros
   */
  static async buscarChunkProcessado(
    texto: string, 
    parametros: ParametrosProcessamento
  ): Promise<ChunkProcessado | null> {
    try {
      const hash = this.gerarHash(texto, parametros)
      
      const chunk = await prisma.chunkCache.findUnique({
        where: { textHash: hash }
      })

      if (!chunk) return null

      return {
        id: chunk.id,
        textoOriginal: chunk.textoOriginal,
        textoProcessado: chunk.textoProcessado,
        parametros: JSON.parse(chunk.parametros) as ParametrosProcessamento,
        tokens: chunk.tokens,
        createdAt: chunk.createdAt
      }
    } catch (error) {
      console.error('Erro ao buscar chunk no cache:', error)
      return null
    }
  }

  /**
   * Salva um chunk processado no cache
   */
  static async salvarChunkProcessado(
    textoOriginal: string,
    textoProcessado: string,
    parametros: ParametrosProcessamento,
    tokens: number
  ): Promise<ChunkProcessado> {
    try {
      const hash = this.gerarHash(textoOriginal, parametros)
      
      const chunk = await prisma.chunkCache.create({
        data: {
          textHash: hash,
          textoOriginal,
          textoProcessado,
          parametros: JSON.stringify(parametros),
          tokens
        }
      })

      return {
        id: chunk.id,
        textoOriginal: chunk.textoOriginal,
        textoProcessado: chunk.textoProcessado,
        parametros: JSON.parse(chunk.parametros) as ParametrosProcessamento,
        tokens: chunk.tokens,
        createdAt: chunk.createdAt
      }
    } catch (error) {
      console.error('Erro ao salvar chunk no cache:', error)
      throw error
    }
  }

  /**
   * Busca chunks em lote para textos múltiplos
   */
  static async buscarChunksProcessados(
    textos: string[],
    parametros: ParametrosProcessamento
  ): Promise<Map<string, ChunkProcessado>> {
    try {
      const hashes = textos.map(texto => this.gerarHash(texto, parametros))
      
      const chunks = await prisma.chunkCache.findMany({
        where: {
          textHash: { in: hashes }
        }
      })

      const resultado = new Map<string, ChunkProcessado>()
      
      chunks.forEach(chunk => {
        resultado.set(chunk.textoOriginal, {
          id: chunk.id,
          textoOriginal: chunk.textoOriginal,
          textoProcessado: chunk.textoProcessado,
          parametros: JSON.parse(chunk.parametros) as ParametrosProcessamento,
          tokens: chunk.tokens,
          createdAt: chunk.createdAt
        })
      })

      return resultado
    } catch (error) {
      console.error('Erro ao buscar chunks em lote:', error)
      return new Map()
    }
  }

  /**
   * Salva múltiplos chunks processados
   */
  static async salvarChunksProcessados(
    chunks: Array<{
      textoOriginal: string
      textoProcessado: string
      parametros: ParametrosProcessamento
      tokens: number
    }>
  ): Promise<ChunkProcessado[]> {
    try {
      const dados = chunks.map(chunk => ({
        textHash: this.gerarHash(chunk.textoOriginal, chunk.parametros),
        textoOriginal: chunk.textoOriginal,
        textoProcessado: chunk.textoProcessado,
        parametros: JSON.stringify(chunk.parametros),
        tokens: chunk.tokens
      }))

      const chunksCriados = await prisma.chunkCache.createMany({
        data: dados,
        skipDuplicates: true // Evita erro se algum hash já existir
      })

      // Busca os chunks criados para retornar com IDs
      const hashes = dados.map(d => d.textHash)
      const chunksRetornados = await prisma.chunkCache.findMany({
        where: { textHash: { in: hashes } }
      })

      return chunksRetornados.map(chunk => ({
        id: chunk.id,
        textoOriginal: chunk.textoOriginal,
        textoProcessado: chunk.textoProcessado,
        parametros: JSON.parse(chunk.parametros) as ParametrosProcessamento,
        tokens: chunk.tokens,
        createdAt: chunk.createdAt
      }))
    } catch (error) {
      console.error('Erro ao salvar chunks em lote:', error)
      throw error
    }
  }

  /**
   * Estatísticas do cache (opcional para monitoramento)
   */
  static async estatisticasCache(): Promise<{
    totalChunks: number
    totalTokens: number
    espacoEmMB: number
  }> {
    try {
      const stats = await prisma.chunkCache.aggregate({
        _count: { id: true },
        _sum: { tokens: true }
      })

      // Estimativa de espaço baseada no tamanho médio dos textos
      const textos = await prisma.chunkCache.findMany({
        select: { textoOriginal: true, textoProcessado: true }
      })
      
      const espacoBytes = textos.reduce((total, chunk) => {
        return total + chunk.textoOriginal.length + chunk.textoProcessado.length
      }, 0)

      return {
        totalChunks: stats._count.id || 0,
        totalTokens: stats._sum.tokens || 0,
        espacoEmMB: parseFloat((espacoBytes / (1024 * 1024)).toFixed(2))
      }
    } catch (error) {
      console.error('Erro ao obter estatísticas do cache:', error)
      return { totalChunks: 0, totalTokens: 0, espacoEmMB: 0 }
    }
  }

  /**
   * Limpa chunks antigos para economizar espaço (opcional)
   */
  static async limparCacheAntigo(diasAntigos: number = 30): Promise<number> {
    try {
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() - diasAntigos)

      const chunksRemovidos = await prisma.chunkCache.deleteMany({
        where: {
          createdAt: {
            lt: dataLimite
          }
        }
      })

      return chunksRemovidos.count
    } catch (error) {
      console.error('Erro ao limpar cache antigo:', error)
      return 0
    }
  }
} 