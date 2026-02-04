'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, User } from 'lucide-react'
import { searchUsers } from '@/interface/actions/admin/user-performance'

interface UserSearchProps {
  onSelectUser: (userId: string) => void
}

export function UserSearch({ onSelectUser }: UserSearchProps) {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true)
        const result = await searchUsers(query)
        if (result.success && result.users) {
          setUsers(result.users)
          setShowResults(true)
        }
        setLoading(false)
      } else {
        setUsers([])
        setShowResults(false)
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [query])

  const handleSelectUser = (userId: string) => {
    setShowResults(false)
    setQuery('')
    onSelectUser(userId)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
        <Input
          type="text"
          placeholder="Buscar usuário por nome ou email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>

      {showResults && users.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user.id)}
              className="w-full p-4 hover:bg-slate-50 flex items-center gap-3 border-b last:border-0 text-left transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">
                  {user.name || 'Sem nome'}
                </div>
                <div className="text-sm text-slate-600">{user.email}</div>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(user.createdAt).toLocaleDateString('pt-BR')}
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && users.length === 0 && !loading && (
        <div className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg p-4 text-center text-slate-600">
          Nenhum usuário encontrado
        </div>
      )}

      {loading && (
        <div className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg p-4 text-center text-slate-600">
          Buscando...
        </div>
      )}
    </div>
  )
}
