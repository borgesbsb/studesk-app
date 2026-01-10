'use client'

import { MobileLayout } from '@/components/layout/MobileLayout'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { disciplinasApi, type Disciplina } from '@/lib/api/disciplinas'
import { materiaisApi, type Material } from '@/lib/api/materiais'
import { pdfCacheService } from '@/services/pdf-cache.service'
import { GoogleDrivePickerMobile } from '@/components/materiais/google-drive-picker-mobile'
import { getBackendBaseUrl } from '@/lib/api-base-url'

type Tab = 'materiais' | 'videos'

export default function DisciplinaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const disciplinaId = params.disciplinaId as string

  const [activeTab, setActiveTab] = useState<Tab>('materiais')
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

      // Filtrar materiais inválidos (sem nome ou sem PDF)
      const validMaterials = data.filter(material => {
        const isValid = material.nome && material.nome.trim() !== '' && material.arquivoPdfUrl && material.arquivoPdfUrl.trim() !== ''
        if (!isValid) {
          console.warn(`Material inválido detectado e removido da lista:`, material)
        }
        return isValid
      })

      await updateCacheStatus(validMaterials)
      setMateriais(validMaterials)
      return validMaterials
    } catch (error) {
      console.error('Erro ao carregar materiais:', error)
      return []
    }
  }

  const updateCacheStatus = async (materials: Material[]) => {
    const status: Record<string, boolean> = {}
    await Promise.all(
      materials.map(async (material) => {
        // Verificar se o PDF realmente existe no cache
        const hasPdf = await pdfCacheService.hasPdf(material.id)

        // Se diz que tem, vamos validar se consegue carregar
        if (hasPdf) {
          try {
            const pdf = await pdfCacheService.getPdf(material.id)
            status[material.id] = pdf !== null && pdf.size > 0
          } catch (error) {
            console.error(`Erro ao validar cache do material ${material.id}:`, error)
            status[material.id] = false
            // Remover entrada corrompida do cache
            await pdfCacheService.removePdf(material.id).catch(() => {})
          }
        } else {
          status[material.id] = false
        }
      })
    )
    setCacheStatus(status)
  }

  const handleDownloadMaterial = async (material: Material) => {
    if (downloadingIds.has(material.id)) return

    try {
      setDownloadingIds(prev => new Set(prev).add(material.id))

      const driveFileIdMatch = material.fonteOrigem?.match(/fileId:\s*([^\)]+)/)
      const driveFileId = driveFileIdMatch?.[1]?.trim()

      let pdfUrl: string
      const backendUrl = getBackendBaseUrl()

      if (driveFileId) {
        pdfUrl = `${backendUrl}/api/google-drive/download-pdf?fileId=${driveFileId}`
      } else if (material.arquivoPdfUrl.startsWith('http')) {
        pdfUrl = material.arquivoPdfUrl
      } else {
        const apiPath = material.arquivoPdfUrl.replace(/^\/uploads/, '/api/uploads')
        pdfUrl = `${backendUrl}${apiPath}`
      }

      const response = await fetch(pdfUrl, {
        mode: 'cors',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const blob = await response.blob()
      await pdfCacheService.savePdfFromBlob(material.id, blob, material.nome)

      setCacheStatus(prev => ({ ...prev, [material.id]: true }))
      alert('Material baixado com sucesso!')
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
      <MobileLayout title="Carregando...">
        <div className="flex items-center justify-center p-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout
      title={disciplina?.nome || 'Disciplina'}
      showBack
      onBack={() => router.back()}
    >
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header Moderno */}
        <div className="bg-white border-b border-gray-100">
          <div className="px-4 pt-6 pb-4">
            {/* Disciplina Info */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white text-xl shadow-sm"
                style={{ backgroundColor: disciplina?.cor || '#8B5CF6' }}
              >
                {disciplina?.icone || disciplina?.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 truncate">{disciplina?.nome}</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {materiais.length} {materiais.length === 1 ? 'material' : 'materiais'}
                  {materiais.filter(m => cacheStatus[m.id]).length > 0 && (
                    <span className="ml-1">
                      • <span className="text-green-600 font-medium">{materiais.filter(m => cacheStatus[m.id]).length} offline</span>
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Tabs Modernos */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('materiais')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'materiais'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📚 Materiais
              </button>
              <button
                onClick={() => setActiveTab('videos')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'videos'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🎥 Vídeos
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {activeTab === 'materiais' ? (
            <div className="p-4 space-y-3">
              {/* Add Material Button */}
              <button
                onClick={() => setGoogleDriveOpen(true)}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Adicionar Material
              </button>

              {/* Lista de Materiais */}
              {materiais.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhum Material</h3>
                  <p className="text-gray-600 text-center text-sm max-w-sm px-4">
                    Importe PDFs do Google Drive para começar a estudar
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {materiais.map((material) => {
                    const isCached = cacheStatus[material.id] || false
                    const isDownloading = downloadingIds.has(material.id)

                    return (
                      <div
                        key={material.id}
                        className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all"
                      >
                        {/* Header do Card */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-11 h-11 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1 truncate">
                              {material.nome}
                            </h4>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-gray-500 font-medium">
                                {material.totalPaginas || 0} pág.
                              </span>
                              {material.paginasLidas > 0 && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                  <span className="text-xs text-emerald-600 font-semibold">
                                    {material.paginasLidas} lidas
                                  </span>
                                </>
                              )}
                              {isCached ? (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Offline
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        {material.totalPaginas > 0 && material.paginasLidas > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium text-gray-600">Progresso</span>
                              <span className="text-xs font-semibold text-blue-600">
                                {Math.round((material.paginasLidas / material.totalPaginas) * 100)}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, (material.paginasLidas / material.totalPaginas) * 100)}%`
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          {isCached ? (
                            <>
                              <button
                                onClick={() => {
                                  const userHash = (session?.user as any)?.hash || ''
                                  const startPage = material.paginasLidas > 0 ? material.paginasLidas : 1
                                  router.push(`/${userHash}/reader/${material.id}?page=${startPage}`)
                                }}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                {material.paginasLidas > 0 ? 'Continuar' : 'Ler'}
                              </button>
                              <button
                                onClick={() => handleRemoveFromCache(material.id)}
                                className="px-3.5 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 active:scale-[0.98] transition-all"
                                title="Remover do cache"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleDownloadMaterial(material)}
                              disabled={isDownloading}
                              className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                            >
                              {isDownloading ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Baixando...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  <span>Baixar</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              {/* Vídeos Tab - Coming Soon */}
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Vídeos em Breve</h3>
                <p className="text-gray-600 text-center text-sm max-w-sm px-4">
                  Em breve você poderá adicionar e assistir vídeos do YouTube e outras plataformas
                </p>
              </div>
            </div>
          )}
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
