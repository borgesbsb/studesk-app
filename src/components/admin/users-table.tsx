'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { deleteUser } from '@/interface/actions/admin/users'
import { Search, Trash2, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface User {
  id: string
  name: string | null
  email: string
  hash: string
  createdAt: Date
  _count: {
    disciplinas: number
    materiaisEstudo: number
    planosEstudo: number
    simulados: number
  }
}

interface UsersTableProps {
  initialUsers: User[]
  initialTotal: number
}

export function UsersTable({ initialUsers, initialTotal }: UsersTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDelete = async (userId: string) => {
    setLoading(true)
    try {
      const result = await deleteUser(userId)
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error)
      }
    } catch (error) {
      alert('Erro ao deletar usuário')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    router.push(`/admin/users?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Buscar por email ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>Buscar</Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Hash</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Conteúdo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.name || 'Sem nome'}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                    {user.hash}
                  </code>
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {user._count.disciplinas} disc.
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {user._count.materiaisEstudo} mat.
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {user._count.planosEstudo} planos
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {user._count.simulados} sim.
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja deletar o usuário {user.email}?
                            Esta ação não pode ser desfeita e todos os dados do usuário serão removidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(user.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Deletar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-slate-600">
        Total de {initialTotal} usuários
      </div>
    </div>
  )
}
