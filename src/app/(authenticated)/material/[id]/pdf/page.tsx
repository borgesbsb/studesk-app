'use client'

import { useEffect, useState } from 'react'
import EmbeddedWebViewer from '@/components/material-estudo/webviewer-embedded-clean'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface MaterialData {
  id: string
  nome: string
  arquivoPdfUrl: string
  totalPaginas: number
  paginasLidas: number
}

export default function MaterialPdfPage() {
  const router = useRouter()
  const params = useParams()
  const materialId = params?.id as string
  const [material, setMaterial] = useState<MaterialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [atualizandoProgresso, setAtualizandoProgresso] = useState(false)

  useEffect(() => {
    async function loadMaterial() {
      if (!materialId) return
      
      try {
        const response = await fetch(`/api/material/${materialId}`)
        const data = await response.json()
        
        if (data.material) {
          setMaterial(data.material)
        } else {
          toast.error("Material não encontrado")
        }
      } catch (error) {
        console.error('Erro ao carregar material:', error)
        toast.error('Erro ao carregar material')
      } finally {
        setLoading(false)
      }
    }

    loadMaterial()
  }, [materialId])

  const handleUpdateProgress = async (pagina: number) => {
    if (!material || atualizandoProgresso) return
    
    setAtualizandoProgresso(true)
    try {
      const response = await fetch(`/api/material/${materialId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paginasLidas: pagina }),
      })

      const data = await response.json()
      if (data.success) {
        setMaterial(prev => prev ? {
          ...prev,
          paginasLidas: pagina
        } : null)
        toast.success('Progresso salvo com sucesso!')
      } else {
        toast.error(data.error || 'Erro ao salvar progresso')
      }
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error)
      toast.error('Erro ao salvar progresso')
    } finally {
      setAtualizandoProgresso(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="mb-2 text-xl font-semibold">
            Carregando material...
          </div>
        </div>
      </div>
    )
  }

  if (!material) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="mb-2 text-xl font-semibold">
            Material não encontrado
          </div>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4 p-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/material/${materialId}`)}
          className="text-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-lg font-semibold">{material.nome}</h1>
      </div>

      {/* Visualizador de PDF */}
      <div className="h-[calc(100vh-4rem)]">
        <EmbeddedWebViewer
          pdfUrl={material.arquivoPdfUrl}
          paginaProgresso={material.paginasLidas}
          onUpdateProgress={handleUpdateProgress}
        />
      </div>
    </div>
  )
} 