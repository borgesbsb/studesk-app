'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPlanoEstudoSimples } from '@/interface/actions/plano-estudo/create'
import { Save, ArrowLeft, Calendar, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useUserHash } from '@/contexts/user-hash-context'

export function CriarPlanoEstudoForm() {
  const { hash } = useUserHash()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    nome: ''
  })



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const resultado = await createPlanoEstudoSimples({
        nome: formData.nome
      })

      if (resultado.success) {
        toast.success('Plano de estudo criado com sucesso!')
        router.push(`/${hash}/plano-estudos`)
      } else {
        toast.error(resultado.error || 'Erro ao criar plano')
      }
    } catch (error) {
      toast.error('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border border-gray-200 shadow-sm bg-white">
      <CardHeader className="pb-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Calendar className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Criar Plano de Estudos
              </CardTitle>
              <p className="text-gray-500 text-sm mt-1">
                Crie um plano básico com nome
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
            <BookOpen className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Novo Plano
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Plano *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Concurso Auditor 2024"
                  required
                />
              </div>
            </div>

            <div className="flex gap-4 justify-end pt-4">
              <Link href={`/${hash}/plano-estudos`}>
                <Button type="button" variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <Button type="submit" disabled={loading || !formData.nome}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Criar Plano'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
