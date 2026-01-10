'use client'

import { MobileLayout } from '@/components/layout/MobileLayout'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { materiaisApi, type Material } from '@/lib/api/materiais'
import { disciplinasApi, type Disciplina } from '@/lib/api/disciplinas'
import { pdfCacheService } from '@/services/pdf-cache.service'
import { getBackendBaseUrl } from '@/lib/api-base-url'

export default function MateriaisPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [materiais, setMateriais] = useState<Material[]>([])
  const [cacheStatus, setCacheStatus] = useState<Record<string, boolean>>({})
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [loading, setLoading] = useState(true)
  const [showDisciplinaSelector, setShowDisciplinaSelector] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [materiaisData, disciplinasData] = await Promise.all([
        materiaisApi.list(),
        disciplinasApi.list()
      ])

      // Verificar status de cache de cada material
      await updateCacheStatus(materiaisData)

      setMateriais(materiaisData)
      setDisciplinas(disciplinasData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      alert('Erro ao carregar materiais')
    } finally {
      setLoading(false)
    }
  }

  const updateCacheStatus = async (materials: Material[]) => {
    const status: Record<string, boolean> = {}
    await Promise.all(
      materials.map(async (material) => {
        status[material.id] = await pdfCacheService.hasPdf(material.id)
      })
    )
    setCacheStatus(status)
  }

  const handleDownloadMaterial = async (material: Material) => {
    if (downloadingIds.has(material.id)) return

    try {
      setDownloadingIds(prev => new Set(prev).add(material.id))

      // Tentar extrair fileId do Google Drive a partir de fonteOrigem
      // Formato esperado: "Google Drive (fileId: 1abc...)"
      const driveFileIdMatch = material.fonteOrigem?.match(/fileId:\s*([^\)]+)/)
      const driveFileId = driveFileIdMatch?.[1]?.trim()

      let pdfUrl: string

      const backendUrl = getBackendBaseUrl()

      if (driveFileId) {
        // Usar proxy do Google Drive
        pdfUrl = `${backendUrl}/api/google-drive/download-pdf?fileId=${driveFileId}`
        console.log('Baixando PDF do Google Drive via proxy:', pdfUrl)
      } else if (material.arquivoPdfUrl.startsWith('http')) {
        // URL externa
        pdfUrl = material.arquivoPdfUrl
        console.log('Baixando PDF de URL externa:', pdfUrl)
      } else {
        // Arquivo local (fallback)
        const apiPath = material.arquivoPdfUrl.replace(/^\/uploads/, '/api/uploads')
        pdfUrl = `${backendUrl}${apiPath}`
        console.log('Baixando PDF local:', pdfUrl)
      }

      // Buscar PDF do servidor
      const response = await fetch(pdfUrl, {
        mode: 'cors',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const blob = await response.blob()
      await pdfCacheService.savePdfFromBlob(material.id, blob, material.nome)

      // Atualizar status
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

  const handleAddMaterial = () => {
    if (disciplinas.length === 0) {
      alert('Crie uma disciplina primeiro no app web para adicionar materiais')
      return
    }
    setShowDisciplinaSelector(true)
  }

  const handleDisciplinaSelect = (disciplinaId: string) => {
    // Navegar para a página de materiais da disciplina
    window.location.href = `/disciplinas/${disciplinaId}/materiais`
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
    <MobileLayout title="Materiais">
      <div className="p-4 space-y-4 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">Meus Materiais</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {materiais.length} {materiais.length === 1 ? 'material' : 'materiais'} • {Object.values(cacheStatus).filter(Boolean).length} offline
            </p>
          </div>
          <button
            onClick={handleAddMaterial}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Novo</span>
          </button>
        </div>

        {/* Lista de Materiais */}
        {materiais.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhum Material</h3>
            <p className="text-gray-600 text-center text-sm max-w-sm mb-6 px-4">
              Comece adicionando materiais de estudo via Google Drive
            </p>
            <button
              onClick={handleAddMaterial}
              className="px-6 py-3 bg-blue-600 text-white rounded-full font-medium shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar Material
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {materiais.map((material) => {
              const isCached = cacheStatus[material.id] || false
              const isDownloading = downloadingIds.has(material.id)

              return (
                <div
                  key={material.id}
                  className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">
                        {material.nome}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {material.totalPaginas || 0} páginas
                        </span>
                        {material.paginasLidas > 0 && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-green-600 font-medium">
                              {material.paginasLidas} lidas
                            </span>
                          </>
                        )}
                      </div>

                      {/* Cache Status Badge */}
                      <div className="flex items-center gap-2 mt-2">
                        {isCached ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Offline
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                            Online
                          </span>
                        )}
                      </div>

                      {material.disciplinas && material.disciplinas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {material.disciplinas.map((disc) => (
                            <span
                              key={disc.disciplinaId}
                              className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                            >
                              {disc.disciplinaNome}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {material.totalPaginas > 0 && (
                    <div className="mt-3">
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
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        const userHash = (session?.user as any)?.hash || ''
                        router.push(`/${userHash}/reader/${material.id}`)
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ler
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
                Para adicionar materiais, vá em Disciplinas → selecione uma disciplina → clique em &ldquo;Drive&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Seletor de Disciplina */}
      {showDisciplinaSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Selecione a Disciplina</h3>
              <button
                onClick={() => setShowDisciplinaSelector(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-3">
                {disciplinas.map((disciplina) => (
                  <button
                    key={disciplina.id}
                    onClick={() => handleDisciplinaSelect(disciplina.id)}
                    className="bg-white rounded-xl p-4 border border-gray-200 hover:border-purple-300 active:scale-[0.98] transition-all shadow-sm text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-white text-sm shadow-md"
                        style={{ backgroundColor: disciplina.cor || '#8B5CF6' }}
                      >
                        {disciplina.icone || disciplina.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate text-sm">
                          {disciplina.nome}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  )
}
