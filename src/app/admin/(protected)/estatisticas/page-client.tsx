'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserSearch } from '@/components/admin/user-search'
import { UserPerformanceView } from '@/components/admin/user-performance-view'
import { getUserPerformance } from '@/interface/actions/admin/user-performance'
import { Card, CardContent } from '@/components/ui/card'
import { Users } from 'lucide-react'

interface PageClientProps {
  readingStats: any
  questionsStats: any
  readingContent: React.ReactNode
  questionsContent: React.ReactNode
}

export function PageClient({
  readingStats,
  questionsStats,
  readingContent,
  questionsContent
}: PageClientProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleSelectUser = async (userId: string) => {
    setLoading(true)
    setSelectedUserId(userId)

    const result = await getUserPerformance(userId)
    if (result.success && result.data) {
      setUserData(result.data)
    }
    setLoading(false)
  }

  return (
    <Tabs defaultValue="leitura" className="space-y-6">
      <TabsList>
        <TabsTrigger value="leitura">Leitura</TabsTrigger>
        <TabsTrigger value="questoes">Questões</TabsTrigger>
        <TabsTrigger value="usuario">Por Usuário</TabsTrigger>
      </TabsList>

      <TabsContent value="leitura" className="space-y-6">
        {readingContent}
      </TabsContent>

      <TabsContent value="questoes" className="space-y-6">
        {questionsContent}
      </TabsContent>

      <TabsContent value="usuario" className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <UserSearch onSelectUser={handleSelectUser} />
          </CardContent>
        </Card>

        {loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-slate-600">Carregando dados do usuário...</div>
            </CardContent>
          </Card>
        )}

        {!loading && !userData && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <div className="text-slate-600">
                Busque e selecione um usuário para ver suas estatísticas detalhadas
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && userData && (
          <UserPerformanceView data={userData} />
        )}
      </TabsContent>
    </Tabs>
  )
}
