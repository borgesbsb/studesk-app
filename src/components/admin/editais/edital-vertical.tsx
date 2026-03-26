'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Printer, AlertCircle, Sparkles, Loader2, CheckCircle2, Trash2, FileUp, X } from 'lucide-react'
import { toast } from 'sonner'
import { adminImportarDisciplinas } from '@/interface/actions/admin/editais'

interface Disciplina {
  id: string
  nome: string
  cor: string | null
}

interface EditalDisciplina {
  id: string
  disciplinaId: string
  conteudoProgramatico: string | null
  conteudoVerticalizado: string | null
  disciplina: Disciplina
}

interface Edital {
  id: string
  nome: string
  orgao: string | null
  cargo: string | null
  ano: number | null
  disciplinas: EditalDisciplina[]
}

interface EditalVerticalProps {
  edital: Edital
}

function formatarConteudo(texto: string): string[] {
  return texto
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
}

type EtapaExtract = 'upload' | 'processando' | 'revisao'

interface DisciplinaExtraida {
  nome: string
  conteudo: string
  incluir: boolean
}

export function EditalVertical({ edital }: EditalVerticalProps) {
  const router = useRouter()
  const [verticalizando, setVerticalizando] = useState(false)
  const [limpando, setLimpando] = useState(false)
  const [resultado, setResultado] = useState<{ salvos: number; total: number } | null>(null)

  // Extração de disciplinas via PDF
  const [modalExtrair, setModalExtrair] = useState(false)
  const [etapaExtract, setEtapaExtract] = useState<EtapaExtract>('upload')
  const [arquivoPdf, setArquivoPdf] = useState<File | null>(null)
  const [cargoSelecionado, setCargoSelecionado] = useState(edital.cargo || '')
  const [disciplinasExtraidas, setDisciplinasExtraidas] = useState<DisciplinaExtraida[]>([])
  const [erroExtract, setErroExtract] = useState<string | null>(null)
  const [salvandoExtract, setSalvandoExtract] = useState(false)

  const abrirExtrair = () => {
    setArquivoPdf(null)
    setErroExtract(null)
    setDisciplinasExtraidas([])
    setCargoSelecionado(edital.cargo || '')
    setEtapaExtract('upload')
    setModalExtrair(true)
  }

  const handleExtrairDisciplinas = async () => {
    if (!arquivoPdf) return
    setErroExtract(null)
    setEtapaExtract('processando')
    try {
      const fd = new FormData()
      fd.append('file', arquivoPdf)
      fd.append('cargo', cargoSelecionado)
      const res = await fetch(`/api/admin/editais/${edital.id}/extrair-disciplinas`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao processar PDF')
      setDisciplinasExtraidas(json.data.disciplinas.map((d: any) => ({ ...d, incluir: true })))
      setEtapaExtract('revisao')
    } catch (err: any) {
      setErroExtract(err?.message || 'Erro desconhecido')
      setEtapaExtract('upload')
    }
  }

  const handleSalvarDisciplinas = async () => {
    const selecionadas = disciplinasExtraidas.filter(d => d.incluir && d.nome.trim())
    if (!selecionadas.length) return
    setSalvandoExtract(true)
    try {
      const res = await adminImportarDisciplinas(edital.id, selecionadas)
      if ('error' in res && res.error) { toast.error(res.error); return }
      toast.success(`${res.criadas} disciplina${res.criadas !== 1 ? 's' : ''} importada${res.criadas !== 1 ? 's' : ''} com sucesso!`)
      setModalExtrair(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar')
    } finally {
      setSalvandoExtract(false)
    }
  }

  const handleLimpar = async () => {
    if (!confirm('Limpar todo o conteúdo verticalizado?')) return
    setLimpando(true)
    try {
      const res = await fetch(`/api/admin/editais/${edital.id}/verticalizar`, { method: 'DELETE', credentials: 'include' })
      const data = await res.json()
      if (!res.ok || !data.success) { toast.error(data.error || 'Erro ao limpar'); return }
      toast.success('Conteúdo verticalizado limpo!')
      setResultado(null)
      router.refresh()
    } catch {
      toast.error('Erro de conexão.')
    } finally {
      setLimpando(false)
    }
  }

  const comConteudo = edital.disciplinas.filter(d => d.conteudoProgramatico)
  const semConteudo = edital.disciplinas.filter(d => !d.conteudoProgramatico)
  const verticalizadas = edital.disciplinas.filter(d => d.conteudoVerticalizado)

  const handleVerticalizar = async () => {
    setVerticalizando(true)
    setResultado(null)
    try {
      console.log('[verticalizar] iniciando fetch para edital:', edital.id)
      const res = await fetch(`/api/admin/editais/${edital.id}/verticalizar`, { method: 'POST', credentials: 'include' })
      console.log('[verticalizar] status:', res.status)
      const data = await res.json()
      console.log('[verticalizar] resposta:', data)
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Erro ao verticalizar', { duration: 10000 })
        return
      }
      setResultado({ salvos: data.salvos, total: data.total })
      toast.success(`${data.salvos} de ${data.total} disciplinas verticalizadas!`)
      router.refresh()
    } catch (err: any) {
      console.error('[verticalizar] erro:', err)
      toast.error(`Erro: ${err?.message || 'Erro de conexão'}`, { duration: 10000 })
    } finally {
      setVerticalizando(false)
    }
  }

  return (
    <div>
      {/* Barra de ações */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="space-y-0.5">
          <p className="text-sm text-slate-500">
            {comConteudo.length} de {edital.disciplinas.length} disciplinas com conteúdo programático
          </p>
          {verticalizadas.length > 0 && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {verticalizadas.length} verticalizadas pela IA
            </p>
          )}
          {semConteudo.length > 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {semConteudo.length} disciplina{semConteudo.length > 1 ? 's' : ''} sem conteúdo não {semConteudo.length > 1 ? 'serão exibidas' : 'será exibida'}
            </p>
          )}
          {resultado && (
            <p className={`text-xs flex items-center gap-1 ${resultado.salvos < resultado.total ? 'text-amber-600' : 'text-green-600'}`}>
              {resultado.salvos < resultado.total
                ? <AlertCircle className="h-3.5 w-3.5" />
                : <CheckCircle2 className="h-3.5 w-3.5" />}
              {resultado.salvos} de {resultado.total} verticalizadas — {resultado.salvos < resultado.total ? 'clique em "Tentar novamente" para processar o restante' : 'concluído'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {verticalizadas.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLimpar}
              disabled={limpando || verticalizando}
              className="gap-2 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              {limpando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Limpar verticalizado
            </Button>
          )}
          {comConteudo.length > 0 && (
            <Button
              variant="outline"
              onClick={handleVerticalizar}
              disabled={verticalizando}
              className="gap-2 border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              {verticalizando
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Sparkles className="h-4 w-4" />}
              {verticalizando
                ? 'Verticalizando...'
                : resultado && resultado.salvos < resultado.total
                  ? 'Tentar novamente'
                  : 'Verticalizar com IA'}
            </Button>
          )}
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Documento verticalizado */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm print:shadow-none print:border-none">
        {/* Cabeçalho do edital */}
        <div className="border-b border-slate-200 px-8 py-6 text-center print:px-0">
          <h1 className="text-xl font-bold text-slate-800 uppercase tracking-wide">{edital.nome}</h1>
          {(edital.orgao || edital.cargo || edital.ano) && (
            <div className="flex items-center justify-center gap-3 mt-1 text-sm text-slate-500">
              {edital.orgao && <span>{edital.orgao}</span>}
              {edital.orgao && edital.cargo && <span>·</span>}
              {edital.cargo && <span>{edital.cargo}</span>}
              {edital.ano && <span>· {edital.ano}</span>}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest">Conteúdo Programático Verticalizado</p>
        </div>

        {/* Disciplinas */}
        <div className="divide-y divide-slate-100">
          {comConteudo.map((ed, idx) => {
            const conteudo = ed.conteudoVerticalizado || ed.conteudoProgramatico!
            const topicos = formatarConteudo(conteudo)
            const isVerticalizado = !!ed.conteudoVerticalizado
            return (
              <div key={ed.id} className="px-8 py-5 print:px-4 print:py-4 print:break-inside-avoid">
                {/* Nome da disciplina */}
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-xs font-bold text-slate-400 w-6 text-right flex-shrink-0">{idx + 1}.</span>
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ed.disciplina.cor || '#3b82f6' }}
                  />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    {ed.disciplina.nome}
                  </h2>
                  {isVerticalizado && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-300 print:hidden">
                      IA
                    </Badge>
                  )}
                </div>

                {/* Tópicos */}
                <div className="ml-[3.25rem] space-y-1">
                  {topicos.map((topico, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-slate-300 flex-shrink-0 mt-0.5 text-xs">▸</span>
                      <span className="leading-relaxed">{topico}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {comConteudo.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Nenhuma disciplina possui conteúdo programático.</p>
            <p className="text-xs mt-1">Adicione o conteúdo em cada disciplina antes de gerar o edital vertical.</p>
          </div>
        )}
      </div>

      {/* Modal portal: extrair disciplinas do PDF */}
      {modalExtrair && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setModalExtrair(false)}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div
            style={{ position: 'relative', background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', width: '100%', maxWidth: 520, margin: '0 16px', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontWeight: 600, fontSize: 16, color: '#1e293b' }}>
                {etapaExtract === 'upload' && 'Extrair disciplinas do PDF'}
                {etapaExtract === 'processando' && 'Analisando edital…'}
                {etapaExtract === 'revisao' && 'Disciplinas encontradas'}
              </span>
              <button onClick={() => setModalExtrair(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, borderRadius: 6, display: 'flex' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Conteúdo */}
            <div style={{ padding: '16px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {etapaExtract === 'upload' && (
                <>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 6 }}>Cargo</label>
                    <input
                      type="text"
                      value={cargoSelecionado}
                      onChange={e => setCargoSelecionado(e.target.value)}
                      placeholder="Ex: Analista Judiciário - Área Administrativa"
                      style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: '#334155', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 6 }}>PDF do edital</label>
                    <div
                      onClick={() => document.getElementById('pdf-disciplinas-input')?.click()}
                      style={{ border: '2px dashed #cbd5e1', borderRadius: 8, padding: '28px 16px', textAlign: 'center', cursor: 'pointer' }}
                    >
                      <FileUp style={{ width: 28, height: 28, color: '#94a3b8', margin: '0 auto 8px' }} />
                      {arquivoPdf
                        ? <p style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>{arquivoPdf.name}</p>
                        : <p style={{ fontSize: 14, color: '#94a3b8' }}>Clique para selecionar o PDF</p>}
                      <input id="pdf-disciplinas-input" type="file" accept=".pdf" style={{ display: 'none' }}
                        onChange={e => setArquivoPdf(e.target.files?.[0] ?? null)} />
                    </div>
                  </div>
                  {erroExtract && (
                    <p style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px' }}>{erroExtract}</p>
                  )}
                </>
              )}

              {etapaExtract === 'processando' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0', color: '#64748b' }}>
                  <Loader2 style={{ width: 32, height: 32, color: '#94a3b8' }} className="animate-spin" />
                  <p style={{ fontSize: 14 }}>A IA está lendo o edital e extraindo as disciplinas…</p>
                  <p style={{ fontSize: 12, color: '#94a3b8' }}>Isso pode levar alguns segundos</p>
                </div>
              )}

              {etapaExtract === 'revisao' && (
                <>
                  <p style={{ fontSize: 13, color: '#059669', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} />
                    {disciplinasExtraidas.length} disciplina{disciplinasExtraidas.length !== 1 ? 's' : ''} encontrada{disciplinasExtraidas.length !== 1 ? 's' : ''}. Selecione as que deseja importar.
                  </p>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                    {disciplinasExtraidas.map((disc, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < disciplinasExtraidas.length - 1 ? '1px solid #f1f5f9' : 'none', background: disc.incluir ? '#f8fafc' : '#fff' }}>
                        <input
                          type="checkbox"
                          checked={disc.incluir}
                          onChange={e => setDisciplinasExtraidas(prev => prev.map((d, j) => j === i ? { ...d, incluir: e.target.checked } : d))}
                          style={{ width: 16, height: 16, accentColor: '#3b82f6', flexShrink: 0 }}
                        />
                        <input
                          type="text"
                          value={disc.nome}
                          onChange={e => setDisciplinasExtraidas(prev => prev.map((d, j) => j === i ? { ...d, nome: e.target.value } : d))}
                          style={{ flex: 1, fontSize: 13, color: '#334155', border: 'none', outline: 'none', background: 'transparent' }}
                        />
                      </div>
                    ))}
                    {disciplinasExtraidas.length === 0 && (
                      <p style={{ padding: '16px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>Nenhuma disciplina encontrada para este cargo.</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
              {etapaExtract === 'revisao' && (
                <Button variant="outline" onClick={() => setEtapaExtract('upload')}>Voltar</Button>
              )}
              <Button variant="outline" onClick={() => setModalExtrair(false)}>Cancelar</Button>
              {etapaExtract === 'upload' && (
                <Button disabled={!arquivoPdf || !cargoSelecionado.trim()} onClick={handleExtrairDisciplinas}>
                  Extrair
                </Button>
              )}
              {etapaExtract === 'revisao' && (
                <Button
                  disabled={!disciplinasExtraidas.some(d => d.incluir) || salvandoExtract}
                  onClick={handleSalvarDisciplinas}
                >
                  {salvandoExtract && <Loader2 style={{ width: 16, height: 16, marginRight: 6 }} className="animate-spin" />}
                  Importar selecionadas
                </Button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
