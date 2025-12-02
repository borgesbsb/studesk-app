import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface VideoCacheDB extends DBSchema {
  videos: {
    key: string
    value: {
      id: string
      data: ArrayBuffer
      nome: string
      size: number
      timestamp: number
      materialId: string
      mimeType: string
      duracao?: number
    }
    indexes: {
      materialId: string
      timestamp: number
    }
  }
  metadata: {
    key: string
    value: {
      key: string
      totalSize: number
      lastCleanup: number
    }
  }
}

const DB_NAME = 'studesk-video-cache'
const DB_VERSION = 1
const STORE_NAME = 'videos'
const MAX_CACHE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB para vídeos

class VideoCacheService {
  private db: IDBPDatabase<VideoCacheDB> | null = null

  /**
   * Inicializa o banco de dados IndexedDB
   */
  private async initDB(): Promise<IDBPDatabase<VideoCacheDB>> {
    if (this.db) return this.db

    this.db = await openDB<VideoCacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Criar object store para vídeos
        if (!db.objectStoreNames.contains('videos')) {
          const videoStore = db.createObjectStore('videos', { keyPath: 'id' })
          videoStore.createIndex('materialId', 'materialId', { unique: false })
          videoStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Criar object store para metadados
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' })
        }
      },
    })

    return this.db
  }

  /**
   * Salva um vídeo no cache IndexedDB
   */
  async saveVideo(materialId: string, file: File, duracao?: number): Promise<void> {
    try {
      const db = await this.initDB()
      const arrayBuffer = await file.arrayBuffer()

      // Verificar limite de cache antes de salvar
      const currentSize = await this.getTotalCacheSize()
      if (currentSize + file.size > MAX_CACHE_SIZE) {
        console.warn('⚠️ Cache de vídeos cheio, limpando vídeos antigos...')
        await this.cleanOldestVideos(file.size)
      }

      const cacheEntry = {
        id: materialId,
        data: arrayBuffer,
        nome: file.name,
        size: file.size,
        timestamp: Date.now(),
        materialId: materialId,
        mimeType: file.type || 'video/mp4',
        duracao
      }

      await db.put('videos', cacheEntry)
      console.log(`✅ Vídeo salvo no cache: ${file.name} (${this.formatBytes(file.size)})`)

      // Atualizar metadados
      await this.updateMetadata()
    } catch (error) {
      console.error('❌ Erro ao salvar vídeo no cache:', error)
      throw error
    }
  }

  /**
   * Salva um vídeo a partir de um Blob
   */
  async saveVideoFromBlob(
    materialId: string,
    blob: Blob,
    nome: string,
    mimeType: string,
    duracao?: number
  ): Promise<void> {
    try {
      const db = await this.initDB()
      const arrayBuffer = await blob.arrayBuffer()

      const currentSize = await this.getTotalCacheSize()
      if (currentSize + blob.size > MAX_CACHE_SIZE) {
        console.warn('⚠️ Cache de vídeos cheio, limpando vídeos antigos...')
        await this.cleanOldestVideos(blob.size)
      }

      const cacheEntry = {
        id: materialId,
        data: arrayBuffer,
        nome: nome,
        size: blob.size,
        timestamp: Date.now(),
        materialId: materialId,
        mimeType: mimeType || 'video/mp4',
        duracao
      }

      await db.put('videos', cacheEntry)
      console.log(`✅ Vídeo salvo no cache: ${nome} (${this.formatBytes(blob.size)})`)

      await this.updateMetadata()
    } catch (error) {
      console.error('❌ Erro ao salvar vídeo no cache:', error)
      throw error
    }
  }

  /**
   * Recupera um vídeo do cache
   */
  async getVideo(materialId: string): Promise<{ blob: Blob; mimeType: string; nome: string } | null> {
    try {
      const db = await this.initDB()
      const cached = await db.get('videos', materialId)

      if (cached) {
        console.log(`📦 Vídeo carregado do cache: ${cached.nome} (${this.formatBytes(cached.size)})`)
        return {
          blob: new Blob([cached.data], { type: cached.mimeType }),
          mimeType: cached.mimeType,
          nome: cached.nome
        }
      }

      console.log(`⚠️ Vídeo não encontrado no cache: ${materialId}`)
      return null
    } catch (error) {
      console.error('❌ Erro ao recuperar vídeo do cache:', error)
      return null
    }
  }

  /**
   * Busca vídeo do cache ou do servidor
   */
  async getVideoWithFallback(
    materialId: string,
    serverUrl: string
  ): Promise<{ blob: Blob; mimeType: string; fromCache: boolean }> {
    // 1. Tentar cache primeiro
    const cached = await this.getVideo(materialId)
    if (cached) {
      return { blob: cached.blob, mimeType: cached.mimeType, fromCache: true }
    }

    // 2. Buscar do servidor
    console.log(`🌐 Baixando vídeo do servidor: ${serverUrl}`)
    try {
      const response = await fetch(serverUrl)
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const blob = await response.blob()
      const mimeType = response.headers.get('content-type') || 'video/mp4'

      // 3. Salvar no cache para próxima vez
      const fileName = serverUrl.split('/').pop() || 'video.mp4'
      await this.saveVideoFromBlob(materialId, blob, fileName, mimeType)

      return { blob, mimeType, fromCache: false }
    } catch (error) {
      console.error('❌ Erro ao baixar vídeo do servidor:', error)
      throw error
    }
  }

  /**
   * Remove um vídeo específico do cache
   */
  async removeVideo(materialId: string): Promise<void> {
    try {
      const db = await this.initDB()
      await db.delete('videos', materialId)
      console.log(`🗑️ Vídeo removido do cache: ${materialId}`)
      await this.updateMetadata()
    } catch (error) {
      console.error('❌ Erro ao remover vídeo do cache:', error)
      throw error
    }
  }

  /**
   * Limpa todo o cache
   */
  async clearCache(): Promise<void> {
    try {
      const db = await this.initDB()
      await db.clear('videos')
      await db.clear('metadata')
      console.log('🗑️ Cache de vídeos completamente limpo')
    } catch (error) {
      console.error('❌ Erro ao limpar cache de vídeos:', error)
      throw error
    }
  }

  /**
   * Lista todos os vídeos no cache
   */
  async listCachedVideos(): Promise<Array<{
    id: string
    nome: string
    size: number
    timestamp: number
    mimeType: string
    duracao?: number
  }>> {
    try {
      const db = await this.initDB()
      const allVideos = await db.getAll('videos')

      return allVideos.map(video => ({
        id: video.id,
        nome: video.nome,
        size: video.size,
        timestamp: video.timestamp,
        mimeType: video.mimeType,
        duracao: video.duracao
      }))
    } catch (error) {
      console.error('❌ Erro ao listar vídeos do cache:', error)
      return []
    }
  }

  /**
   * Obtém tamanho total do cache
   */
  async getTotalCacheSize(): Promise<number> {
    try {
      const videos = await this.listCachedVideos()
      return videos.reduce((total, video) => total + video.size, 0)
    } catch (error) {
      console.error('❌ Erro ao calcular tamanho do cache:', error)
      return 0
    }
  }

  /**
   * Limpa os vídeos mais antigos para liberar espaço
   */
  private async cleanOldestVideos(spaceNeeded: number): Promise<void> {
    try {
      const db = await this.initDB()
      const allVideos = await db.getAll('videos')

      // Ordenar por timestamp (mais antigo primeiro)
      allVideos.sort((a, b) => a.timestamp - b.timestamp)

      let freedSpace = 0
      for (const video of allVideos) {
        if (freedSpace >= spaceNeeded) break

        await db.delete('videos', video.id)
        freedSpace += video.size
        console.log(`🗑️ Vídeo antigo removido: ${video.nome} (${this.formatBytes(video.size)})`)
      }

      console.log(`✅ Espaço liberado: ${this.formatBytes(freedSpace)}`)
    } catch (error) {
      console.error('❌ Erro ao limpar vídeos antigos:', error)
    }
  }

  /**
   * Atualiza metadados do cache
   */
  private async updateMetadata(): Promise<void> {
    try {
      const db = await this.initDB()
      const totalSize = await this.getTotalCacheSize()

      await db.put('metadata', {
        key: 'stats',
        totalSize,
        lastCleanup: Date.now()
      })
    } catch (error) {
      console.error('❌ Erro ao atualizar metadados:', error)
    }
  }

  /**
   * Verifica se um vídeo está no cache
   */
  async hasVideo(materialId: string): Promise<boolean> {
    try {
      const db = await this.initDB()
      const video = await db.get('videos', materialId)
      return !!video
    } catch (error) {
      console.error('❌ Erro ao verificar vídeo no cache:', error)
      return false
    }
  }

  /**
   * Obtém estatísticas do cache
   */
  async getStats(): Promise<{
    totalVideos: number
    totalSize: number
    totalSizeFormatted: string
    maxSize: number
    maxSizeFormatted: string
    usagePercentage: number
  }> {
    const videos = await this.listCachedVideos()
    const totalSize = await this.getTotalCacheSize()

    return {
      totalVideos: videos.length,
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      maxSize: MAX_CACHE_SIZE,
      maxSizeFormatted: this.formatBytes(MAX_CACHE_SIZE),
      usagePercentage: (totalSize / MAX_CACHE_SIZE) * 100
    }
  }

  /**
   * Formata bytes para formato legível
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }
}

// Exportar instância singleton
export const videoCacheService = new VideoCacheService()
