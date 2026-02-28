'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, Trash2, Loader2, Users } from 'lucide-react'
import { adminExcluirPlano } from '@/interface/actions/admin/plano-estudos'
import { useRouter } from 'next/navigation'

interface Plano {
  id: string
  nome: string
  descricao: string | null
  dataInicio: Date
  dataFim: Date
  ativo: boolean
  _count: { usuarios: number; semanas: number }
}

interface PlanosAdminTableProps {
  planos: Plano[]
}

export function PlanosAdminTable({ planos }: PlanosAdminTableProps) {
  const router = useRouter()
  const [deletandoId, setDeletandoId] = useState<string | null>(null)

  const handleExcluir = async (id: string, nome: string) => {
    if (!confirm(`Excluir o plano "${nome}"?\n\nIsso removerá todos os ciclos, disciplinas e dados de usuários.`)) return
    setDeletandoId(id)
    const res = await adminExcluirPlano(id)
    setDeletandoId(null)
    if (res.error) {
      alert(res.error)
    } else {
      router.refresh()
    }
  }

  if (planos.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 border rounded-lg bg-white">
        Nenhum plano criado. Crie o primeiro!
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="font-semibold">Nome</TableHead>
            <TableHead className="font-semibold text-center">Período</TableHead>
            <TableHead className="font-semibold text-center">Ciclos</TableHead>
            <TableHead className="font-semibold text-center">
              <span className="flex items-center justify-center gap-1">
                <Users className="h-4 w-4" /> Usuários
              </span>
            </TableHead>
            <TableHead className="font-semibold text-center">Status</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {planos.map((plano) => (
            <TableRow key={plano.id} className="hover:bg-slate-50">
              <TableCell>
                <div>
                  <p className="font-medium text-slate-900">{plano.nome}</p>
                  {plano.descricao && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{plano.descricao}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center text-sm text-slate-600">
                {format(new Date(plano.dataInicio), 'dd/MM/yy', { locale: ptBR })}
                {' – '}
                {format(new Date(plano.dataFim), 'dd/MM/yy', { locale: ptBR })}
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm font-medium">{plano._count.semanas}</span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm font-medium">{plano._count.usuarios}</span>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={plano.ativo ? 'default' : 'secondary'}>
                  {plano.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 justify-end">
                  <Link href={`/admin/plano-estudos/${plano.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                    onClick={() => handleExcluir(plano.id, plano.nome)}
                    disabled={deletandoId === plano.id}
                  >
                    {deletandoId === plano.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
