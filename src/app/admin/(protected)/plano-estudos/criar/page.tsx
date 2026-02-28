'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, CalendarDays } from 'lucide-react'
import { adminCriarPlano } from '@/interface/actions/admin/plano-estudos'

export default function CriarPlanoAdminPage() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    dataInicio: '',
    dataFim: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim() || !form.dataInicio || !form.dataFim) return

    setSalvando(true)
    const res = await adminCriarPlano({
      nome: form.nome,
      descricao: form.descricao || undefined,
      dataInicio: form.dataInicio,
      dataFim: form.dataFim
    })
    setSalvando(false)

    if (res.error) {
      alert(res.error)
    } else if (res.success && res.data) {
      router.push(`/admin/plano-estudos/${res.data.id}`)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/plano-estudos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-slate-600" />
          <h1 className="text-2xl font-bold text-slate-800">Novo Plano de Estudo</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Plano de Estudos – Auditor ISS JP 2026"
                value={form.nome}
                onChange={e => setForm(prev => ({ ...prev, nome: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o objetivo deste plano (opcional)"
                value={form.descricao}
                onChange={e => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data de Início *</Label>
                <Input
                  type="date"
                  value={form.dataInicio}
                  onChange={e => setForm(prev => ({ ...prev, dataInicio: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Data de Fim *</Label>
                <Input
                  type="date"
                  value={form.dataFim}
                  onChange={e => setForm(prev => ({ ...prev, dataFim: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={salvando}>
                {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Plano
              </Button>
              <Link href="/admin/plano-estudos">
                <Button variant="outline" type="button">Cancelar</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
