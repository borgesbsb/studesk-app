import { google } from 'googleapis'
import { Readable } from 'stream'

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  thumbnailLink?: string
  createdTime: string
  modifiedTime: string
  isFolder?: boolean
  parents?: string[]
}

export class GoogleDriveService {
  private drive

  constructor(accessToken: string, refreshToken?: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    this.drive = google.drive({ version: 'v3', auth: oauth2Client })
  }

  /**
   * Listar arquivos e pastas dentro de uma pasta específica
   * @param folderId - ID da pasta (null ou 'root' para raiz)
   */
  async listFilesAndFolders(folderId?: string | null): Promise<DriveFile[]> {
    try {
      // Construir query
      let query = "trashed=false"

      if (folderId && folderId !== 'root') {
        query += ` and '${folderId}' in parents`
      } else if (!folderId || folderId === 'root') {
        query += " and 'root' in parents"
      }

      // Buscar pastas, PDFs e vídeos
      query += " and (mimeType='application/vnd.google-apps.folder' or mimeType='application/pdf' or mimeType contains 'video/')"

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, size, thumbnailLink, createdTime, modifiedTime, parents)',
        pageSize: 1000,
        orderBy: 'folder,name',
      })

      const files = (response.data.files || []).map((file: any) => ({
        ...file,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder',
        size: file.size || '0',
      }))

      return files as DriveFile[]
    } catch (error) {
      console.error('Erro ao listar arquivos do Drive:', error)
      throw new Error('Falha ao listar arquivos do Google Drive')
    }
  }

  /**
   * Listar PDFs do Google Drive do usuário (método legado - mantido para compatibilidade)
   */
  async listPdfFiles(): Promise<DriveFile[]> {
    try {
      const response = await this.drive.files.list({
        q: "mimeType='application/pdf' and trashed=false",
        fields: 'files(id, name, mimeType, size, thumbnailLink, createdTime, modifiedTime)',
        pageSize: 100,
        orderBy: 'modifiedTime desc',
      })

      return (response.data.files || []) as DriveFile[]
    } catch (error) {
      console.error('Erro ao listar arquivos do Drive:', error)
      throw new Error('Falha ao listar arquivos do Google Drive')
    }
  }

  /**
   * Obter informações de uma pasta específica
   */
  async getFolderInfo(folderId: string): Promise<DriveFile> {
    try {
      const response = await this.drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType, parents',
      })

      return {
        ...response.data,
        isFolder: response.data.mimeType === 'application/vnd.google-apps.folder',
      } as DriveFile
    } catch (error) {
      console.error('Erro ao buscar informações da pasta:', error)
      throw new Error('Falha ao buscar informações da pasta')
    }
  }

  /**
   * Obter metadados de um arquivo específico
   */
  async getFileMetadata(fileId: string): Promise<DriveFile> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, thumbnailLink, createdTime, modifiedTime',
      })

      return response.data as DriveFile
    } catch (error) {
      console.error('Erro ao buscar metadados do arquivo:', error)
      throw new Error('Falha ao buscar informações do arquivo')
    }
  }

  /**
   * Baixar PDF como stream (para salvar localmente)
   */
  async downloadPdfStream(fileId: string): Promise<Readable> {
    try {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      )

      return response.data as Readable
    } catch (error) {
      console.error('Erro ao baixar arquivo do Drive:', error)
      throw new Error('Falha ao baixar arquivo do Google Drive')
    }
  }

  /**
   * Baixar PDF como buffer (para salvar diretamente)
   */
  async downloadPdfBuffer(fileId: string): Promise<Buffer> {
    try {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      )

      return Buffer.from(response.data as ArrayBuffer)
    } catch (error) {
      console.error('Erro ao baixar arquivo do Drive:', error)
      throw new Error('Falha ao baixar arquivo do Google Drive')
    }
  }
}
