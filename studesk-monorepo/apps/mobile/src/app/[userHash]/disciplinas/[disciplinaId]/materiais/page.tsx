'use client'

import { MobileLayout } from '@/components/layout/MobileLayout'
import { GoogleDrivePickerMobile } from '@/components/materiais/google-drive-picker-mobile'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { disciplinasApi, type Disciplina } from '@/lib/api/disciplinas'
import { materiaisApi, type Material } from '@/lib/api/materiais'
import { pdfCacheService, mediaCacheService } from '@/services/pdf-cache.service'
import { getBackendBaseUrl } from '@/lib/api-base-url'

export default function MateriaisDisciplinaPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const disciplinaId = params.disciplinaId as string

  const [disciplina, setDisciplina] = useState<Disciplina | null>(null)
  const [materiais, setMateriais] = useState<Material[]>([])
  const [cacheStatus, setCacheStatus] = useState<Record<string, boolean>>({})
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [googleDriveOpen, setGoogleDriveOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [disciplinaId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [disciplinaData, materiaisData] = await Promise.all([
        disciplinasApi.getById(disciplinaId),
        loadMateriais()
      ])
      setDisciplina(disciplinaData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      alert('Erro ao carregar dados da disciplina')
    } finally {
      setLoading(false)
    }
  }

  const loadMateriais = async () => {
    try {
      const data = await materiaisApi.listByDisciplina(disciplinaId)

      // Verificar status de cache de cada material
      await updateCacheStatus(data)

      setMateriais(data)
      return data
    } catch (error) {
      console.error('Erro ao carregar materiais:', error)
      return []
    }
  }

  const updateCacheStatus = async (materials: Material[]) => {
    const status: Record<string, boolean> = {}
    await Promise.all(
      materials.map(async (material) => {
        if (material.tipo === 'VIDEO') {
          status[material.id] = await mediaCacheService.hasVideo(material.id)
        } else {
          status[material.id] = await mediaCacheService.hasPdf(material.id)
        }
      })
    )
    setCacheStatus(status)
  }

  const handleDownloadMaterial = async (material: Material) => {
    if (downloadingIds.has(material.id)) return

    try {
      setDownloadingIds(prev => new Set(prev).add(material.id))

      const isVideo = material.tipo === 'VIDEO'
      const backendUrl = getBackendBaseUrl()

      // Tentar extrair fileId do Google Drive a partir de fonteOrigem
      const driveFileIdMatch = material.fonteOrigem?.match(/fileId:\s*([^\)]+)/)
      const driveFileId = driveFileIdMatch?.[1]?.trim()

      let mediaUrl: string

      if (driveFileId) {
        // Usar proxy do Google Drive
        mediaUrl = `${backendUrl}/api/google-drive/download-pdf?fileId=${driveFileId}`
        console.log(`Baixando ${isVideo ? 'vídeo' : 'PDF'} do Google Drive via proxy:`, mediaUrl)
      } else if (material.arquivoPdfUrl) {
        // URL do PDF
        if (material.arquivoPdfUrl.startsWith('http')) {
          mediaUrl = material.arquivoPdfUrl
        } else {
          const apiPath = material.arquivoPdfUrl.replace(/^\/uploads/, '/api/uploads')
          mediaUrl = `${backendUrl}${apiPath}`
        }
        console.log('Baixando PDF:', mediaUrl)
      } else {
        throw new Error('URL do material não encontrada')
      }

      // Buscar material do servidor
      const response = await fetch(mediaUrl, {
        mode: 'cors',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const blob = await response.blob()
      const contentType = response.headers.get('content-type')

      // Salvar no cache apropriado
      if (isVideo) {
        await mediaCacheService.saveVideoFromBlob(material.id, blob, material.nome, contentType || 'video/mp4')
      } else {
        await mediaCacheService.savePdfFromBlob(material.id, blob, material.nome)
      }

      // Atualizar status
      setCacheStatus(prev => ({ ...prev, [material.id]: true }))
      alert(`${isVideo ? 'Vídeo' : 'Material'} baixado com sucesso!`)
    } catch (error) {
      console.error('Erro ao baixar material:', error)
      alert('Erro ao baixar material. Verifique sua conexão.')
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(material.id)
        return newSet
      })
    }
  }

  const handleRemoveFromCache = async (materialId: string) => {
    try {
      await pdfCacheService.removePdf(materialId)
      setCacheStatus(prev => ({ ...prev, [materialId]: false }))
      alert('Material removido do cache')
    } catch (error) {
      console.error('Erro ao remover material:', error)
      alert('Erro ao remover material do cache')
    }
  }

  const handleMaterialImported = async () => {
    await loadMateriais()
  }

  if (loading) {
    return (
      <MobileLayout title="Materiais">
        <div className="flex items-center justify-center p-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout
      title={disciplina?.nome || 'Materiais'}
      showBack
      onBack={() => router.back()}
    >
      <div className="p-4 space-y-4 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">Materiais de Estudo</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {materiais.length} {materiais.length === 1 ? 'material' : 'materiais'} • {Object.values(cacheStatus).filter(Boolean).length} offline
            </p>
          </div>
          <button
            onClick={() => setGoogleDriveOpen(true)}
            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium shadow-md hover:bg-green-700 active:scale-95 transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
            <span className="hidden sm:inline">Drive</span>
          </button>
        </div>

        {/* Lista de Materiais */}
        {materiais.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhum Material</h3>
            <p className="text-gray-600 text-center text-sm max-w-sm mb-6 px-4">
              Importe PDFs do Google Drive para começar a estudar
            </p>
            <button
              onClick={() => setGoogleDriveOpen(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-full font-medium shadow-lg shadow-green-500/30 active:scale-95 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              Importar do Google Drive
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {materiais.map((material) => {
              const isCached = cacheStatus[material.id] || false
              const isDownloading = downloadingIds.has(material.id)

              return (
                <div
                  key={material.id}
                  className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm max-w-full"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">
                        {material.nome}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {material.totalPaginas || 0} páginas
                        </span>
                        {material.paginasLidas > 0 && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-green-600 font-medium whitespace-nowrap">
                              {material.paginasLidas} lidas
                            </span>
                          </>
                        )}
                      </div>

                      {/* Cache Status Badge */}
                      <div className="flex items-center gap-2 mt-2">
                        {isCached ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Offline
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                            Online
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {material.totalPaginas > 0 && (
                    <div className="mt-3 w-full">
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (material.paginasLidas / material.totalPaginas) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-3 w-full">
                    <button
                      onClick={() => {
                        const userHash = (session?.user as any)?.hash || ''
                        router.push(`/${userHash}/reader/${material.id}`)
                      }}
                      className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ler Material
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-lg">💡</span>
            </div>
            <div>
              <p className="font-semibold text-blue-900 text-sm">Dica</p>
              <p className="text-blue-800 text-xs mt-1">
                Importe seus PDFs do Google Drive e acesse-os offline em qualquer dispositivo
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Google Drive Picker Modal */}
      <GoogleDrivePickerMobile
        open={googleDriveOpen}
        onOpenChange={setGoogleDriveOpen}
        onFileImported={handleMaterialImported}
        disciplinaId={disciplinaId}
      />
    </MobileLayout>
  )
}
