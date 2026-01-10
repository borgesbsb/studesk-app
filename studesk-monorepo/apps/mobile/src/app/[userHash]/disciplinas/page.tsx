'use client'

import { MobileLayout } from '@/components/layout/MobileLayout'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { disciplinasApi, type Disciplina } from '@/lib/api/disciplinas'

export default function DisciplinasPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDisciplinas()
  }, [])

  const loadDisciplinas = async () => {
    try {
      setLoading(true)
      const data = await disciplinasApi.list()
      setDisciplinas(data)
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error)
      alert('Erro ao carregar disciplinas')
    } finally {
      setLoading(false)
    }
  }

  const handleDisciplinaClick = (disciplinaId: string) => {
    const userHash = (session?.user as any)?.hash || ''
    router.push(`/${userHash}/disciplinas/${disciplinaId}`)
  }

  if (loading) {
    return (
      <MobileLayout title="Disciplinas">
        <div className="flex items-center justify-center p-12">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </MobileLayout>
    )
  }

  if (disciplinas.length === 0) {
    return (
      <MobileLayout title="Disciplinas">
        <div className="p-4 space-y-4">
          {/* Empty State */}
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Nenhuma Disciplina</h2>
            <p className="text-gray-600 text-center text-sm max-w-sm mb-6">
              Use o app web para criar suas disciplinas e gerenciar seus estudos
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Crie Disciplinas</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Organize por matérias do seu concurso ou curso
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Adicione Materiais</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Vincule PDFs, vídeos e outros recursos
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Acompanhe Progresso</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Veja estatísticas e evolução em cada matéria
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="Disciplinas">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600">
            {disciplinas.length} {disciplinas.length === 1 ? 'disciplina' : 'disciplinas'}
          </p>
        </div>

        {/* Lista de Disciplinas */}
        <div className="grid gap-3">
          {disciplinas.map((disciplina) => (
            <button
              key={disciplina.id}
              onClick={() => handleDisciplinaClick(disciplina.id)}
              className="bg-white rounded-xl p-4 border border-gray-200 hover:border-purple-300 active:scale-[0.98] transition-all shadow-sm hover:shadow-md text-left"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-white text-lg shadow-md"
                  style={{ backgroundColor: disciplina.cor || '#8B5CF6' }}
                >
                  {disciplina.icone || disciplina.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {disciplina.nome}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Toque para ver materiais
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
    </MobileLayout>
  )
}
