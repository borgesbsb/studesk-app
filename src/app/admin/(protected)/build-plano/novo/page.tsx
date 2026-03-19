'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, Wand2 } from 'lucide-react'
import { criarBuild } from '@/interface/actions/admin/build-plano'

export default function NovoBuildPage() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    numeroCiclos: 10,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) return

    setSalvando(true)
    const res = await criarBuild({
      nome: form.nome,
      descricao: form.descricao || undefined,
      numeroCiclos: form.numeroCiclos,
    })
    setSalvando(false)

    if (res.error) {
      alert(res.error)
    } else if (res.success && res.data) {
      router.push(`/admin/build-plano/${res.data.id}`)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/build-plano">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-slate-600" />
          <h1 className="text-2xl font-bold text-slate-800">Novo Build</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do Build</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Auditor ISS João Pessoa 2026"
                value={form.nome}
                onChange={e => setForm(prev => ({ ...prev, nome: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o concurso ou objetivo deste build (opcional)"
                value={form.descricao}
                onChange={e => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>Número de Ciclos *</Label>
              <Input
                type="number"
                min={2}
                max={50}
                value={form.numeroCiclos}
                onChange={e => setForm(prev => ({ ...prev, numeroCiclos: parseInt(e.target.value) || 10 }))}
                required
              />
              <p className="text-xs text-slate-500">
                Ciclos ímpares (1, 3, 5...) = P1 · Ciclos pares (2, 4, 6...) = P2
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={salvando}>
                {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Build
              </Button>
              <Link href="/admin/build-plano">
                <Button variant="outline" type="button">Cancelar</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
