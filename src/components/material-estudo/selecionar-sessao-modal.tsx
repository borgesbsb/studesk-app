'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, Clock, Trophy, Users, Calendar, Target } from 'lucide-react'
import { toast } from 'sonner'
import { QuestoesComPontuacaoModal } from './questoes-com-pontuacao-modal'

interface SessaoResumo {
  id: string
  titulo: string
  descricao?: string
  totalQuestoes: number
  createdAt: Date
  ultimaRealizacao?: Date
  totalRealizacoes: number
}

interface SelecionarSessaoModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  materialId?: string
  disciplinaId?: string
}

export function SelecionarSessaoModal({
  isOpen,
  onOpenChange,
  materialId,
  disciplinaId
}: SelecionarSessaoModalProps) {
  const [sessoes, setSessoes] = useState<SessaoResumo[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSessao, setSelectedSessao] = useState<string | null>(null)
  const [isQuestoesModalOpen, setIsQuestoesModalOpen] = useState(false)

  const carregarSessoes = async () => {
    if (!isOpen) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (materialId) params.append('materialId', materialId)
      if (disciplinaId) params.append('disciplinaId', disciplinaId)

      const response = await fetch(`/api/sessoes-questoes/resumo?${params}`)
      const result = await response.json()

      if (result.success) {
        setSessoes(result.data.map((sessao: any) => ({
          ...sessao,
          createdAt: new Date(sessao.createdAt),
          ultimaRealizacao: sessao.ultimaRealizacao ? new Date(sessao.ultimaRealizacao) : undefined
        })))
      } else {
        toast.error('Erro ao carregar sessões de questões')
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
      toast.error('Erro ao carregar sessões de questões')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarSessoes()
  }, [isOpen, materialId, disciplinaId])

  const handleSelecionarSessao = (sessaoId: string) => {
    setSelectedSessao(sessaoId)
    setIsQuestoesModalOpen(true)
    onOpenChange(false) // Fechar modal de seleção
  }

  const formatarData = (data: Date) => {
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatarDataCompleta = (data: Date) => {
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Treinar com Questões Existentes
            </DialogTitle>
            <DialogDescription>
              Selecione uma sessão de questões existente para treinar. Você pode revisar questões que já foram geradas anteriormente.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            {loading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                      <Skeleton className="h-8 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sessoes.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma sessão encontrada</h3>
                <p className="text-muted-foreground">
                  Ainda não há questões geradas para este material. 
                  <br />
                  Gere algumas questões primeiro para poder treinar.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {sessoes.map((sessao) => (
                  <Card key={sessao.id} className="hover:bg-muted/50 transition-colors">
                    <CardHeader>
                      <CardTitle className="text-base">{sessao.titulo}</CardTitle>
                      {sessao.descricao && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {sessao.descricao}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {sessao.totalQuestoes} questões
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Criada em {formatarData(sessao.createdAt)}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {sessao.totalRealizacoes} tentativas
                        </Badge>
                        {sessao.ultimaRealizacao && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Última: {formatarDataCompleta(sessao.ultimaRealizacao)}
                          </Badge>
                        )}
                      </div>

                      <Button 
                        onClick={() => handleSelecionarSessao(sessao.id)}
                        className="w-full"
                      >
                        <Trophy className="h-4 w-4 mr-2" />
                        Iniciar Treinamento
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de questões com pontuação */}
      {selectedSessao && (
        <QuestoesComPontuacaoModal
          open={isQuestoesModalOpen}
          onOpenChange={setIsQuestoesModalOpen}
          questoes={[]} // As questões serão carregadas dentro do modal via sessaoId
          sessaoId={selectedSessao}
          materialId={materialId}
        />
      )}
    </>
  )
} 