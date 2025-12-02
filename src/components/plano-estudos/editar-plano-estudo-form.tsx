'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getPlanoEstudoById } from '@/interface/actions/plano-estudo/get-by-id'
import { updatePlanoEstudo } from '@/interface/actions/plano-estudo/update'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { useUserHash } from '@/contexts/user-hash-context'

interface EditarPlanoEstudoFormProps {
  planoId: string
}

export function EditarPlanoEstudoForm({ planoId }: EditarPlanoEstudoFormProps) {
  const { hash } = useUserHash()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    dataInicio: '',
    dataFim: ''
  })

  useEffect(() => {
    const carregarPlano = async () => {
      try {
        const resultado = await getPlanoEstudoById(planoId)
        if (resultado.success && resultado.data) {
          const plano = resultado.data
          setFormData({
            nome: plano.nome,
            descricao: plano.descricao || '',
            dataInicio: format(new Date(plano.dataInicio), 'yyyy-MM-dd'),
            dataFim: format(new Date(plano.dataFim), 'yyyy-MM-dd')
          })
        } else {
          toast.error('Erro ao carregar plano de estudo')
          router.push(`/${hash}/plano-estudos`)
        }
      } catch (error) {
        console.error('Erro ao carregar plano:', error)
        toast.error('Erro ao carregar plano de estudo')
        router.push(`/${hash}/plano-estudos`)
      } finally {
        setLoading(false)
      }
    }

    carregarPlano()
  }, [planoId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      toast.error('O nome do plano é obrigatório')
      return
    }

    if (!formData.dataInicio || !formData.dataFim) {
      toast.error('As datas de início e fim são obrigatórias')
      return
    }

    const dataInicio = new Date(formData.dataInicio)
    const dataFim = new Date(formData.dataFim)

    if (dataFim <= dataInicio) {
      toast.error('A data de fim deve ser posterior à data de início')
      return
    }

    setSubmitting(true)

    try {
      const resultado = await updatePlanoEstudo(planoId, {
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || undefined,
        dataInicio,
        dataFim
      })

      if (resultado.success) {
        toast.success('Plano de estudo atualizado com sucesso!')
        router.push(`/${hash}/plano-estudos/${planoId}`)
      } else {
        toast.error(resultado.error || 'Erro ao atualizar plano de estudo')
      }
    } catch (error) {
      console.error('Erro ao atualizar plano:', error)
      toast.error('Erro inesperado ao atualizar plano de estudo')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações Básicas</CardTitle>
        <CardDescription>
          Edite o nome, descrição e período do plano de estudos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Plano</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Preparação para Concurso X"
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva os objetivos e metas deste plano..."
              rows={4}
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data de Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={formData.dataInicio}
                onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataFim">Data de Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={formData.dataFim}
                onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${hash}/plano-estudos/${planoId}`)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
