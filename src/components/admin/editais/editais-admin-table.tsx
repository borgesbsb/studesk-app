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
import { Plus, Trash2, Pencil, Loader2, BookOpen, ExternalLink, LayoutList, FileUp, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react'
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

type EtapaImport = 'upload' | 'extraindo' | 'revisao'

interface DisciplinaMap {
  nome: string
  pagina_inicio: number
  pagina_fim: number
}

interface DisciplinaExtraida {
  nome: string
  conteudo: string
  incluir: boolean
}

interface CargoExtraido {
  nome: string
  disciplinasMap: DisciplinaMap[]      // mapeamento de páginas vindo do Passo 1
  disciplinas: DisciplinaExtraida[]    // conteúdo extraído no Passo 2
}

interface DadosExtraidos {
  nome: string
  orgao: string
  ano: string
}

interface ProgressoExtracao {
  mensagem: string
  sub?: string
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
  const [progresso, setProgresso] = useState<ProgressoExtracao | null>(null)
  const [dadosExtraidos, setDadosExtraidos] = useState<DadosExtraidos | null>(null)
  const [cargosExtraidos, setCargosExtraidos] = useState<CargoExtraido[]>([])
  const [cargoSelecionado, setCargoSelecionado] = useState<string>('')
  const [cargoExpandido, setCargoExpandido] = useState<string>('')
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
    setCargosExtraidos([])
    setCargoSelecionado('')
    setCargoExpandido('')
    setProgresso(null)
    setEtapaImport('upload')
    setModalImportar(true)
  }

  const handleImportar = async () => {
    if (!arquivoPdf) return
    setErroImport(null)
    setEtapaImport('extraindo')

    try {
      // Passo 1 — envia PDF completo para o Claude mapear cargos + disciplinas + páginas
      setProgresso({ mensagem: 'Mapeando estrutura do edital…', sub: 'Identificando cargos e disciplinas' })
      const fd1 = new FormData()
      fd1.append('file', arquivoPdf)
      const res1 = await fetch('/api/admin/editais/extrair-pdf', { method: 'POST', body: fd1 })
      const json1 = await res1.json()
      if (!res1.ok || !json1.success) throw new Error(json1.error || 'Erro ao processar PDF')

      const d = json1.data
      const cargosRaw: { nome: string; disciplinas: DisciplinaMap[] }[] = Array.isArray(d.cargos) ? d.cargos : []

      setDadosExtraidos({ nome: d.nome || '', orgao: d.orgao || '', ano: d.ano ? String(d.ano) : '' })

      if (cargosRaw.length === 0) throw new Error('Nenhum cargo encontrado no edital.')

      // Monta resultado direto do Pass 1 — disciplinas sem conteúdo por ora
      const resultado: CargoExtraido[] = cargosRaw.map(({ nome: cargo, disciplinas: disciplinasMap }) => ({
        nome: cargo,
        disciplinasMap,
        disciplinas: disciplinasMap.map(d => ({ nome: d.nome, conteudo: '', incluir: true })),
      }))

      setCargosExtraidos(resultado)
      // Pré-seleciona o primeiro cargo com disciplinas (ou o primeiro)
      const primeiro = resultado.find(c => c.disciplinas.length > 0) ?? resultado[0]
      setCargoSelecionado(primeiro?.nome ?? '')
      setCargoExpandido(primeiro?.nome ?? '')
      setEtapaImport('revisao')
    } catch (err: any) {
      setErroImport(err?.message || 'Erro desconhecido')
      setEtapaImport('upload')
    } finally {
      setProgresso(null)
    }
  }

  const handleConfirmarImport = async () => {
    if (!dadosExtraidos || !cargoSelecionado) return
    const cargo = cargosExtraidos.find(c => c.nome === cargoSelecionado)
    if (!cargo) return

    setSalvandoImport(true)
    try {
      const res = await adminCriarEditalComDisciplinas({
        edital: {
          nome: dadosExtraidos.nome.trim(),
          orgao: dadosExtraidos.orgao.trim() || undefined,
          cargo: cargoSelecionado,
          ano: dadosExtraidos.ano ? parseInt(dadosExtraidos.ano) : undefined,
        },
        disciplinas: cargo.disciplinas
          .filter(d => d.incluir && d.nome.trim())
          .map(d => ({ nome: d.nome.trim(), conteudo: d.conteudo })),
      })
      if ('error' in res && res.error) { alert(res.error); return }
      if (res.success && res.data) {
        setEditais(prev => [...prev, res.data as Edital])

        // Salva o PDF associado ao edital criado
        const editalId = (res.data as Edital).id
        const fdPdf = new FormData()
        fdPdf.append('file', arquivoPdf)
        await fetch(`/api/admin/editais/${editalId}/salvar-pdf`, { method: 'POST', body: fdPdf })
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

  const cargoAtivo = cargosExtraidos.find(c => c.nome === cargoSelecionado)

  const toggleDisciplina = (cargoNome: string, idx: number, valor: boolean) => {
    setCargosExtraidos(prev => prev.map(c =>
      c.nome === cargoNome
        ? { ...c, disciplinas: c.disciplinas.map((d, i) => i === idx ? { ...d, incluir: valor } : d) }
        : c
    ))
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
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-orange-500 hover:bg-orange-50" title="Edital verticalizado">
                          <LayoutList className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link href={`/admin/editais/${edital.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500 hover:bg-blue-50" title="Gerenciar disciplinas">
                          <BookOpen className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Editar edital" onClick={() => abrirEditar(edital)}>
                        <Pencil className="h-3.5 w-3.5 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" title="Deletar edital"
                        onClick={() => handleDeletar(edital.id, edital.nome)} disabled={removendoId === edital.id}
                      >
                        {removendoId === edital.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
      <Dialog open={modalImportar} onOpenChange={open => { if (!open && etapaImport !== 'extraindo') setModalImportar(false) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {etapaImport === 'upload' && 'Importar edital via PDF'}
              {etapaImport === 'extraindo' && 'Analisando edital…'}
              {etapaImport === 'revisao' && 'Revisar e criar edital'}
            </DialogTitle>
          </DialogHeader>

          {/* Upload */}
          {etapaImport === 'upload' && (
            <div className="py-4 space-y-4">
              <p className="text-sm text-slate-500">
                Envie o PDF do edital. A IA irá extrair automaticamente os cargos, as disciplinas e o conteúdo programático de cada um.
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
                  id="pdf-import-input" type="file" accept=".pdf" className="hidden"
                  onChange={e => setArquivoPdf(e.target.files?.[0] ?? null)}
                />
              </div>
              {erroImport && (
                <div className={`text-sm rounded px-3 py-2 border ${erroImport.includes('imagem') ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
                  {erroImport}
                  {erroImport.includes('imagem') && (
                    <div className="mt-2">
                      <button className="text-amber-800 underline text-xs" onClick={() => { setModalImportar(false); abrirCriar() }}>
                        Criar manualmente →
                      </button>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setModalImportar(false)}>Cancelar</Button>
                <Button disabled={!arquivoPdf} onClick={handleImportar}>
                  Importar
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Extraindo */}
          {etapaImport === 'extraindo' && progresso && (
            <div className="py-16 flex flex-col items-center gap-4 text-slate-500">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-slate-700">{progresso.mensagem}</p>
                {progresso.sub && <p className="text-xs text-slate-400">{progresso.sub}</p>}
              </div>
            </div>
          )}

          {/* Revisão */}
          {etapaImport === 'revisao' && dadosExtraidos && (
            <div className="flex flex-col gap-4 overflow-hidden flex-1 min-h-0">
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 shrink-0">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {cargosExtraidos.length} cargo{cargosExtraidos.length !== 1 ? 's' : ''} encontrado{cargosExtraidos.length !== 1 ? 's' : ''}. Selecione um cargo para criar o edital.
              </div>

              {/* Metadados */}
              <div className="grid grid-cols-3 gap-3 shrink-0">
                <div className="col-span-2 grid gap-1.5">
                  <Label className="text-xs">Nome do concurso</Label>
                  <Input
                    value={dadosExtraidos.nome}
                    onChange={e => setDadosExtraidos(p => p ? { ...p, nome: e.target.value } : p)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Ano</Label>
                  <Input
                    value={dadosExtraidos.ano}
                    onChange={e => setDadosExtraidos(p => p ? { ...p, ano: e.target.value } : p)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-3 grid gap-1.5">
                  <Label className="text-xs">Órgão / Banca</Label>
                  <Input
                    value={dadosExtraidos.orgao}
                    onChange={e => setDadosExtraidos(p => p ? { ...p, orgao: e.target.value } : p)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Cargos + disciplinas */}
              <div className="overflow-y-auto flex-1 border rounded-lg divide-y">
                {cargosExtraidos.map(cargo => {
                  const selecionado = cargoSelecionado === cargo.nome
                  const expandido = cargoExpandido === cargo.nome
                  const incluidas = cargo.disciplinas.filter(d => d.incluir).length

                  return (
                    <div key={cargo.nome} className={`transition-colors ${selecionado ? 'bg-blue-50' : 'bg-white'}`}>
                      {/* Cabeçalho do cargo */}
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <input
                          type="radio"
                          name="cargo-selecionado"
                          checked={selecionado}
                          onChange={() => {
                            setCargoSelecionado(cargo.nome)
                            setCargoExpandido(cargo.nome)
                          }}
                          className="h-4 w-4 accent-blue-600 shrink-0"
                        />
                        <button
                          type="button"
                          className="flex-1 flex items-center justify-between text-left"
                          onClick={() => setCargoExpandido(expandido ? '' : cargo.nome)}
                        >
                          <span className={`text-sm font-medium ${selecionado ? 'text-blue-700' : 'text-slate-700'}`}>
                            {cargo.nome}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {incluidas}/{cargo.disciplinas.length} disciplina{cargo.disciplinas.length !== 1 ? 's' : ''}
                            </span>
                            {expandido
                              ? <ChevronDown className="h-4 w-4 text-slate-400" />
                              : <ChevronRight className="h-4 w-4 text-slate-400" />
                            }
                          </div>
                        </button>
                      </div>

                      {/* Disciplinas do cargo */}
                      {expandido && (
                        <div className="border-t bg-white">
                          {cargo.disciplinas.length === 0 ? (
                            <p className="px-8 py-3 text-xs text-slate-400">Nenhuma disciplina encontrada para este cargo.</p>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 px-8 py-1.5 border-b bg-slate-50">
                                <button
                                  type="button"
                                  className="text-xs text-blue-600 hover:underline"
                                  onClick={() => setCargosExtraidos(prev => prev.map(c =>
                                    c.nome === cargo.nome ? { ...c, disciplinas: c.disciplinas.map(d => ({ ...d, incluir: true })) } : c
                                  ))}
                                >
                                  Marcar todas
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                  type="button"
                                  className="text-xs text-slate-500 hover:underline"
                                  onClick={() => setCargosExtraidos(prev => prev.map(c =>
                                    c.nome === cargo.nome ? { ...c, disciplinas: c.disciplinas.map(d => ({ ...d, incluir: false })) } : c
                                  ))}
                                >
                                  Desmarcar todas
                                </button>
                              </div>
                              {cargo.disciplinas.map((disc, i) => (
                                <div key={i} className="flex items-center gap-3 px-8 py-1.5 border-b last:border-b-0 hover:bg-slate-50">
                                  <input
                                    type="checkbox"
                                    checked={disc.incluir}
                                    onChange={e => toggleDisciplina(cargo.nome, i, e.target.checked)}
                                    className="h-3.5 w-3.5 accent-blue-600 shrink-0"
                                  />
                                  <span className={`text-sm ${disc.incluir ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                                    {disc.nome}
                                  </span>
                                  {disc.conteudo && (
                                    <span className="ml-auto text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                      com conteúdo
                                    </span>
                                  )}
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <DialogFooter className="shrink-0">
                <Button variant="outline" onClick={() => setEtapaImport('upload')}>Voltar</Button>
                <Button
                  disabled={!dadosExtraidos.nome.trim() || !cargoSelecionado || salvandoImport}
                  onClick={handleConfirmarImport}
                >
                  {salvandoImport && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar edital — {cargoAtivo ? `${cargoAtivo.disciplinas.filter(d => d.incluir).length} disciplinas` : ''}
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
                  type="number" value={form.ano}
                  onChange={e => setForm(p => ({ ...p, ano: e.target.value }))}
                  placeholder="Ex: 2025" min={2000} max={2099}
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
