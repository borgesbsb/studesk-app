'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Pencil, Loader2, BookOpen } from 'lucide-react'
import {
  adminCriarDisciplina,
  adminAtualizarDisciplina,
  adminDeletarDisciplina,
} from '@/interface/actions/admin/disciplinas'

interface Disciplina {
  id: string
  nome: string
  cor: string | null
  descricao: string | null
  _count: { materiais: number; planosDisponiveis: number }
}

interface DisciplinasAdminTableProps {
  disciplinasIniciais: Disciplina[]
}

const CORES_PREDEFINIDAS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1',
]

export function DisciplinasAdminTable({ disciplinasIniciais }: DisciplinasAdminTableProps) {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>(disciplinasIniciais)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Disciplina | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', cor: '#3b82f6', descricao: '' })

  const abrirCriar = () => {
    setEditando(null)
    setForm({ nome: '', cor: '#3b82f6', descricao: '' })
    setModalAberto(true)
  }

  const abrirEditar = (disc: Disciplina) => {
    setEditando(disc)
    setForm({ nome: disc.nome, cor: disc.cor || '#3b82f6', descricao: disc.descricao || '' })
    setModalAberto(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSalvando(true)

    if (editando) {
      const res = await adminAtualizarDisciplina(editando.id, {
        nome: form.nome,
        cor: form.cor,
        descricao: form.descricao || undefined,
      })
      if (res.error) { alert(res.error) }
      else if (res.success && res.data) {
        setDisciplinas(prev => prev.map(d => d.id === editando.id ? res.data as Disciplina : d))
        setModalAberto(false)
      }
    } else {
      const res = await adminCriarDisciplina({
        nome: form.nome,
        cor: form.cor,
        descricao: form.descricao || undefined,
      })
      if (res.error) { alert(res.error) }
      else if (res.success && res.data) {
        setDisciplinas(prev => [...prev, res.data as Disciplina])
        setModalAberto(false)
      }
    }
    setSalvando(false)
  }

  const handleDeletar = async (id: string) => {
    if (!confirm('Deletar esta disciplina?')) return
    setRemovendoId(id)
    const res = await adminDeletarDisciplina(id)
    setRemovendoId(null)
    if (res.error) { alert(res.error) }
    else { setDisciplinas(prev => prev.filter(d => d.id !== id)) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{disciplinas.length} disciplina{disciplinas.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={abrirCriar}>
          <Plus className="h-4 w-4 mr-1" /> Nova Disciplina
        </Button>
      </div>

      {disciplinas.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
          Nenhuma disciplina criada. Clique em "Nova Disciplina" para começar.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Disciplina</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Materiais</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Planos</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {disciplinas.map(disc => (
                <tr key={disc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: disc.cor || '#3b82f6' }}
                      />
                      <span className="font-medium text-slate-800">{disc.nome}</span>
                      {disc.descricao && (
                        <span className="text-slate-400 text-xs truncate max-w-[200px]">{disc.descricao}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="gap-1">
                      <BookOpen className="h-3 w-3" />
                      {disc._count.materiais}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-500 text-xs">{disc._count.planosDisponiveis} plano{disc._count.planosDisponiveis !== 1 ? 's' : ''}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => abrirEditar(disc)}>
                        <Pencil className="h-3.5 w-3.5 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                        onClick={() => handleDeletar(disc.id)}
                        disabled={removendoId === disc.id}
                      >
                        {removendoId === disc.id
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

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSalvar}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Disciplina' : 'Nova Disciplina'}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid gap-2">
                <Label>Nome *</Label>
                <Input
                  value={form.nome}
                  onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Direito Constitucional"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {CORES_PREDEFINIDAS.map(cor => (
                    <button
                      key={cor}
                      type="button"
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: cor,
                        borderColor: form.cor === cor ? '#1e293b' : 'transparent',
                        transform: form.cor === cor ? 'scale(1.2)' : 'scale(1)',
                      }}
                      onClick={() => setForm(p => ({ ...p, cor }))}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.cor}
                    onChange={e => setForm(p => ({ ...p, cor: e.target.value }))}
                    className="w-7 h-7 rounded cursor-pointer border"
                    title="Cor personalizada"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Descrição</Label>
                <Input
                  value={form.descricao}
                  onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
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
