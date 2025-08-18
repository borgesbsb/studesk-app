"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, X, BookOpen, Save } from 'lucide-react'
import { toast } from 'sonner'

interface AssuntosEstudadosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materialId: string
  paginaAtual: number
  tempoLeituraSegundos: number
  onAssuntosSalvos: (assuntos: string[]) => void
}

export function AssuntosEstudadosModal({
  open,
  onOpenChange,
  materialId,
  paginaAtual,
  tempoLeituraSegundos,
  onAssuntosSalvos
}: AssuntosEstudadosModalProps) {
  const [assuntos, setAssuntos] = useState<string[]>([])
  const [novoAssunto, setNovoAssunto] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)

  const adicionarAssunto = () => {
    if (novoAssunto.trim() && !assuntos.includes(novoAssunto.trim())) {
      setAssuntos([...assuntos, novoAssunto.trim()])
      setNovoAssunto('')
    }
  }

  const removerAssunto = (index: number) => {
    setAssuntos(assuntos.filter((_, i) => i !== index))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      adicionarAssunto()
    }
  }

  const salvarAssuntos = async () => {
    if (assuntos.length === 0) {
      toast.error('Adicione pelo menos um assunto estudado')
      return
    }

    setSalvando(true)
    try {
      // Combinar assuntos e observações
      const assuntosCompletos = [
        ...assuntos,
        ...(observacoes.trim() ? [`Observações: ${observacoes.trim()}`] : [])
      ]

      const response = await fetch(`/api/material/${materialId}/historico-leitura`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paginaAtual,
          tempoLeituraSegundos,
          assuntosEstudados: assuntosCompletos.join(' | ')
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar assuntos')
      }

      toast.success('Assuntos estudados salvos com sucesso!')
      onAssuntosSalvos(assuntosCompletos)
      
      // Resetar estado
      setAssuntos([])
      setObservacoes('')
      setNovoAssunto('')
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao salvar assuntos:', error)
      toast.error('Erro ao salvar assuntos estudados')
    } finally {
      setSalvando(false)
    }
  }

  const tempoFormatado = `${Math.floor(tempoLeituraSegundos / 60)}min ${tempoLeituraSegundos % 60}s`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Assuntos Estudados
          </DialogTitle>
          <DialogDescription>
            Registre os assuntos que você estudou na página {paginaAtual} 
            <span className="text-green-600 font-medium ml-2">
              • Tempo: {tempoFormatado}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Adicionar novo assunto */}
          <div className="space-y-2">
            <Label htmlFor="novo-assunto">Adicionar Assunto</Label>
            <div className="flex gap-2">
              <Input
                id="novo-assunto"
                placeholder="Ex: Introdução ao React, Hooks, Estado..."
                value={novoAssunto}
                onChange={(e) => setNovoAssunto(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                onClick={adicionarAssunto}
                disabled={!novoAssunto.trim()}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Lista de assuntos */}
          {assuntos.length > 0 && (
            <div className="space-y-2">
              <Label>Assuntos Adicionados ({assuntos.length})</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg min-h-[60px]">
                {assuntos.map((assunto, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <span className="text-sm">{assunto}</span>
                    <button
                      onClick={() => removerAssunto(index)}
                      className="ml-1 hover:bg-red-100 rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (Opcional)</Label>
            <Textarea
              id="observacoes"
              placeholder="Adicione observações sobre a sessão de estudo, dificuldades, insights, etc..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Resumo da sessão */}
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Resumo da Sessão
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 dark:text-blue-300">Página:</span>
                <span className="font-medium ml-2">{paginaAtual}</span>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">Tempo:</span>
                <span className="font-medium ml-2">{tempoFormatado}</span>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">Assuntos:</span>
                <span className="font-medium ml-2">{assuntos.length}</span>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">Data:</span>
                <span className="font-medium ml-2">
                  {new Date().toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button
            onClick={salvarAssuntos}
            disabled={assuntos.length === 0 || salvando}
            className="min-w-[120px]"
          >
            {salvando ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Salvar Assuntos
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 