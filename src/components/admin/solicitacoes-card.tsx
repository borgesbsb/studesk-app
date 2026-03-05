'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Loader2, CheckCircle, XCircle, ClipboardList } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { adminAprovarSolicitacao, adminRejeitarSolicitacao } from '@/interface/actions/admin/plano-estudos'

interface Solicitacao {
  id: string
  createdAt: Date
  user: { id: string; name: string | null; email: string }
  plano: { id: string; nome: string }
}

interface SolicitacoesCardProps {
  solicitacoesIniciais: Solicitacao[]
}

export function SolicitacoesCard({ solicitacoesIniciais }: SolicitacoesCardProps) {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>(solicitacoesIniciais)
  const [processandoId, setProcessandoId] = useState<string | null>(null)

  const handleAprovar = async (sol: Solicitacao) => {
    setProcessandoId(sol.id)
    const res = await adminAprovarSolicitacao(sol.id)
    setProcessandoId(null)
    if (res.error) {
      alert(res.error)
    } else {
      setSolicitacoes(prev => prev.filter(s => s.id !== sol.id))
    }
  }

  const handleRejeitar = async (solId: string) => {
    if (!confirm('Rejeitar esta solicitação?')) return
    setProcessandoId(solId)
    const res = await adminRejeitarSolicitacao(solId)
    setProcessandoId(null)
    if (res.error) {
      alert(res.error)
    } else {
      setSolicitacoes(prev => prev.filter(s => s.id !== solId))
    }
  }

  if (solicitacoes.length === 0) return null

  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-amber-600" />
          Solicitações de Acesso Pendentes
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 ml-1">
            {solicitacoes.length}
          </Badge>
        </CardTitle>
        <p className="text-sm text-slate-500">
          Usuários que solicitaram acesso a um plano no cadastro. Aprove para liberar o acesso.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-b-lg overflow-hidden border-t border-amber-100 bg-amber-50">
          <Table>
            <TableHeader>
              <TableRow className="bg-amber-100/60 hover:bg-amber-100/60">
                <TableHead className="font-semibold text-amber-900">Usuário</TableHead>
                <TableHead className="font-semibold text-amber-900">E-mail</TableHead>
                <TableHead className="font-semibold text-amber-900">Plano Solicitado</TableHead>
                <TableHead className="font-semibold text-amber-900 text-center">Data</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitacoes.map(sol => (
                <TableRow key={sol.id} className="bg-amber-50 hover:bg-amber-100/50">
                  <TableCell className="font-medium text-sm">
                    {sol.user.name || '(sem nome)'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{sol.user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-800">
                      {sol.plano.nome}
                    </Badge>
                  </TableCell>
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
                        disabled={processandoId === sol.id}
                      >
                        {processandoId === sol.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <CheckCircle className="h-3.5 w-3.5" />}
                        Aprovar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-red-600 hover:bg-red-50 gap-1 text-xs"
                        onClick={() => handleRejeitar(sol.id)}
                        disabled={processandoId === sol.id}
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
      </CardContent>
    </Card>
  )
}
