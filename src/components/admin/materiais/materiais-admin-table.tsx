'use client'

import { useState, useRef } from 'react'
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
import { Plus, Trash2, Loader2, FileText, Video, Upload, X } from 'lucide-react'
import {
  adminCriarMaterial,
  adminDeletarMaterial,
} from '@/interface/actions/admin/materiais'

interface Disciplina {
  id: string
  nome: string
  cor: string | null
}

interface MaterialDisciplina {
  disciplina: Disciplina
}

interface Material {
  id: string
  nome: string
  tipo: string
  totalPaginas: number
  duracaoSegundos: number | null
  arquivoPdfUrl: string | null
  arquivoVideoUrl: string | null
  disciplinas: MaterialDisciplina[]
  createdAt: string | Date
}

interface MateriaisAdminTableProps {
  materiaisIniciais: Material[]
  disciplinasDisponiveis: Disciplina[]
}

export function MateriaisAdminTable({ materiaisIniciais, disciplinasDisponiveis }: MateriaisAdminTableProps) {
  const [materiais, setMateriais] = useState<Material[]>(materiaisIniciais)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const [uploadando, setUploadando] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    nome: '',
    tipo: 'PDF' as 'PDF' | 'VIDEO',
    arquivoPdfUrl: '',
    arquivoVideoUrl: '',
    totalPaginas: '',
    duracaoSegundos: '',
    disciplinaIds: [] as string[],
  })

  const resetForm = () => setForm({
    nome: '',
    tipo: 'PDF',
    arquivoPdfUrl: '',
    arquivoVideoUrl: '',
    totalPaginas: '',
    duracaoSegundos: '',
    disciplinaIds: [],
  })

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadando(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.fileUrl) {
        setForm(p => ({
          ...p,
          arquivoPdfUrl: json.fileUrl,
          nome: p.nome || file.name.replace(/\.pdf$/i, ''),
          totalPaginas: json.totalPaginas ? String(json.totalPaginas) : p.totalPaginas,
        }))
      } else {
        alert(json.error || 'Erro ao fazer upload')
      }
    } catch {
      alert('Erro ao fazer upload')
    } finally {
      setUploadando(false)
    }
  }

  const toggleDisciplina = (id: string) => {
    setForm(p => ({
      ...p,
      disciplinaIds: p.disciplinaIds.includes(id)
        ? p.disciplinaIds.filter(d => d !== id)
        : [...p.disciplinaIds, id],
    }))
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim() || form.disciplinaIds.length === 0) {
      alert('Preencha o nome e selecione ao menos uma disciplina')
      return
    }
    setSalvando(true)

    const res = await adminCriarMaterial({
      nome: form.nome,
      tipo: form.tipo,
      arquivoPdfUrl: form.tipo === 'PDF' ? form.arquivoPdfUrl || undefined : undefined,
      arquivoVideoUrl: form.tipo === 'VIDEO' ? form.arquivoVideoUrl || undefined : undefined,
      totalPaginas: form.tipo === 'PDF' ? parseInt(form.totalPaginas) || 0 : 0,
      duracaoSegundos: form.tipo === 'VIDEO' ? parseInt(form.duracaoSegundos) || undefined : undefined,
      disciplinaIds: form.disciplinaIds,
    })

    setSalvando(false)

    if (res.error) {
      alert(res.error)
    } else if (res.success && res.data) {
      setMateriais(prev => [...prev, res.data as Material])
      setModalAberto(false)
      resetForm()
    }
  }

  const handleDeletar = async (id: string) => {
    if (!confirm('Deletar este material?')) return
    setRemovendoId(id)
    const res = await adminDeletarMaterial(id)
    setRemovendoId(null)
    if (res.error) { alert(res.error) }
    else { setMateriais(prev => prev.filter(m => m.id !== id)) }
  }

  const formatarDuracao = (segundos: number) => {
    const h = Math.floor(segundos / 3600)
    const m = Math.floor((segundos % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{materiais.length} material{materiais.length !== 1 ? 'is' : ''}</p>
        <Button size="sm" onClick={() => { resetForm(); setModalAberto(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Material
        </Button>
      </div>

      {materiais.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
          Nenhum material criado. Clique em "Novo Material" para começar.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Material</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Disciplinas</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Detalhes</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materiais.map(mat => (
                <tr key={mat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{mat.nome}</td>
                  <td className="px-4 py-3">
                    {mat.tipo === 'PDF'
                      ? <Badge variant="outline" className="gap-1 text-red-600 border-red-200"><FileText className="h-3 w-3" />PDF</Badge>
                      : <Badge variant="outline" className="gap-1 text-blue-600 border-blue-200"><Video className="h-3 w-3" />Vídeo</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {mat.disciplinas.map(d => (
                        <span
                          key={d.disciplina.id}
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: (d.disciplina.cor || '#3b82f6') + '20', color: d.disciplina.cor || '#3b82f6' }}
                        >
                          {d.disciplina.nome}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {mat.tipo === 'PDF' && mat.totalPaginas > 0 && `${mat.totalPaginas} págs`}
                    {mat.tipo === 'VIDEO' && mat.duracaoSegundos && formatarDuracao(mat.duracaoSegundos)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                      onClick={() => handleDeletar(mat.id)}
                      disabled={removendoId === mat.id}
                    >
                      {removendoId === mat.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSalvar}>
            <DialogHeader>
              <DialogTitle>Novo Material</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {/* Tipo */}
              <div className="grid gap-2">
                <Label>Tipo *</Label>
                <div className="flex gap-2">
                  {(['PDF', 'VIDEO'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, tipo: t, arquivoPdfUrl: '', arquivoVideoUrl: '' }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        form.tipo === t
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t === 'PDF' ? <FileText className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nome */}
              <div className="grid gap-2">
                <Label>Nome *</Label>
                <Input
                  value={form.nome}
                  onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Apostila de Direito Constitucional"
                  required
                />
              </div>

              {/* PDF */}
              {form.tipo === 'PDF' && (
                <>
                  <div className="grid gap-2">
                    <Label>Arquivo PDF</Label>
                    <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleUploadPdf} />
                    {form.arquivoPdfUrl ? (
                      <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-green-50 text-green-700 text-sm">
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate flex-1">Arquivo carregado</span>
                        <button type="button" onClick={() => setForm(p => ({ ...p, arquivoPdfUrl: '' }))}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadando}
                      >
                        {uploadando
                          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
                          : <><Upload className="h-4 w-4 mr-2" />Selecionar PDF</>}
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label>Total de Páginas</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.totalPaginas}
                      onChange={e => setForm(p => ({ ...p, totalPaginas: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </>
              )}

              {/* VIDEO */}
              {form.tipo === 'VIDEO' && (
                <>
                  <div className="grid gap-2">
                    <Label>URL do Vídeo</Label>
                    <Input
                      value={form.arquivoVideoUrl}
                      onChange={e => setForm(p => ({ ...p, arquivoVideoUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Duração (segundos)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.duracaoSegundos}
                      onChange={e => setForm(p => ({ ...p, duracaoSegundos: e.target.value }))}
                      placeholder="Ex: 3600 para 1 hora"
                    />
                  </div>
                </>
              )}

              {/* Disciplinas */}
              <div className="grid gap-2">
                <Label>Disciplinas * <span className="text-slate-400 font-normal">(selecione ao menos uma)</span></Label>
                {disciplinasDisponiveis.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Crie disciplinas antes de adicionar materiais.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {disciplinasDisponiveis.map(d => {
                      const selecionada = form.disciplinaIds.includes(d.id)
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDisciplina(d.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                          style={selecionada
                            ? { backgroundColor: d.cor || '#3b82f6', borderColor: d.cor || '#3b82f6', color: 'white' }
                            : { borderColor: d.cor || '#3b82f6', color: d.cor || '#3b82f6' }}
                        >
                          {d.nome}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvando || uploadando}>
                {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Material
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
