'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Plus, Search, Trash2, Loader2, ChevronDown, ChevronUp, Save } from 'lucide-react'
import {
  adminAdicionarDisciplina,
  adminRemoverDisciplina,
  adminAtualizarConteudoProgramatico,
} from '@/interface/actions/admin/editais'
import { adminListarDisciplinas } from '@/interface/actions/admin/disciplinas'
import { toast } from 'sonner'

interface Disciplina {
  id: string
  nome: string
  cor: string | null
}

interface EditalDisciplina {
  id: string
  disciplinaId: string
  conteudoProgramatico: string | null
  disciplina: Disciplina
}

interface GerenciarDisciplinasEditalProps {
  editalId: string
  disciplinasIniciais: EditalDisciplina[]
}

function DisciplinaItem({
  ed,
  index,
  onRemover,
  removendoId,
}: {
  ed: EditalDisciplina
  index: number
  onRemover: (ed: EditalDisciplina) => void
  removendoId: string | null
}) {
  const [expandido, setExpandido] = useState(false)
  const [conteudo, setConteudo] = useState(ed.conteudoProgramatico || '')
  const [salvando, setSalvando] = useState(false)
  const [sujo, setSujo] = useState(false)

  const handleSalvar = async () => {
    setSalvando(true)
    const res = await adminAtualizarConteudoProgramatico(ed.id, conteudo)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Conteúdo programático salvo!')
      setSujo(false)
    }
    setSalvando(false)
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Header da disciplina */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0">{index + 1}.</span>
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: ed.disciplina.cor || '#3b82f6' }}
        />
        <span className="flex-1 text-sm font-medium text-slate-700">{ed.disciplina.nome}</span>

        {ed.conteudoProgramatico && (
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Conteúdo preenchido" />
        )}

        <button
          type="button"
          onClick={() => setExpandido(v => !v)}
          className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0 p-1"
          title={expandido ? 'Recolher conteúdo' : 'Expandir conteúdo programático'}
        >
          {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
          onClick={() => onRemover(ed)}
          disabled={removendoId === ed.disciplinaId}
          title="Remover disciplina"
        >
          {removendoId === ed.disciplinaId
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Campo de conteúdo programático */}
      {expandido && (
        <div className="border-t border-slate-100 px-3 py-3 bg-slate-50 space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Conteúdo Programático
          </p>
          <Textarea
            value={conteudo}
            onChange={e => { setConteudo(e.target.value); setSujo(true) }}
            onPaste={e => {
              e.preventDefault()
              const raw = e.clipboardData.getData('text')
              // Normaliza quebras de linha de PDF: \n simples vira espaço, \n\n mantém parágrafo
              const normalizado = raw
                .replace(/\r\n/g, '\n')
                .replace(/([^\n])\n([^\n])/g, '$1 $2')
                .replace(/  +/g, ' ')
                .trim()
              const el = e.currentTarget
              const start = el.selectionStart
              const end = el.selectionEnd
              const novo = conteudo.slice(0, start) + normalizado + conteudo.slice(end)
              setConteudo(novo)
              setSujo(true)
              setTimeout(() => {
                el.selectionStart = el.selectionEnd = start + normalizado.length
              }, 0)
            }}
            placeholder="Descreva os tópicos cobrados nesta disciplina..."
            rows={6}
            className="text-sm resize-y bg-white"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {conteudo.length > 0 ? `${conteudo.length} caracteres` : 'Campo vazio'}
            </p>
            <Button
              size="sm"
              onClick={handleSalvar}
              disabled={salvando || !sujo}
              className="h-7 text-xs"
            >
              {salvando
                ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                : <Save className="h-3 w-3 mr-1" />}
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function GerenciarDisciplinasEdital({
  editalId,
  disciplinasIniciais,
}: GerenciarDisciplinasEditalProps) {
  const [disciplinasEdital, setDisciplinasEdital] = useState<EditalDisciplina[]>(disciplinasIniciais)
  const [todasDisciplinas, setTodasDisciplinas] = useState<Disciplina[]>([])
  const [busca, setBusca] = useState('')
  const [loadingDisc, setLoadingDisc] = useState(true)
  const [adicionandoId, setAdicionandoId] = useState<string | null>(null)
  const [removendoId, setRemovendoId] = useState<string | null>(null)

  // Sincroniza estado quando o servidor retorna dados atualizados (após router.refresh())
  useEffect(() => {
    setDisciplinasEdital(disciplinasIniciais)
  }, [disciplinasIniciais])

  useEffect(() => {
    adminListarDisciplinas().then(res => {
      if (res.success && res.data) {
        setTodasDisciplinas(res.data as unknown as Disciplina[])
      }
      setLoadingDisc(false)
    })
  }, [])

  const handleAdicionar = async (disciplina: Disciplina) => {
    setAdicionandoId(disciplina.id)
    const res = await adminAdicionarDisciplina(editalId, disciplina.id)
    if (res.error) {
      toast.error(res.error)
    } else if (res.success && res.data) {
      const nova: EditalDisciplina = {
        id: (res.data as any).id,
        disciplinaId: disciplina.id,
        conteudoProgramatico: null,
        disciplina,
      }
      setDisciplinasEdital(prev => [...prev, nova])
      toast.success(`"${disciplina.nome}" adicionada ao edital`)
    }
    setAdicionandoId(null)
  }

  const handleRemover = async (ed: EditalDisciplina) => {
    setRemovendoId(ed.disciplinaId)
    const res = await adminRemoverDisciplina(editalId, ed.disciplinaId)
    if (res.error) {
      toast.error(res.error)
    } else {
      setDisciplinasEdital(prev => prev.filter(d => d.disciplinaId !== ed.disciplinaId))
      toast.success(`"${ed.disciplina.nome}" removida do edital`)
    }
    setRemovendoId(null)
  }

  const idsNoEdital = new Set(disciplinasEdital.map(d => d.disciplinaId))

  const disponiveis = todasDisciplinas
    .filter(d => !idsNoEdital.has(d.id))
    .filter(d => d.nome.toLowerCase().includes(busca.toLowerCase()))

  const comConteudo = disciplinasEdital.filter(d => d.conteudoProgramatico).length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Coluna esquerda: disciplinas já no edital */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-orange-500" />
            Disciplinas do Edital
            <Badge variant="secondary" className="ml-auto">{disciplinasEdital.length}</Badge>
            {comConteudo > 0 && (
              <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                {comConteudo} com conteúdo
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {disciplinasEdital.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
              Nenhuma disciplina adicionada ainda.
              <br />
              Selecione disciplinas ao lado.
            </div>
          ) : (
            <div className="space-y-2">
              {disciplinasEdital.map((ed, idx) => (
                <DisciplinaItem
                  key={ed.id}
                  ed={ed}
                  index={idx}
                  onRemover={handleRemover}
                  removendoId={removendoId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coluna direita: disciplinas disponíveis para adicionar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-slate-500" />
            Adicionar Disciplinas
            <Badge variant="outline" className="ml-auto">{disponiveis.length} disponíveis</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar disciplinas..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          {loadingDisc ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Carregando disciplinas...
            </div>
          ) : disponiveis.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
              {busca
                ? `Nenhuma disciplina encontrada para "${busca}"`
                : 'Todas as disciplinas já foram adicionadas'}
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {disponiveis.map(d => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-200 transition-colors"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: d.cor || '#3b82f6' }}
                  />
                  <span className="flex-1 text-sm font-medium text-slate-700">{d.nome}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-orange-500 hover:text-orange-700 hover:bg-orange-100 flex-shrink-0"
                    onClick={() => handleAdicionar(d)}
                    disabled={adicionandoId === d.id}
                    title="Adicionar ao edital"
                  >
                    {adicionandoId === d.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Plus className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
