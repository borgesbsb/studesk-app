'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Trash2, Pencil, Loader2, BookOpen, ExternalLink, LayoutList } from 'lucide-react'
import Link from 'next/link'
import {
  adminCriarEdital,
  adminAtualizarEdital,
  adminDeletarEdital,
} from '@/interface/actions/admin/editais'

interface EditalDisciplina {
  id: string
  disciplinaId: string
  disciplina: { id: string; nome: string; cor: string | null }
}

interface Edital {
  id: string
  nome: string
  descricao: string | null
  orgao: string | null
  cargo: string | null
  ano: number | null
  link: string | null
  disciplinas: EditalDisciplina[]
  _count: { disciplinas: number }
}

interface EditaisAdminTableProps {
  editaisIniciais: Edital[]
}

const emptyForm = { nome: '', descricao: '', orgao: '', cargo: '', ano: '', link: '' }

export function EditaisAdminTable({ editaisIniciais }: EditaisAdminTableProps) {
  const [editais, setEditais] = useState<Edital[]>(editaisIniciais)
  const [modalEdital, setModalEdital] = useState(false)
  const [editando, setEditando] = useState<Edital | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const abrirCriar = () => {
    setEditando(null)
    setForm(emptyForm)
    setModalEdital(true)
  }

  const abrirEditar = (edital: Edital) => {
    setEditando(edital)
    setForm({
      nome: edital.nome,
      descricao: edital.descricao || '',
      orgao: edital.orgao || '',
      cargo: edital.cargo || '',
      ano: edital.ano ? String(edital.ano) : '',
      link: edital.link || '',
    })
    setModalEdital(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSalvando(true)

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || undefined,
      orgao: form.orgao.trim() || undefined,
      cargo: form.cargo.trim() || undefined,
      ano: form.ano ? parseInt(form.ano) : undefined,
      link: form.link.trim() || undefined,
    }

    if (editando) {
      const res = await adminAtualizarEdital(editando.id, payload)
      if (res.error) { alert(res.error) }
      else if (res.success && res.data) {
        setEditais(prev => prev.map(e => e.id === editando.id ? { ...e, ...res.data as Edital } : e))
        setModalEdital(false)
      }
    } else {
      const res = await adminCriarEdital(payload)
      if (res.error) { alert(res.error) }
      else if (res.success && res.data) {
        setEditais(prev => [...prev, res.data as Edital])
        setModalEdital(false)
      }
    }
    setSalvando(false)
  }

  const handleDeletar = async (id: string, nome: string) => {
    if (!confirm(`Deletar o edital "${nome}"?`)) return
    setRemovendoId(id)
    const res = await adminDeletarEdital(id)
    setRemovendoId(null)
    if (res.error) { alert(res.error) }
    else { setEditais(prev => prev.filter(e => e.id !== id)) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{editais.length} edital{editais.length !== 1 ? 'is' : ''}</p>
        <Button size="sm" onClick={abrirCriar}>
          <Plus className="h-4 w-4 mr-1" /> Novo Edital
        </Button>
      </div>

      {editais.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
          Nenhum edital criado. Clique em "Novo Edital" para começar.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Órgão</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Cargo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Ano</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Disciplinas</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {editais.map(edital => (
                <tr key={edital.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                      {edital.nome}
                      {edital.link && (
                        <a href={edital.link} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    {edital.descricao && (
                      <p className="text-xs text-slate-400 truncate max-w-[200px]">{edital.descricao}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{edital.orgao || '-'}</td>
                  <td className="px-4 py-3 text-slate-500">{edital.cargo || '-'}</td>
                  <td className="px-4 py-3">
                    {edital.ano ? <Badge variant="outline">{edital.ano}</Badge> : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-500">
                      {edital._count.disciplinas} disciplina{edital._count.disciplinas !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/admin/editais/${edital.id}/vertical`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-orange-500 hover:bg-orange-50"
                          title="Edital verticalizado"
                        >
                          <LayoutList className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link href={`/admin/editais/${edital.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-blue-500 hover:bg-blue-50"
                          title="Gerenciar disciplinas"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="Editar edital"
                        onClick={() => abrirEditar(edital)}
                      >
                        <Pencil className="h-3.5 w-3.5 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                        title="Deletar edital"
                        onClick={() => handleDeletar(edital.id, edital.nome)}
                        disabled={removendoId === edital.id}
                      >
                        {removendoId === edital.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal criar/editar edital */}
      <Dialog open={modalEdital} onOpenChange={setModalEdital}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSalvar}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Edital' : 'Novo Edital'}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {[
                { id: 'nome', label: 'Nome *', placeholder: 'Ex: TJSP 2025', required: true },
                { id: 'orgao', label: 'Órgão', placeholder: 'Ex: CESPE / Cebraspe' },
                { id: 'cargo', label: 'Cargo', placeholder: 'Ex: Analista Judiciário' },
                { id: 'link', label: 'Link', placeholder: 'URL do edital oficial' },
              ].map(({ id, label, placeholder, required }) => (
                <div key={id} className="grid gap-1.5">
                  <Label>{label}</Label>
                  <Input
                    value={form[id as keyof typeof form]}
                    onChange={e => setForm(p => ({ ...p, [id]: e.target.value }))}
                    placeholder={placeholder}
                    required={required}
                  />
                </div>
              ))}
              <div className="grid gap-1.5">
                <Label>Ano</Label>
                <Input
                  type="number"
                  value={form.ano}
                  onChange={e => setForm(p => ({ ...p, ano: e.target.value }))}
                  placeholder="Ex: 2025"
                  min={2000}
                  max={2099}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Descrição</Label>
                <Input
                  value={form.descricao}
                  onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Observações sobre o edital..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalEdital(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvando}>
                {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editando ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
