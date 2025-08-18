'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Settings, FileText, Lightbulb } from "lucide-react"

interface QuestoesConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (config: QuestoesConfig) => void
  materialNome?: string
}

export interface QuestoesConfig {
  quantidade: number
  promptPersonalizado?: string
  tituloSessao?: string
  descricaoSessao?: string
}

export function QuestoesConfigModal({ 
  open, 
  onOpenChange, 
  onConfirm, 
  materialNome 
}: QuestoesConfigModalProps) {
  const [quantidade, setQuantidade] = useState([5])
  const [promptPersonalizado, setPromptPersonalizado] = useState('')
  const [tituloSessao, setTituloSessao] = useState('')
  const [descricaoSessao, setDescricaoSessao] = useState('')

  const handleConfirm = () => {
    const config: QuestoesConfig = {
      quantidade: quantidade[0],
      promptPersonalizado: promptPersonalizado.trim() || undefined,
      tituloSessao: tituloSessao.trim() || undefined,
      descricaoSessao: descricaoSessao.trim() || undefined,
    }
    onConfirm(config)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  // Sugestões de prompts
  const promptSuggestions = [
    {
      label: "Foco em Conceitos",
      prompt: "Foque em conceitos fundamentais e definições importantes. Crie questões que testem a compreensão teórica."
    },
    {
      label: "Aplicação Prática",
      prompt: "Crie questões práticas que envolvam aplicação dos conceitos em situações reais e casos concretos."
    },
    {
      label: "Análise Crítica",
      prompt: "Desenvolva questões que exijam análise crítica, comparação de conceitos e argumentação."
    },
    {
      label: "Jurisprudência",
      prompt: "Foque em aspectos jurisprudenciais, súmulas e entendimentos dos tribunais superiores."
    }
  ]

  const applySuggestion = (prompt: string) => {
    setPromptPersonalizado(prompt)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de Geração de Questões
          </DialogTitle>
          <DialogDescription>
            Personalize a geração de questões para o material: <strong>{materialNome}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quantidade de Questões */}
          <div className="space-y-3">
            <Label htmlFor="quantidade" className="text-base font-medium">
              Quantidade de Questões: {quantidade[0]}
            </Label>
            <div className="px-2">
              <Slider
                id="quantidade"
                min={1}
                max={20}
                step={1}
                value={quantidade}
                onValueChange={setQuantidade}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1</span>
                <span>10</span>
                <span>20</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Selecione entre 1 e 20 questões para gerar
            </p>
          </div>

          {/* Informações da Sessão */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Informações da Sessão
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="titulo">Título da Sessão (opcional)</Label>
              <Input
                id="titulo"
                placeholder={`Questões - ${materialNome || 'Material de Estudo'}`}
                value={tituloSessao}
                onChange={(e) => setTituloSessao(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição da Sessão (opcional)</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o foco desta sessão de questões..."
                value={descricaoSessao}
                onChange={(e) => setDescricaoSessao(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Prompt Personalizado */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Instruções para a IA
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt Personalizado (opcional)</Label>
              <Textarea
                id="prompt"
                placeholder="Ex: Foque em questões de nível intermediário sobre direitos fundamentais, incluindo jurisprudência do STF..."
                value={promptPersonalizado}
                onChange={(e) => setPromptPersonalizado(e.target.value)}
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Personalize as instruções para a IA gerar questões mais específicas ao seu objetivo de estudo
              </p>
            </div>

            {/* Sugestões de Prompts */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Sugestões de Prompts
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {promptSuggestions.map((suggestion, index) => (
                  <Card key={index} className="cursor-pointer hover:bg-accent transition-colors" onClick={() => applySuggestion(suggestion.prompt)}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{suggestion.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground">{suggestion.prompt}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            <Brain className="w-4 h-4 mr-2" />
            Gerar Questões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 