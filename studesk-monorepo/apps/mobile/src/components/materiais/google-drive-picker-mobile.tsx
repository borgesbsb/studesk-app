"use client"

import { useState, useEffect } from "react"
import { getApiBaseUrl } from "@/lib/api-base-url"

interface DriveFile {
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

interface BreadcrumbItem {
  id: string
  name: string
}

interface GoogleDrivePickerMobileProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileImported: () => void
  disciplinaId: string
}

export function GoogleDrivePickerMobile({
  open,
  onOpenChange,
  onFileImported,
  disciplinaId
}: GoogleDrivePickerMobileProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [files, setFiles] = useState<DriveFile[]>([])
  const [filteredFiles, setFilteredFiles] = useState<DriveFile[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: 'root', name: 'Meu Drive' }])

  // API URL do backend web - detectado dinamicamente
  const API_URL = getApiBaseUrl()

  useEffect(() => {
    if (open) {
      setIsCheckingConnection(true)
      checkConnection()
    }
  }, [open])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredFiles(files)
    } else {
      const filtered = files.filter(file =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredFiles(filtered)
    }
  }, [searchTerm, files])

  const loadFiles = async (folderId: string | null = null) => {
    try {
      setIsLoadingFiles(true)
      const url = folderId
        ? `${API_URL}/google-drive/files?folderId=${folderId}`
        : `${API_URL}/google-drive/files`

      const response = await fetch(url, {
        credentials: 'include', // Importante para enviar cookies de sessão
      })

      if (response.ok) {
        const data = await response.json()
        setIsConnected(true)
        setFiles(data.files || [])
        setFilteredFiles(data.files || [])
        setCurrentFolderId(folderId)
      } else if (response.status === 401) {
        setIsConnected(false)
      }
    } catch (error) {
      console.error('Erro ao carregar arquivos:', error)
      alert('Erro ao carregar arquivos do Google Drive')
      setIsConnected(false)
    } finally {
      setIsLoadingFiles(false)
      setIsCheckingConnection(false)
    }
  }

  const checkConnection = async () => {
    await loadFiles(null)
  }

  const handleConnect = async () => {
    setIsConnecting(true)

    try {
      const response = await fetch(`${API_URL}/google-drive/auth`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!data.authUrl) {
        throw new Error('URL de autenticação não recebida')
      }

      // No mobile PWA, podemos redirecionar ou abrir em nova aba
      const width = Math.min(600, window.innerWidth - 40)
      const height = Math.min(700, window.innerHeight - 100)
      const left = (window.screen.width - width) / 2
      const top = (window.screen.height - height) / 2

      const authWindow = window.open(
        data.authUrl,
        'Google Drive Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      const messageHandler = async (event: MessageEvent) => {
        if (event.data.type === 'GOOGLE_DRIVE_AUTH_SUCCESS') {
          window.removeEventListener('message', messageHandler)
          alert('Google Drive conectado com sucesso!')
          setIsConnected(true)
          await checkConnection()
        } else if (event.data.type === 'GOOGLE_DRIVE_AUTH_ERROR') {
          window.removeEventListener('message', messageHandler)
          alert(event.data.error || 'Erro ao conectar com Google Drive')
        }
      }

      window.addEventListener('message', messageHandler)

      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', messageHandler)
          setIsConnecting(false)
        }
      }, 500)

    } catch (error) {
      console.error('Erro ao conectar Google Drive:', error)
      alert('Erro ao iniciar conexão com Google Drive')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleFolderClick = async (folder: DriveFile) => {
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }])
    await loadFiles(folder.id)
    setSelectedFileId(null)
  }

  const handleBreadcrumbClick = async (index: number) => {
    const newBreadcrumb = breadcrumb.slice(0, index + 1)
    setBreadcrumb(newBreadcrumb)
    const folderId = newBreadcrumb[newBreadcrumb.length - 1].id
    await loadFiles(folderId === 'root' ? null : folderId)
    setSelectedFileId(null)
  }

  const handleImport = async () => {
    if (!selectedFileId) {
      alert('Selecione um arquivo PDF')
      return
    }

    const selectedFile = files.find(f => f.id === selectedFileId)
    if (!selectedFile) return

    if (selectedFile.isFolder) {
      alert('Selecione um arquivo PDF, não uma pasta')
      return
    }

    setIsImporting(true)

    try {
      const response = await fetch(`${API_URL}/google-drive/import-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileId: selectedFile.id,
          fileName: selectedFile.name,
          disciplinaId,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao importar PDF')
      }

      alert(`PDF importado com sucesso! ${data.material.totalPaginas} páginas`)
      onFileImported()
      onOpenChange(false)

      setSelectedFileId(null)
      setSearchTerm("")

    } catch (error) {
      console.error('Erro ao importar PDF:', error)
      alert(error instanceof Error ? error.message : 'Erro ao importar PDF')
    } finally {
      setIsImporting(false)
    }
  }

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '-'
    const size = parseInt(bytes)
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Google Drive</h2>
              <p className="text-xs text-gray-500">Importar PDF</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {isCheckingConnection ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-gray-600">Verificando conexão...</p>
            </div>
          ) : !isConnected ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Conectar ao Google Drive</h3>
              <p className="text-sm text-gray-600 text-center mb-6 max-w-sm px-4">
                Para importar PDFs do Google Drive, você precisa autorizar o acesso à sua conta.
              </p>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-6 py-3 bg-green-600 text-white rounded-full font-medium shadow-lg disabled:opacity-50 active:scale-95 transition-all"
              >
                {isConnecting ? 'Conectando...' : 'Conectar Google Drive'}
              </button>
            </div>
          ) : (
            <>
              {/* Breadcrumb */}
              <div className="p-3 border-b overflow-x-auto">
                <div className="flex items-center gap-1 text-sm whitespace-nowrap">
                  {breadcrumb.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-1 flex-shrink-0">
                      {index > 0 && <span className="text-gray-400">›</span>}
                      <button
                        onClick={() => handleBreadcrumbClick(index)}
                        className={`px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                          index === breadcrumb.length - 1 ? 'font-semibold text-blue-600' : 'text-gray-600'
                        }`}
                      >
                        {item.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="p-3 border-b">
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Files List */}
              <div className="flex-1 overflow-y-auto">
                {isLoadingFiles ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <p className="text-sm">Nenhum arquivo encontrado</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredFiles.map((file) => {
                      const isFolder = file.isFolder
                      const isSelected = selectedFileId === file.id && !isFolder

                      return (
                        <button
                          key={file.id}
                          onClick={() => isFolder ? handleFolderClick(file) : setSelectedFileId(file.id)}
                          className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex-shrink-0">
                            {isFolder ? (
                              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                              </div>
                            ) : (
                              <div className={`w-10 h-10 ${isSelected ? 'bg-blue-100' : 'bg-red-100'} rounded-lg flex items-center justify-center`}>
                                <svg className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {isFolder ? 'Pasta' : formatFileSize(file.size)}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="flex-shrink-0">
                              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t flex gap-2">
                <button
                  onClick={() => onOpenChange(false)}
                  disabled={isImporting}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full font-medium text-gray-700 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={!selectedFileId || isImporting}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-full font-medium shadow-lg disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isImporting ? 'Importando...' : 'Importar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
