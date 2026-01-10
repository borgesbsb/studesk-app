'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Material {
  id: string
  nome: string
  totalPaginas: number
  hasFormattedText: boolean
}

export default function ReaderPOCPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      const response = await fetch('http://192.168.15.8:3030/api/materiais/list-formatted')
      if (response.ok) {
        const data = await response.json()
        setMaterials(data.materials || [])
      }
    } catch (err) {
      console.error('Erro ao buscar materiais:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando materiais...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-block mb-4">
            <button className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar
            </button>
          </Link>
          <div className="inline-block bg-blue-600 text-white rounded-full p-4 mb-4">
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            E-Reader POC
          </h1>
          <p className="text-gray-600 text-lg">
            Leitura otimizada com IA para dispositivos móveis
          </p>
        </div>

        {/* Materials Grid */}
        {materials.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Nenhum material disponível
            </h3>
            <p className="text-gray-500 mb-6">
              Adicione materiais PDF através da aplicação principal
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {materials.map((material) => (
              <Link
                key={material.id}
                href={`/reader/${material.id}`}
                className="group"
              >
                <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          <span className="text-white text-xs font-semibold uppercase tracking-wider">
                            {material.hasFormattedText ? 'Pronto para leitura' : 'Não processado'}
                          </span>
                        </div>
                        <h3 className="text-white font-bold text-lg leading-tight line-clamp-2">
                          {material.nome}
                        </h3>
                      </div>
                      <div className="ml-4">
                        <svg
                          className="w-8 h-8 text-white opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span>{material.totalPaginas} páginas</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      {material.hasFormattedText ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Formatado com IA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Não processado
                        </span>
                      )}

                      <span className="text-blue-600 font-semibold group-hover:text-blue-700">
                        Abrir →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📱</span>
            Como acessar do celular
          </h3>
          <div className="space-y-3 text-gray-600">
            <p>
              <strong>1.</strong> Conecte seu celular na mesma rede Wi-Fi (192.168.15.x)
            </p>
            <p>
              <strong>2.</strong> Abra o navegador do celular e acesse:
            </p>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 font-mono text-blue-700 font-semibold text-center text-lg">
              http://192.168.15.8:3031
            </div>
            <p className="text-sm text-gray-500">
              💡 Dica: Adicione à tela inicial do celular para acesso rápido!
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="text-3xl mb-3">⚡</div>
            <h4 className="font-semibold text-gray-900 mb-2">IA Formatação</h4>
            <p className="text-sm text-gray-600">
              Texto otimizado por GPT-4o-mini para leitura mobile perfeita
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="text-3xl mb-3">🎨</div>
            <h4 className="font-semibold text-gray-900 mb-2">Highlights</h4>
            <p className="text-sm text-gray-600">
              Destaque trechos importantes com cores personalizadas
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="text-3xl mb-3">💰</div>
            <h4 className="font-semibold text-gray-900 mb-2">Cache Inteligente</h4>
            <p className="text-sm text-gray-600">
              Processa uma vez, custo zero para sempre
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
