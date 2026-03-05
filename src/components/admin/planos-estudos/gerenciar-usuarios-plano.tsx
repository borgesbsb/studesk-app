'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Trash2, UserPlus, Search, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { adminAdicionarUsuario, adminRemoverUsuario, adminAprovarSolicitacao, adminRejeitarSolicitacao } from '@/interface/actions/admin/plano-estudos'
import { getUsers } from '@/interface/actions/admin/users'

interface UsuarioAtribuido {
  id: string
  userId: string
  dataAtribuicao: Date
  usuario: {
    id: string
    name: string | null
    email: string
    hash: string
  }
}

interface Solicitacao {
  id: string
  userId: string
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface GerenciarUsuariosPlanoProps {
  planoId: string
  usuariosIniciais: UsuarioAtribuido[]
  solicitacoesIniciais: Solicitacao[]
}

export function GerenciarUsuariosPlano({ planoId, usuariosIniciais, solicitacoesIniciais }: GerenciarUsuariosPlanoProps) {
  const [usuarios, setUsuarios] = useState<UsuarioAtribuido[]>(usuariosIniciais)
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>(solicitacoesIniciais)
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const [adicionando, setAdicionando] = useState(false)
  const [processandoSolId, setProcessandoSolId] = useState<string | null>(null)

  // Busca de usuários para adicionar
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<{ id: string; name: string | null; email: string }[]>([])
  const [buscando, setBuscando] = useState(false)
  const [showResultados, setShowResultados] = useState(false)

  const buscarUsuarios = async (termo: string) => {
    if (!termo.trim()) {
      setResultados([])
      setShowResultados(false)
      return
    }
    setBuscando(true)
    const res = await getUsers(1, 10, termo)
    setBuscando(false)
    if (res.success && 'users' in res) {
      const atribuidos = new Set(usuarios.map(u => u.userId))
      setResultados((res.users as { id: string; name: string | null; email: string }[]).filter(u => !atribuidos.has(u.id)))
      setShowResultados(true)
    }
  }

  const handleAdicionar = async (userId: string) => {
    setAdicionando(true)
    const res = await adminAdicionarUsuario(planoId, userId)
    setAdicionando(false)
    if (res.error) {
      alert(res.error)
    } else if (res.success && res.data) {
      setUsuarios(prev => [res.data as UsuarioAtribuido, ...prev])
      setBusca('')
      setResultados([])
      setShowResultados(false)
    }
  }

  const handleRemover = async (userId: string) => {
    if (!confirm('Remover este usuário do plano? O progresso dele será excluído.')) return
    setRemovendoId(userId)
    const res = await adminRemoverUsuario(planoId, userId)
    setRemovendoId(null)
    if (res.error) {
      alert(res.error)
    } else {
      setUsuarios(prev => prev.filter(u => u.userId !== userId))
    }
  }

  // Debounce na busca
  useEffect(() => {
    const timer = setTimeout(() => {
      if (busca.trim()) buscarUsuarios(busca)
      else { setResultados([]); setShowResultados(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [busca])

  const handleAprovar = async (sol: Solicitacao) => {
    setProcessandoSolId(sol.id)
    const res = await adminAprovarSolicitacao(sol.id)
    setProcessandoSolId(null)
    if (res.error) {
      alert(res.error)
    } else {
      setSolicitacoes(prev => prev.filter(s => s.id !== sol.id))
      if (res.success && res.data) {
        setUsuarios(prev => [res.data as UsuarioAtribuido, ...prev])
      }
    }
  }

  const handleRejeitar = async (solId: string) => {
    if (!confirm('Rejeitar esta solicitação?')) return
    setProcessandoSolId(solId)
    const res = await adminRejeitarSolicitacao(solId)
    setProcessandoSolId(null)
    if (res.error) {
      alert(res.error)
    } else {
      setSolicitacoes(prev => prev.filter(s => s.id !== solId))
    }
  }

  return (
    <div className="space-y-4">
      {/* Seletor de usuário */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Buscar usuário por nome ou e-mail..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onFocus={() => busca.trim() && setShowResultados(true)}
              onBlur={() => setTimeout(() => setShowResultados(false), 150)}
            />
            {buscando && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
            )}
          </div>
        </div>

        {showResultados && resultados.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {resultados.map(u => (
              <button
                key={u.id}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between group"
                onMouseDown={() => handleAdicionar(u.id)}
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{u.name || '(sem nome)'}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-1 text-blue-600 opacity-0 group-hover:opacity-100">
                  {adicionando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  <span className="text-xs">Adicionar</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {showResultados && resultados.length === 0 && !buscando && busca.trim() && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg px-4 py-3 text-sm text-slate-500">
            Nenhum usuário encontrado (ou todos já estão atribuídos)
          </div>
        )}
      </div>

      {/* Solicitações Pendentes */}
      {solicitacoes.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-amber-200 flex items-center gap-2">
            <span className="text-sm font-semibold text-amber-800">Solicitações Pendentes</span>
            <Badge variant="secondary" className="bg-amber-200 text-amber-900 text-xs">
              {solicitacoes.length}
            </Badge>
          </div>
          <Table>
            <TableBody>
              {solicitacoes.map((sol) => (
                <TableRow key={sol.id} className="bg-amber-50 hover:bg-amber-100">
                  <TableCell className="font-medium text-sm text-slate-900">
                    {sol.user.name || '(sem nome)'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{sol.user.email}</TableCell>
                  <TableCell className="text-center text-xs text-slate-500">
                    {format(new Date(sol.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-green-600 hover:bg-green-50 gap-1 text-xs"
                        onClick={() => handleAprovar(sol)}
                        disabled={processandoSolId === sol.id}
                      >
                        {processandoSolId === sol.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <CheckCircle className="h-3.5 w-3.5" />}
                        Aprovar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-red-600 hover:bg-red-50 gap-1 text-xs"
                        onClick={() => handleRejeitar(sol.id)}
                        disabled={processandoSolId === sol.id}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Rejeitar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Lista de usuários atribuídos */}
      {usuarios.length === 0 ? (
        <div className="text-center py-6 text-slate-500 border rounded-lg bg-slate-50 text-sm">
          Nenhum usuário atribuído a este plano.
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Usuário</TableHead>
                <TableHead className="font-semibold">E-mail</TableHead>
                <TableHead className="font-semibold text-center">Atribuído em</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium text-sm">
                    {u.usuario.name || '(sem nome)'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{u.usuario.email}</TableCell>
                  <TableCell className="text-center text-sm text-slate-500">
                    {format(new Date(u.dataAtribuicao), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                      onClick={() => handleRemover(u.userId)}
                      disabled={removendoId === u.userId}
                    >
                      {removendoId === u.userId
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
