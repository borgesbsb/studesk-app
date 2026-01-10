import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface MediaCacheDB extends DBSchema {
  pdfs: {
    key: string
    value: {
      id: string
      data: ArrayBuffer
      nome: string
      size: number
      timestamp: number
      materialId: string
    }
    indexes: {
      materialId: string
      timestamp: number
    }
  }
  videos: {
    key: string
    value: {
      id: string
      data: ArrayBuffer
      nome: string
      size: number
      timestamp: number
      materialId: string
      mimeType: string // video/mp4, video/webm, etc.
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

const DB_NAME = 'studesk-media-cache'
const DB_VERSION = 2 // Incrementado para incluir vídeos
const PDF_STORE_NAME = 'pdfs'
const VIDEO_STORE_NAME = 'videos'
const MAX_CACHE_SIZE = 1024 * 1024 * 1024 // 1GB (aumentado para comportar vídeos)

class MediaCacheService {
  private db: IDBPDatabase<MediaCacheDB> | null = null

  /**
   * Inicializa o banco de dados IndexedDB
   */
  private async initDB(): Promise<IDBPDatabase<MediaCacheDB>> {
    if (this.db) return this.db

    this.db = await openDB<MediaCacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Criar object store para PDFs
        if (!db.objectStoreNames.contains('pdfs')) {
          const pdfStore = db.createObjectStore('pdfs', { keyPath: 'id' })
          pdfStore.createIndex('materialId', 'materialId', { unique: false })
          pdfStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

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
   * Salva um PDF no cache IndexedDB
   */
  async savePdf(materialId: string, file: File): Promise<void> {
    try {
      const db = await this.initDB()
      const arrayBuffer = await file.arrayBuffer()

      // Verificar limite de cache antes de salvar
      const currentSize = await this.getTotalCacheSize()
      if (currentSize + file.size > MAX_CACHE_SIZE) {
        console.warn('⚠️ Cache cheio, limpando PDFs antigos...')
        await this.cleanOldestPdfs(file.size)
      }

      const cacheEntry = {
        id: materialId,
        data: arrayBuffer,
        nome: file.name,
        size: file.size,
        timestamp: Date.now(),
        materialId: materialId
      }

      await db.put('pdfs', cacheEntry)
      console.log(`✅ PDF salvo no cache: ${file.name} (${this.formatBytes(file.size)})`)

      // Atualizar metadados
      await this.updateMetadata()
    } catch (error) {
      console.error('❌ Erro ao salvar PDF no cache:', error)
      throw error
    }
  }

  /**
   * Salva um PDF a partir de um Blob
   */
  async savePdfFromBlob(materialId: string, blob: Blob, nome: string): Promise<void> {
    try {
      const db = await this.initDB()
      const arrayBuffer = await blob.arrayBuffer()

      const currentSize = await this.getTotalCacheSize()
      if (currentSize + blob.size > MAX_CACHE_SIZE) {
        console.warn('⚠️ Cache cheio, limpando PDFs antigos...')
        await this.cleanOldestPdfs(blob.size)
      }

      const cacheEntry = {
        id: materialId,
        data: arrayBuffer,
        nome: nome,
        size: blob.size,
        timestamp: Date.now(),
        materialId: materialId
      }

      await db.put('pdfs', cacheEntry)
      console.log(`✅ PDF salvo no cache: ${nome} (${this.formatBytes(blob.size)})`)

      await this.updateMetadata()
    } catch (error) {
      console.error('❌ Erro ao salvar PDF no cache:', error)
      throw error
    }
  }

  /**
   * Recupera um PDF do cache
   */
  async getPdf(materialId: string): Promise<Blob | null> {
    try {
      const db = await this.initDB()
      const cached = await db.get('pdfs', materialId)

      if (cached) {
        console.log(`📦 PDF carregado do cache: ${cached.nome} (${this.formatBytes(cached.size)})`)
        return new Blob([cached.data], { type: 'application/pdf' })
      }

      console.log(`⚠️ PDF não encontrado no cache: ${materialId}`)
      return null
    } catch (error) {
      console.error('❌ Erro ao recuperar PDF do cache:', error)
      return null
    }
  }

  /**
   * Busca PDF do cache ou do servidor
   */
  async getPdfWithFallback(materialId: string, serverUrl: string): Promise<{ blob: Blob, fromCache: boolean }> {
    // 1. Tentar cache primeiro
    const cached = await this.getPdf(materialId)
    if (cached) {
      return { blob: cached, fromCache: true }
    }

    // 2. Buscar do servidor
    console.log(`🌐 Baixando PDF do servidor: ${serverUrl}`)
    try {
      const response = await fetch(serverUrl)
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const blob = await response.blob()

      // 3. Salvar no cache para próxima vez
      const fileName = serverUrl.split('/').pop() || 'documento.pdf'
      await this.savePdfFromBlob(materialId, blob, fileName)

      return { blob, fromCache: false }
    } catch (error) {
      console.error('❌ Erro ao baixar PDF do servidor:', error)
      throw error
    }
  }

  /**
   * Remove um PDF específico do cache
   */
  async removePdf(materialId: string): Promise<void> {
    try {
      const db = await this.initDB()
      await db.delete('pdfs', materialId)
      console.log(`🗑️ PDF removido do cache: ${materialId}`)
      await this.updateMetadata()
    } catch (error) {
      console.error('❌ Erro ao remover PDF do cache:', error)
      throw error
    }
  }

  /**
   * Limpa todo o cache (PDFs e vídeos)
   */
  async clearCache(): Promise<void> {
    try {
      const db = await this.initDB()
      await db.clear('pdfs')
      await db.clear('videos')
      await db.clear('metadata')
      console.log('🗑️ Cache completamente limpo')
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error)
      throw error
    }
  }

  /**
   * Lista todos os PDFs no cache
   */
  async listCachedPdfs(): Promise<Array<{
    id: string
    nome: string
    size: number
    timestamp: number
  }>> {
    try {
      const db = await this.initDB()
      const allPdfs = await db.getAll('pdfs')

      return allPdfs.map(pdf => ({
        id: pdf.id,
        nome: pdf.nome,
        size: pdf.size,
        timestamp: pdf.timestamp
      }))
    } catch (error) {
      console.error('❌ Erro ao listar PDFs do cache:', error)
      return []
    }
  }

  /**
   * Obtém tamanho total do cache (PDFs + Vídeos)
   */
  async getTotalCacheSize(): Promise<number> {
    try {
      const pdfs = await this.listCachedPdfs()
      const videos = await this.listCachedVideos()
      const pdfSize = pdfs.reduce((total, pdf) => total + pdf.size, 0)
      const videoSize = videos.reduce((total, video) => total + video.size, 0)
      return pdfSize + videoSize
    } catch (error) {
      console.error('❌ Erro ao calcular tamanho do cache:', error)
      return 0
    }
  }

  // ============================================
  // MÉTODOS DE CACHE DE VÍDEOS
  // ============================================

  /**
   * Salva um vídeo no cache IndexedDB
   */
  async saveVideo(materialId: string, file: File): Promise<void> {
    try {
      const db = await this.initDB()
      const arrayBuffer = await file.arrayBuffer()

      // Verificar limite de cache antes de salvar
      const currentSize = await this.getTotalCacheSize()
      if (currentSize + file.size > MAX_CACHE_SIZE) {
        console.warn('⚠️ Cache cheio, limpando arquivos antigos...')
        await this.cleanOldestMedia(file.size)
      }

      const cacheEntry = {
        id: materialId,
        data: arrayBuffer,
        nome: file.name,
        size: file.size,
        timestamp: Date.now(),
        materialId: materialId,
        mimeType: file.type || 'video/mp4'
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
  async saveVideoFromBlob(materialId: string, blob: Blob, nome: string, mimeType?: string): Promise<void> {
    try {
      const db = await this.initDB()
      const arrayBuffer = await blob.arrayBuffer()

      const currentSize = await this.getTotalCacheSize()
      if (currentSize + blob.size > MAX_CACHE_SIZE) {
        console.warn('⚠️ Cache cheio, limpando arquivos antigos...')
        await this.cleanOldestMedia(blob.size)
      }

      const cacheEntry = {
        id: materialId,
        data: arrayBuffer,
        nome: nome,
        size: blob.size,
        timestamp: Date.now(),
        materialId: materialId,
        mimeType: mimeType || blob.type || 'video/mp4'
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
  async getVideo(materialId: string): Promise<Blob | null> {
    try {
      const db = await this.initDB()
      const cached = await db.get('videos', materialId)

      if (cached) {
        console.log(`📦 Vídeo carregado do cache: ${cached.nome} (${this.formatBytes(cached.size)})`)
        return new Blob([cached.data], { type: cached.mimeType })
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
  async getVideoWithFallback(materialId: string, serverUrl: string): Promise<{ blob: Blob, fromCache: boolean }> {
    // 1. Tentar cache primeiro
    const cached = await this.getVideo(materialId)
    if (cached) {
      return { blob: cached, fromCache: true }
    }

    // 2. Buscar do servidor
    console.log(`🌐 Baixando vídeo do servidor: ${serverUrl}`)
    try {
      const response = await fetch(serverUrl)
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const blob = await response.blob()
      const contentType = response.headers.get('content-type') || 'video/mp4'

      // 3. Salvar no cache para próxima vez
      const fileName = serverUrl.split('/').pop() || 'video.mp4'
      await this.saveVideoFromBlob(materialId, blob, fileName, contentType)

      return { blob, fromCache: false }
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
   * Lista todos os vídeos no cache
   */
  async listCachedVideos(): Promise<Array<{
    id: string
    nome: string
    size: number
    timestamp: number
    mimeType: string
  }>> {
    try {
      const db = await this.initDB()
      const allVideos = await db.getAll('videos')

      return allVideos.map(video => ({
        id: video.id,
        nome: video.nome,
        size: video.size,
        timestamp: video.timestamp,
        mimeType: video.mimeType
      }))
    } catch (error) {
      console.error('❌ Erro ao listar vídeos do cache:', error)
      return []
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
   * Limpa os PDFs mais antigos para liberar espaço (mantido para compatibilidade)
   */
  private async cleanOldestPdfs(spaceNeeded: number): Promise<void> {
    return this.cleanOldestMedia(spaceNeeded)
  }

  /**
   * Limpa os arquivos (PDFs e vídeos) mais antigos para liberar espaço
   */
  private async cleanOldestMedia(spaceNeeded: number): Promise<void> {
    try {
      const db = await this.initDB()
      const allPdfs = await db.getAll('pdfs')
      const allVideos = await db.getAll('videos')

      // Combinar PDFs e vídeos em uma única lista
      const allMedia = [
        ...allPdfs.map(pdf => ({ ...pdf, type: 'pdf' as const })),
        ...allVideos.map(video => ({ ...video, type: 'video' as const }))
      ]

      // Ordenar por timestamp (mais antigo primeiro)
      allMedia.sort((a, b) => a.timestamp - b.timestamp)

      let freedSpace = 0
      for (const media of allMedia) {
        if (freedSpace >= spaceNeeded) break

        if (media.type === 'pdf') {
          await db.delete('pdfs', media.id)
          console.log(`🗑️ PDF antigo removido: ${media.nome} (${this.formatBytes(media.size)})`)
        } else {
          await db.delete('videos', media.id)
          console.log(`🗑️ Vídeo antigo removido: ${media.nome} (${this.formatBytes(media.size)})`)
        }

        freedSpace += media.size
      }

      console.log(`✅ Espaço liberado: ${this.formatBytes(freedSpace)}`)
    } catch (error) {
      console.error('❌ Erro ao limpar arquivos antigos:', error)
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
   * Verifica se um PDF está no cache
   */
  async hasPdf(materialId: string): Promise<boolean> {
    try {
      const db = await this.initDB()
      const pdf = await db.get('pdfs', materialId)
      return !!pdf
    } catch (error) {
      console.error('❌ Erro ao verificar PDF no cache:', error)
      return false
    }
  }

  /**
   * Obtém estatísticas do cache (PDFs + Vídeos)
   */
  async getStats(): Promise<{
    totalPdfs: number
    totalVideos: number
    totalFiles: number
    totalSize: number
    totalSizeFormatted: string
    maxSize: number
    maxSizeFormatted: string
    usagePercentage: number
  }> {
    const pdfs = await this.listCachedPdfs()
    const videos = await this.listCachedVideos()
    const totalSize = await this.getTotalCacheSize()

    return {
      totalPdfs: pdfs.length,
      totalVideos: videos.length,
      totalFiles: pdfs.length + videos.length,
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
export const mediaCacheService = new MediaCacheService()

// Manter compatibilidade com código antigo
export const pdfCacheService = mediaCacheService
