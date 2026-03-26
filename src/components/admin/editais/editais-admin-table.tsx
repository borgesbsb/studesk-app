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
import { Plus, Trash2, Pencil, Loader2, BookOpen, ExternalLink, LayoutList, FileUp, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import {
  adminCriarEdital,
  adminAtualizarEdital,
  adminDeletarEdital,
  adminCriarEditalComDisciplinas,
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

type EtapaImport = 'upload' | 'processando' | 'revisao' | 'processando_disc' | 'revisao_disc'

interface DisciplinaExtraida {
  nome: string
  conteudo: string
  incluir: boolean
}

interface DadosExtraidos {
  nome: string
  orgao: string
  cargo: string
  ano: string
  cargos: string[]
}

export function EditaisAdminTable({ editaisIniciais }: EditaisAdminTableProps) {
  const [editais, setEditais] = useState<Edital[]>(editaisIniciais)
  const [modalEdital, setModalEdital] = useState(false)
  const [editando, setEditando] = useState<Edital | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  // Import PDF
  const [modalImportar, setModalImportar] = useState(false)
  const [etapaImport, setEtapaImport] = useState<EtapaImport>('upload')
  const [arquivoPdf, setArquivoPdf] = useState<File | null>(null)
  const [erroImport, setErroImport] = useState<string | null>(null)
  const [dadosExtraidos, setDadosExtraidos] = useState<DadosExtraidos | null>(null)
  const [disciplinasExtraidas, setDisciplinasExtraidas] = useState<DisciplinaExtraida[]>([])
  const [salvandoImport, setSalvandoImport] = useState(false)

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

  const abrirImportar = () => {
    setArquivoPdf(null)
    setErroImport(null)
    setDadosExtraidos(null)
    setDisciplinasExtraidas([])
    setEtapaImport('upload')
    setModalImportar(true)
  }

  const handleExtrairDisciplinas = async () => {
    if (!arquivoPdf || !dadosExtraidos?.cargo.trim()) return
    setErroImport(null)
    setEtapaImport('processando_disc')
    try {
      const fd = new FormData()
      fd.append('file', arquivoPdf)
      fd.append('cargo', dadosExtraidos.cargo.trim())
      const res = await fetch('/api/admin/editais/extrair-disciplinas', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao extrair disciplinas')
      setDisciplinasExtraidas(json.data.disciplinas.map((d: any) => ({ ...d, incluir: true })))
      setEtapaImport('revisao_disc')
    } catch (err: any) {
      setErroImport(err?.message || 'Erro desconhecido')
      setEtapaImport('revisao')
    }
  }

  const handleExtrairPdf = async () => {
    if (!arquivoPdf) return
    setErroImport(null)
    setEtapaImport('processando')
    try {
      const fd = new FormData()
      fd.append('file', arquivoPdf)
      const res = await fetch('/api/admin/editais/extrair-pdf', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao processar PDF')

      const d = json.data
      setDadosExtraidos({
        nome: d.nome || '',
        orgao: d.orgao || '',
        cargo: d.cargo || '',
        ano: d.ano ? String(d.ano) : '',
        cargos: Array.isArray(d.cargos) ? d.cargos : [],
      })
      setEtapaImport('revisao')
    } catch (err: any) {
      setErroImport(err?.message || 'Erro desconhecido')
      setEtapaImport('upload')
    }
  }

  const handleConfirmarImport = async () => {
    if (!dadosExtraidos) return
    setSalvandoImport(true)
    try {
      const res = await adminCriarEditalComDisciplinas({
        edital: {
          nome: dadosExtraidos.nome.trim(),
          orgao: dadosExtraidos.orgao.trim() || undefined,
          cargo: dadosExtraidos.cargo.trim() || undefined,
          ano: dadosExtraidos.ano ? parseInt(dadosExtraidos.ano) : undefined,
        },
        disciplinas: disciplinasExtraidas
          .filter(d => d.incluir && d.nome.trim())
          .map(d => ({ nome: d.nome.trim(), conteudo: d.conteudo })),
      })
      if ('error' in res && res.error) { alert(res.error); return }
      if (res.success && res.data) {
        setEditais(prev => [...prev, res.data as Edital])
      }
      setModalImportar(false)
    } catch (err: any) {
      alert(err?.message || 'Erro ao criar edital')
    } finally {
      setSalvandoImport(false)
    }
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
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={abrirImportar}>
            <FileUp className="h-4 w-4 mr-1" /> Importar PDF
          </Button>
          <Button size="sm" onClick={abrirCriar}>
            <Plus className="h-4 w-4 mr-1" /> Novo Edital
          </Button>
        </div>
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

      {/* Modal importar PDF */}
      <Dialog open={modalImportar} onOpenChange={open => { if (!open) setModalImportar(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {etapaImport === 'upload' && 'Importar edital via PDF'}
              {etapaImport === 'processando' && 'Extraindo dados do edital…'}
              {etapaImport === 'revisao' && 'Revisar dados extraídos'}
              {etapaImport === 'processando_disc' && 'Extraindo disciplinas…'}
              {etapaImport === 'revisao_disc' && 'Disciplinas encontradas'}
            </DialogTitle>
          </DialogHeader>

          {etapaImport === 'upload' && (
            <div className="py-4 space-y-4">
              <p className="text-sm text-slate-500">
                Envie o PDF do edital. A IA irá ler a primeira página e extrair automaticamente o nome do concurso, órgão, cargo e ano.
              </p>
              <div
                className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-slate-300 transition-colors"
                onClick={() => document.getElementById('pdf-import-input')?.click()}
              >
                <FileUp className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                {arquivoPdf ? (
                  <p className="text-sm font-medium text-slate-700">{arquivoPdf.name}</p>
                ) : (
                  <p className="text-sm text-slate-400">Clique para selecionar o PDF</p>
                )}
                <input
                  id="pdf-import-input"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => setArquivoPdf(e.target.files?.[0] ?? null)}
                />
              </div>
              {erroImport && (
                <div className={`text-sm rounded px-3 py-2 border ${erroImport.includes('imagem') ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
                  {erroImport}
                  {erroImport.includes('imagem') && (
                    <div className="mt-2">
                      <button
                        className="text-amber-800 underline text-xs"
                        onClick={() => { setModalImportar(false); abrirCriar() }}
                      >
                        Criar manualmente →
                      </button>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setModalImportar(false)}>Cancelar</Button>
                <Button disabled={!arquivoPdf} onClick={handleExtrairPdf}>
                  Extrair dados
                </Button>
              </DialogFooter>
            </div>
          )}

          {(etapaImport === 'processando' || etapaImport === 'processando_disc') && (
            <div className="py-12 flex flex-col items-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <p className="text-sm">
                {etapaImport === 'processando' ? 'A IA está analisando o edital…' : 'A IA está extraindo as disciplinas…'}
              </p>
              <p className="text-xs text-slate-400">Isso pode levar alguns segundos</p>
            </div>
          )}

          {etapaImport === 'revisao' && dadosExtraidos && (
            <div className="py-2 space-y-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Dados extraídos com sucesso. Revise e confirme antes de criar.
              </div>

              <div className="space-y-3">
                {[
                  { id: 'nome', label: 'Nome do concurso *' },
                  { id: 'orgao', label: 'Órgão / Banca' },
                  { id: 'cargo', label: 'Cargo' },
                  { id: 'ano', label: 'Ano' },
                ].map(({ id, label }) => (
                  <div key={id} className="grid gap-1.5">
                    <Label>{label}</Label>
                    <Input
                      value={dadosExtraidos[id as keyof DadosExtraidos] as string}
                      onChange={e => setDadosExtraidos(prev => prev ? ({ ...prev, [id]: e.target.value }) : prev)}
                    />
                  </div>
                ))}
              </div>
              {dadosExtraidos.cargos.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Cargos encontrados no edital</Label>
                  <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                    {dadosExtraidos.cargos.map((cargo, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setDadosExtraidos(prev => prev ? ({ ...prev, cargo }) : prev)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-blue-50 hover:text-blue-700 ${dadosExtraidos.cargo === cargo ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'}`}
                      >
                        {cargo}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">Clique em um cargo para usá-lo no campo acima.</p>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEtapaImport('upload')}>Voltar</Button>
                <Button
                  variant="outline"
                  disabled={!dadosExtraidos.cargo.trim()}
                  onClick={handleExtrairDisciplinas}
                >
                  Extrair disciplinas
                </Button>
                <Button
                  disabled={!dadosExtraidos.nome.trim() || salvandoImport}
                  onClick={handleConfirmarImport}
                >
                  {salvandoImport && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar sem disciplinas
                </Button>
              </DialogFooter>
            </div>
          )}

          {etapaImport === 'revisao_disc' && (
            <div className="py-2 space-y-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {disciplinasExtraidas.length} disciplina{disciplinasExtraidas.length !== 1 ? 's' : ''} encontrada{disciplinasExtraidas.length !== 1 ? 's' : ''} para "{dadosExtraidos?.cargo}". Selecione as que deseja importar.
              </div>
              {erroImport && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{erroImport}</p>
              )}
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {disciplinasExtraidas.map((disc, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={disc.incluir}
                      onChange={e => setDisciplinasExtraidas(prev => prev.map((d, j) => j === i ? { ...d, incluir: e.target.checked } : d))}
                      className="h-4 w-4 accent-blue-600 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={disc.nome}
                      onChange={e => setDisciplinasExtraidas(prev => prev.map((d, j) => j === i ? { ...d, nome: e.target.value } : d))}
                      className="flex-1 text-sm border-none outline-none bg-transparent text-slate-700"
                    />
                  </div>
                ))}
                {disciplinasExtraidas.length === 0 && (
                  <p className="px-3 py-4 text-sm text-slate-400 text-center">Nenhuma disciplina encontrada para este cargo.</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEtapaImport('revisao')}>Voltar</Button>
                <Button
                  disabled={!dadosExtraidos?.nome.trim() || salvandoImport}
                  onClick={handleConfirmarImport}
                >
                  {salvandoImport && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar edital
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
