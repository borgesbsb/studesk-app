"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface OpenAIConfig {
  id: string
  model: string
  temperature: number
  maxTokens: number
  apiKey?: string
}

export function OpenAIConfig() {
  const [config, setConfig] = useState<OpenAIConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      const response = await fetch('/api/openai/config')
      if (response.ok) {
        const configData = await response.json()
        setConfig(configData)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao carregar configurações')
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast.error('Erro ao carregar configurações. Verifique sua conexão.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveConfig() {
    if (!config) return

    try {
      const response = await fetch('/api/openai/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        toast.success('Configurações salvas com sucesso')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Falha ao salvar configurações')
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      toast.error('Erro ao salvar configurações. Verifique sua conexão.')
    }
  }

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Configurações da OpenAI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select
              value={config?.model}
              onValueChange={(value) => setConfig(prev => ({ ...prev!, model: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4-1106-preview">GPT-4.1 Turbo (Última versão) - $0.01/1K tokens</SelectItem>
                <SelectItem value="gpt-4-vision-preview">GPT-4.1 Vision - $0.01/1K tokens</SelectItem>
                <SelectItem value="gpt-4-0125-preview">GPT-4.1 Preview (Janeiro/2024) - $0.01/1K tokens</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o mini - $0.00015/1K tokens</SelectItem>
                <SelectItem value="gpt-4-turbo-preview">GPT-4 Turbo - $0.03/1K tokens</SelectItem>
                <SelectItem value="gpt-4">GPT-4 (8K contexto) - $0.03/1K tokens</SelectItem>
                <SelectItem value="gpt-4-32k">GPT-4 (32K contexto) - $0.06/1K tokens</SelectItem>
                <SelectItem value="mixtral-8x7b">GPT-4 Mini (Mixtral 8x7B) - $0.007/1K tokens</SelectItem>
                <SelectItem value="gpt-3.5-turbo-0125">GPT-3.5 Turbo (Janeiro/2024) - $0.0015/1K tokens</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo - $0.001/1K tokens</SelectItem>
                <SelectItem value="gpt-3.5-turbo-16k">GPT-3.5 Turbo (16K contexto) - $0.003/1K tokens</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Dica: GPT-4.1 tem melhor performance mas é mais caro ($0.01/1K tokens). GPT-4o mini oferece qualidade GPT-4 com custo ultrabaixo ($0.00015/1K tokens). Mixtral oferece boa performance com custo intermediário ($0.007/1K tokens). GPT-3.5 é mais econômico ($0.001/1K tokens) e rápido.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Temperatura ({config?.temperature})</Label>
            <Slider
              value={[config?.temperature || 0.7]}
              min={0}
              max={2}
              step={0.1}
              onValueChange={([value]) => setConfig(prev => ({ ...prev!, temperature: value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Máximo de Tokens ({config?.maxTokens})</Label>
            <Slider
              value={[config?.maxTokens || 2000]}
              min={100}
              max={4000}
              step={100}
              onValueChange={([value]) => setConfig(prev => ({ ...prev!, maxTokens: value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Chave da API OpenAI</Label>
            <Input
              type="password"
              value={config?.apiKey || ''}
              onChange={(e) => setConfig(prev => ({ ...prev!, apiKey: e.target.value }))}
              placeholder="sk-..."
            />
            <p className="text-sm text-muted-foreground">
              A chave será salva de forma segura no banco de dados.
            </p>
          </div>

          <Button onClick={handleSaveConfig} className="w-full">
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 