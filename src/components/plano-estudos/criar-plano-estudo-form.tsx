'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPlanoEstudoSimples } from '@/interface/actions/plano-estudo/create'
import { Save, ArrowLeft } from 'lucide-react'
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
    <div className="space-y-6">
      {/* Header com botão voltar */}
      <div className="flex items-center gap-4">
        <Link href={`/${hash}/plano-estudos`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Criar Plano de Estudos</h1>
          <p className="text-muted-foreground">
            Crie um plano básico com nome
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Plano</CardTitle>
            <CardDescription>
              Configure apenas as informações essenciais do seu plano de estudos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading || !formData.nome}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Criar Plano'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
